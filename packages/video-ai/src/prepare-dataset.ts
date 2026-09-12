/**
 * Fase 0: prepara um dataset pro trainer da Wan 2.2 (fal.ai).
 *
 *   pnpm prepare-dataset -- --dataset receitas [--formato 9:16|16:9]
 *                           [--trecho meio|inicio] [--sem-legenda] [--sem-upload]
 *                           [--forcar]
 *
 * Lê datasets/<nome>/ (fotos e vídeos crus), grava datasets/<nome>/preparado/
 * (480x832 ou 832x480, 16 fps, 81 quadros) com um .txt por arquivo, começando
 * pela frase-gatilho, zipa e sobe pro Supabase Storage (bucket privado
 * `video-ai`). O manifesto datasets/<nome>/dataset.json guarda hash, legenda
 * e o pacote enviado: rodar de novo só refaz o que mudou.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { lerArgs, ligado, texto } from "./lib/args.ts";
import { cfg, temSupabase } from "./lib/config.ts";
import { extrairQuadros, normalizarImagem, normalizarVideo, sondarVideo } from "./lib/ffmpeg.ts";
import { legendarComClaude } from "./lib/legendar.ts";
import { log } from "./lib/log.ts";
import { lerManifesto, pastaDoDataset, salvarManifesto } from "./lib/manifesto.ts";
import {
  DURACAO_CLIPE_SEG,
  MINIMO_ARQUIVOS_RECOMENDADO,
  inicioDoTrecho,
  legendaDoNome,
  lerCuradoria,
  montarLegenda,
  nomePreparado,
  tipoDoArquivo,
  type EntradaManifesto,
  type Formato,
  type Trecho,
} from "./lib/regras.ts";
import { subirParaFal, subirParaSupabase } from "./lib/storage.ts";
import { zipar } from "./lib/zip.ts";

function hashDoArquivo(arquivo: string): string {
  const h = crypto.createHash("sha1");
  h.update(fs.readFileSync(arquivo));
  return h.digest("hex").slice(0, 16);
}

async function main() {
  const args = lerArgs(process.argv.slice(2), new Set(["forcar", "sem-legenda", "sem-upload"]));
  const dataset = texto(args, "dataset");
  if (!dataset) {
    log.erro("Uso: pnpm prepare-dataset -- --dataset receitas [--formato 9:16|16:9] [--trecho meio|inicio] [--sem-legenda] [--sem-upload] [--forcar]");
    process.exit(2);
  }
  const formatoTexto = texto(args, "formato", "9:16");
  if (formatoTexto !== "9:16" && formatoTexto !== "16:9") {
    log.erro(`Formato inválido: ${formatoTexto}. Use 9:16 (reels) ou 16:9.`);
    process.exit(2);
  }
  const formato: Formato = formatoTexto;
  const trechoTexto = texto(args, "trecho", "meio");
  const trecho: Trecho = trechoTexto === "inicio" || trechoTexto === "fim" ? trechoTexto : "meio";
  const forcar = ligado(args, "forcar");
  const semLegenda = ligado(args, "sem-legenda");
  const semUpload = ligado(args, "sem-upload");

  const pasta = pastaDoDataset(dataset);
  if (!fs.existsSync(pasta)) {
    log.erro(`A pasta ${pasta} não existe. Crie e coloque as fotos/vídeos dentro.`);
    process.exit(2);
  }
  const pastaPreparado = path.join(pasta, "preparado");
  const pastaQuadros = path.join(pasta, "frames");
  const pastaZips = path.join(pasta, "zips");
  for (const p of [pastaPreparado, pastaQuadros, pastaZips]) fs.mkdirSync(p, { recursive: true });

  // Legendas escritas à mão (e início do clipe por vídeo) têm precedência sobre o modelo.
  const arquivoCuradoria = path.join(pasta, "curadoria.json");
  const curadoria = lerCuradoria(fs.existsSync(arquivoCuradoria) ? fs.readFileSync(arquivoCuradoria, "utf8") : null);
  if (Object.keys(curadoria).length) log.info(`curadoria.json: ${Object.keys(curadoria).length} arquivo(s) com legenda ou trecho definidos à mão.`);

  const manifesto = lerManifesto(dataset, formato, cfg.trigger);
  if (manifesto.formato !== formato && manifesto.entradas.length && !forcar) {
    log.erro(`Este dataset foi preparado em ${manifesto.formato}; você pediu ${formato}. Use --forcar para refazer tudo no formato novo.`);
    process.exit(2);
  }
  if (manifesto.trigger !== cfg.trigger && manifesto.entradas.length) {
    log.aviso(`A frase-gatilho mudou (${manifesto.trigger} → ${cfg.trigger}). As legendas antigas serão reescritas com a nova.`);
  }
  manifesto.formato = formato;
  manifesto.trigger = cfg.trigger;

  const crus = fs
    .readdirSync(pasta, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((n) => !n.startsWith("."))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  log.passo(`Dataset "${dataset}" em ${formato}, gatilho "${cfg.trigger}"`);
  const usarClaude = !semLegenda && Boolean(cfg.anthropicKey);
  if (!semLegenda && !cfg.anthropicKey) {
    log.aviso("ANTHROPIC_API_KEY ausente: as legendas vão sair do NOME do arquivo. Nomeie bem (ex.: brownie-cacau-close-corte.mp4) ou configure a chave.");
  }

  const porHash = new Map(manifesto.entradas.map((e) => [e.hash, e]));
  const entradas: EntradaManifesto[] = [];
  const recusados: string[] = [];
  let indice = 0;
  let tokensEntrada = 0;
  let tokensSaida = 0;
  let refeitos = 0;

  for (const nome of crus) {
    const tipo = tipoDoArquivo(nome);
    if (tipo === null) continue; // dataset.json, README, etc.
    if (tipo === "recusado") {
      recusados.push(nome);
      continue;
    }
    indice++;
    const origem = path.join(pasta, nome);
    const hash = hashDoArquivo(origem);
    const saidaNome = nomePreparado(indice, nome, tipo);
    const saida = path.join(pastaPreparado, saidaNome);
    const saidaTxt = saida.replace(/\.[^.]+$/, ".txt");
    const anterior = porHash.get(hash);
    const curado = curadoria[nome];

    // Reaproveita se a mídia preparada existe, a legenda existe e o gatilho não mudou.
    const legendaCurada = curado?.legenda ? montarLegenda(curado.legenda, cfg.trigger) : null;
    const legendaAnteriorVale = anterior && (
      legendaCurada ? anterior.legenda === legendaCurada : (anterior.legenda.startsWith(cfg.trigger + ".") || anterior.legenda === cfg.trigger)
    );
    const inicioAnteriorVale = !anterior || tipo !== "video" || curado?.inicio_seg === undefined || anterior.inicio_seg === curado.inicio_seg;
    if (!forcar && anterior && legendaAnteriorVale && inicioAnteriorVale && fs.existsSync(path.join(pastaPreparado, anterior.saida))) {
      if (anterior.saida !== saidaNome) {
        fs.renameSync(path.join(pastaPreparado, anterior.saida), saida);
        const txtAntigo = path.join(pastaPreparado, anterior.saida.replace(/\.[^.]+$/, ".txt"));
        if (fs.existsSync(txtAntigo)) fs.renameSync(txtAntigo, saidaTxt);
      }
      fs.writeFileSync(saidaTxt, anterior.legenda + "\n");
      entradas.push({ ...anterior, saida: saidaNome, origem: nome });
      log.info(`  = ${nome} (já preparado)`);
      continue;
    }

    refeitos++;
    let duracao: number | undefined;
    let inicioUsado: number | undefined;
    try {
      if (tipo === "video") {
        const info = await sondarVideo(origem);
        duracao = info.duracaoSeg;
        const inicio = inicioDoTrecho(info.duracaoSeg, trecho, curado?.inicio_seg);
        inicioUsado = inicio;
        await normalizarVideo(origem, saida, formato, inicio);
        if (info.duracaoSeg < DURACAO_CLIPE_SEG - 0.5) {
          log.aviso(`  ${nome} tem ${info.duracaoSeg.toFixed(1)}s (menos que ${DURACAO_CLIPE_SEG.toFixed(1)}s); o clipe sai mais curto.`);
        }
      } else {
        await normalizarImagem(origem, saida, formato);
      }
    } catch (e) {
      log.erro(`  ${nome}: não consegui converter (${(e as Error).message.split("\n")[0]}). Pulei.`);
      indice--;
      continue;
    }

    let legenda: string;
    let fonte: EntradaManifesto["legenda_fonte"];
    if (legendaCurada) {
      legenda = legendaCurada;
      fonte = "manual";
    } else if (usarClaude) {
      try {
        const quadros = tipo === "video"
          ? await extrairQuadros(saida, pastaQuadros, saidaNome.replace(/\.[^.]+$/, ""))
          : [saida];
        const r = await legendarComClaude(quadros, tipo, cfg.trigger);
        legenda = r.legenda;
        fonte = "claude";
        tokensEntrada += r.tokensEntrada;
        tokensSaida += r.tokensSaida;
      } catch (e) {
        log.aviso(`  ${nome}: legenda pelo modelo falhou (${(e as Error).message.split("\n")[0]}); usei o nome do arquivo.`);
        legenda = montarLegenda(legendaDoNome(nome, tipo), cfg.trigger);
        fonte = "nome-do-arquivo";
      }
    } else {
      legenda = montarLegenda(legendaDoNome(nome, tipo), cfg.trigger);
      fonte = "nome-do-arquivo";
    }
    fs.writeFileSync(saidaTxt, legenda + "\n");
    entradas.push({ origem: nome, hash, tipo, saida: saidaNome, legenda, legenda_fonte: fonte, duracao_seg: duracao, inicio_seg: inicioUsado, origem_bytes: fs.statSync(origem).size });
    log.ok(`  ${nome} → ${saidaNome}`);
    log.info(`    "${legenda}"`);
  }

  // Limpa o que sobrou de rodadas anteriores (arquivo cru apagado da pasta).
  const esperados = new Set(entradas.flatMap((e) => [e.saida, e.saida.replace(/\.[^.]+$/, ".txt")]));
  for (const f of fs.readdirSync(pastaPreparado)) {
    if (!esperados.has(f)) fs.rmSync(path.join(pastaPreparado, f));
  }

  manifesto.entradas = entradas;
  salvarManifesto(manifesto);

  const imagens = entradas.filter((e) => e.tipo === "imagem").length;
  const videos = entradas.filter((e) => e.tipo === "video").length;
  log.passo(`Preparado: ${entradas.length} arquivos (${imagens} fotos, ${videos} vídeos), ${refeitos} processados agora.`);
  if (recusados.length) {
    log.aviso(`Ignorei ${recusados.length} arquivo(s) HEIC/HEIF (${recusados.slice(0, 3).join(", ")}${recusados.length > 3 ? "…" : ""}). No iPhone: Ajustes → Câmera → Formatos → Mais compatível, ou exporte como JPG.`);
  }
  if (entradas.length < MINIMO_ARQUIVOS_RECOMENDADO) {
    log.aviso(`Só ${entradas.length} arquivos. A fal recomenda pelo menos ${MINIMO_ARQUIVOS_RECOMENDADO}; o briefing pede 20 a 40.`);
  }
  const manuais = entradas.filter((e) => e.legenda_fonte === "manual").length;
  if (manuais) log.info(`Legendas escritas à mão (curadoria.json): ${manuais}.`);
  if (usarClaude) {
    log.info(`Legendas: ${tokensEntrada} tokens de entrada, ${tokensSaida} de saída no ${cfg.legendaModel}.`);
  }
  if (!entradas.length) {
    log.erro("Nada pra empacotar.");
    process.exit(1);
  }

  log.passo(semUpload ? "Empacotando (sem upload)" : "Empacotando e enviando");
  const carimbo = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
  const zipLocal = path.join(pastaZips, `${dataset}-${carimbo}.zip`);
  const bytes = await zipar(pastaPreparado, zipLocal);
  log.ok(`${path.basename(zipLocal)} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
  if (semUpload) {
    log.info("--sem-upload: o zip ficou só nesta máquina e NÃO entrou no manifesto (o treino exige pacote enviado).");
    return;
  }

  const base = { criado_em: new Date().toISOString(), arquivos: entradas.length, imagens, videos, formato, trigger: cfg.trigger, bytes };
  if (temSupabase()) {
    const remoto = `datasets/${dataset}/${path.basename(zipLocal)}`;
    const { path: p, url } = await subirParaSupabase(zipLocal, remoto, "application/zip");
    manifesto.pacotes.push({ provedor: "supabase", bucket: cfg.bucket, path: p, url, ...base });
    log.ok(`Enviado para o Supabase Storage: ${cfg.bucket}/${p}`);
  } else {
    log.aviso("Supabase não configurado: subindo o pacote pro storage da fal (a URL fica no manifesto).");
    const url = await subirParaFal(zipLocal, "application/zip");
    manifesto.pacotes.push({ provedor: "fal", url, ...base });
    log.ok(`Enviado para a fal: ${url}`);
  }
  salvarManifesto(manifesto);
  log.info(`\nPróximo passo: pnpm train -- --dataset ${dataset} --steps 2000`);
}

main().catch((e) => {
  log.erro((e as Error).message);
  process.exit(1);
});
