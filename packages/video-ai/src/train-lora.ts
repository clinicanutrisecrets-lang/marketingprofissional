/**
 * Fase 1: treina o LoRA na fal.ai a partir do pacote mais recente do dataset.
 *
 *   pnpm train -- --dataset receitas --steps 2000
 *   pnpm train -- --dataset receitas --variacoes 1500,2000,3000
 *   pnpm train -- --dataset receitas --modo i2v --steps 2000
 *   pnpm train -- --retomar <request_id>[,<request_id>] --dataset receitas
 *
 * Cada variação entra na fila da fal (queue.submit) e o script fica sondando
 * até terminar, mostrando os logs do trainer. Ao fim, grava a URL do
 * `lora_file` em loras.json (versionado) e em aline.video_loras (se o
 * Supabase estiver configurado), com custo estimado = passos × preço/passo.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fal } from "@fal-ai/client";
import { lerArgs, ligado, numero, texto } from "./lib/args.ts";
import { ARQUIVO_LORAS, cfg, exigirFal, temSupabase } from "./lib/config.ts";
import { log } from "./lib/log.ts";
import { lerManifesto } from "./lib/manifesto.ts";
import {
  ENDPOINT_TRAINER,
  LR_PADRAO,
  PASSOS_PADRAO,
  custoTreinoUsd,
  formatarUsd,
  nomeDoLora,
  pacoteMaisRecente,
  parsePassos,
  problemasDoPacote,
  totalEstimado,
  type ModoTreino,
  type RegistroLora,
} from "./lib/regras.ts";
import { espelharNoBanco, gravarRegistro } from "./lib/registro.ts";
import { subirParaSupabase, urlAssinada } from "./lib/storage.ts";

type SaidaTrainer = { lora_file: { url: string; file_name?: string }; config_file?: { url: string } };
type Tarefa = { passos: number; requestId: string; logsVistos: number; concluido: boolean; resultado?: SaidaTrainer };

const INTERVALO_SONDAGEM_MS = 15_000;

function dormir(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function baixarLoraParaStorage(url: string, nome: string): Promise<{ path: string; url: string } | null> {
  if (!temSupabase()) return null;
  const tmp = path.join(path.dirname(ARQUIVO_LORAS), "outputs", `${nome}.safetensors`);
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, Buffer.from(await resp.arrayBuffer()));
    const r = await subirParaSupabase(tmp, `loras/${nome}.safetensors`, "application/octet-stream");
    fs.rmSync(tmp, { force: true });
    return r;
  } catch (e) {
    log.aviso(`Não consegui copiar o LoRA pro Supabase Storage (${(e as Error).message}). A URL da fal fica como principal.`);
    return null;
  }
}

async function main() {
  const args = lerArgs(process.argv.slice(2), new Set(["sem-copia"]));
  const dataset = texto(args, "dataset");
  if (!dataset) {
    log.erro("Uso: pnpm train -- --dataset receitas [--steps 2000 | --variacoes 1500,2000,3000] [--lr 0.0002] [--modo t2v|i2v] [--nome apelido] [--sem-copia] [--retomar id1,id2]");
    process.exit(2);
  }
  const modoTexto = texto(args, "modo", "t2v");
  if (modoTexto !== "t2v" && modoTexto !== "i2v") {
    log.erro(`Modo inválido: ${modoTexto}. Use t2v (texto → vídeo) ou i2v (imagem → vídeo).`);
    process.exit(2);
  }
  const modo: ModoTreino = modoTexto;
  const lr = numero(args, "lr", LR_PADRAO);
  const passosLista = parsePassos(texto(args, "variacoes") ?? texto(args, "steps"), PASSOS_PADRAO);
  const semCopia = ligado(args, "sem-copia");
  const apelido = texto(args, "nome");
  const retomar = texto(args, "retomar")?.split(/[,\s]+/).filter(Boolean) ?? [];

  const manifesto = lerManifesto(dataset, "9:16", cfg.trigger);
  const pacote = pacoteMaisRecente(manifesto);
  const { erros, avisos } = problemasDoPacote(pacote, modo);
  avisos.forEach((a) => log.aviso(a));
  if (erros.length) {
    erros.forEach((e) => log.erro(e));
    process.exit(1);
  }
  const trigger = pacote!.trigger || manifesto.trigger || cfg.trigger;

  // URL assinada do Supabase vence em 7 dias: gera uma nova na hora do treino.
  let pacoteUrl = pacote!.url;
  if (pacote!.provedor === "supabase" && pacote!.path) {
    if (!temSupabase()) {
      log.erro("O pacote está no Supabase Storage, mas as variáveis do Supabase não estão configuradas nesta máquina.");
      process.exit(1);
    }
    pacoteUrl = await urlAssinada(pacote!.path);
  }

  fal.config({ credentials: exigirFal() });
  const endpoint = ENDPOINT_TRAINER[modo];

  log.passo(`Treino ${modo} no dataset "${dataset}" (${pacote!.arquivos} arquivos: ${pacote!.imagens} fotos, ${pacote!.videos} vídeos)`);
  log.info(`Gatilho: "${trigger}" · learning rate ${lr} · endpoint ${endpoint}`);
  log.info(`Variações: ${passosLista.join(", ")} passos · estimativa ${formatarUsd(totalEstimado(passosLista, cfg.precoPassoUsd))} (${cfg.precoPassoUsd} US$/passo)`);

  const tarefas: Tarefa[] = [];
  if (retomar.length) {
    // --retomar: não submete nada, só busca o resultado de pedidos já feitos.
    retomar.forEach((id, i) => tarefas.push({ passos: passosLista[i] ?? passosLista[0], requestId: id, logsVistos: 0, concluido: false }));
    log.info(`Retomando ${retomar.length} pedido(s) já enviados.`);
  } else {
    for (const passos of passosLista) {
      const { request_id } = await fal.queue.submit(endpoint, {
        input: { training_data_url: pacoteUrl, number_of_steps: passos, learning_rate: lr, trigger_phrase: trigger },
      });
      tarefas.push({ passos, requestId: request_id, logsVistos: 0, concluido: false });
      log.ok(`${passos} passos na fila: request_id ${request_id}`);
    }
    log.info("\nSe fechar o terminal, retome com: pnpm train -- --dataset " + dataset + " --retomar " + tarefas.map((t) => t.requestId).join(","));
  }

  log.passo("Aguardando a fal (treino leva alguns minutos; sondando a cada 15 s)");
  while (tarefas.some((t) => !t.concluido)) {
    for (const t of tarefas) {
      if (t.concluido) continue;
      let status;
      try {
        status = await fal.queue.status(endpoint, { requestId: t.requestId, logs: true });
      } catch (e) {
        log.aviso(`[${t.passos}p] sondagem falhou (${(e as Error).message}); tento de novo.`);
        continue;
      }
      if (status.status === "IN_QUEUE") {
        log.info(`[${t.passos}p] na fila, posição ${status.queue_position}`);
      } else {
        const logs = status.logs ?? [];
        for (const l of logs.slice(t.logsVistos)) log.info(`[${t.passos}p] ${l.message}`);
        t.logsVistos = logs.length;
      }
      if (status.status === "COMPLETED") {
        const r = await fal.queue.result(endpoint, { requestId: t.requestId });
        t.resultado = r.data as SaidaTrainer;
        t.concluido = true;
        log.ok(`[${t.passos}p] concluído.`);
      }
    }
    if (tarefas.some((t) => !t.concluido)) await dormir(INTERVALO_SONDAGEM_MS);
  }

  log.passo("Registrando");
  const agora = new Date();
  for (const t of tarefas) {
    const nome = apelido && tarefas.length === 1 ? apelido : nomeDoLora(dataset, modo, t.passos, agora);
    const copia = semCopia ? null : await baixarLoraParaStorage(t.resultado!.lora_file.url, nome);
    const item: RegistroLora = {
      id: crypto.randomUUID(),
      nome,
      dataset,
      modo,
      passos: t.passos,
      learning_rate: lr,
      trigger,
      lora_url: t.resultado!.lora_file.url,
      lora_storage_path: copia?.path,
      lora_url_storage: copia?.url,
      config_url: t.resultado!.config_file?.url,
      request_id: t.requestId,
      custo_estimado_usd: custoTreinoUsd(t.passos, cfg.precoPassoUsd),
      pacote_url: pacote!.provedor === "supabase" ? `${pacote!.bucket}/${pacote!.path}` : pacote!.url,
      criado_em: agora.toISOString(),
    };
    gravarRegistro(item);
    await espelharNoBanco(item);
    log.ok(`${nome}: ${item.lora_url}`);
    if (copia) log.info(`   cópia: ${cfg.bucket}/${copia.path}`);
  }
  log.info(`\nCusto estimado total: ${formatarUsd(totalEstimado(passosLista, cfg.precoPassoUsd))}. Registro em loras.json.`);
  log.info("Próximo: gerar o grid de teste com os 4 prompts fixos (Fase 2) e comparar as variações.");
}

main().catch((e) => {
  log.erro((e as Error).message);
  process.exit(1);
});
