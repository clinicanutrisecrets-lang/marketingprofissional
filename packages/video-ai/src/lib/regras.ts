/**
 * Regras PURAS do pipeline (sem rede, sem disco): formato, nomes, legendas,
 * custo e escolha de pacote. Tudo que dá pra errar em silêncio mora aqui,
 * pra ficar travado em tests/regras.test.ts sem precisar de ffmpeg nem chave.
 */

export type Formato = "9:16" | "16:9";
export type TipoMidia = "imagem" | "video";
export type ModoTreino = "t2v" | "i2v";

/** Resolução que o trainer da Wan 2.2 espera (480p). */
export const DIMENSOES: Record<Formato, { largura: number; altura: number }> = {
  "9:16": { largura: 480, altura: 832 },
  "16:9": { largura: 832, altura: 480 },
};

export const FPS_TREINO = 16;
/** 81 quadros a 16 fps = 5,06 s, o tamanho de clipe que a Wan 2.2 usa. */
export const FRAMES_TREINO = 81;
export const DURACAO_CLIPE_SEG = FRAMES_TREINO / FPS_TREINO;

export const TRIGGER_PADRAO = "nutrisecrets style";
export const PRECO_PASSO_PADRAO_USD = 0.004;
export const LR_PADRAO = 0.0002;
export const PASSOS_PADRAO = 2000;

export const ENDPOINT_TRAINER: Record<ModoTreino, string> = {
  t2v: "fal-ai/wan-22-trainer/t2v-a14b",
  i2v: "fal-ai/wan-22-trainer/i2v-a14b",
};

/** Mínimo que a fal recomenda; abaixo disso o LoRA sai fraco. */
export const MINIMO_ARQUIVOS_RECOMENDADO = 10;

const EXT_IMAGEM = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const EXT_VIDEO = new Set([".mp4", ".mov", ".webm", ".m4v"]);
/** O ffmpeg estático e o sharp não leem HEIC: avisar, não engolir. */
const EXT_RECUSADA = new Set([".heic", ".heif"]);

export function extensaoDe(nome: string): string {
  const i = nome.lastIndexOf(".");
  return i < 0 ? "" : nome.slice(i).toLowerCase();
}

export function tipoDoArquivo(nome: string): TipoMidia | "recusado" | null {
  const ext = extensaoDe(nome);
  if (EXT_IMAGEM.has(ext)) return "imagem";
  if (EXT_VIDEO.has(ext)) return "video";
  if (EXT_RECUSADA.has(ext)) return "recusado";
  return null;
}

/** Sem acento, minúsculo, hífen; serve de nome estável pro arquivo preparado. */
export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "arquivo";
}

/** Nome do arquivo preparado: índice fixo + slug da origem, na extensão alvo. */
export function nomePreparado(indice: number, origem: string, tipo: TipoMidia): string {
  const base = origem.replace(/\.[^.]+$/, "");
  const ext = tipo === "video" ? ".mp4" : ".jpg";
  return `${String(indice).padStart(3, "0")}-${slug(base)}${ext}`;
}

/**
 * Onde cortar um vídeo mais longo que o clipe de treino. Padrão: o miolo,
 * que é onde a ação costuma estar (o começo tem a mão entrando no quadro).
 */
export function inicioDoTrecho(duracaoSeg: number, trecho: "inicio" | "meio" = "meio"): number {
  if (!Number.isFinite(duracaoSeg) || duracaoSeg <= DURACAO_CLIPE_SEG) return 0;
  if (trecho === "inicio") return 0;
  return Math.max(0, (duracaoSeg - DURACAO_CLIPE_SEG) / 2);
}

/**
 * Travessão fora do texto (regra da Aline, 26/08/2026). Mesma régua de
 * apps/aline/src/lib/texto/sem-travessoes.ts, reduzida ao que uma legenda
 * de uma frase precisa. Hífen comum não é tocado.
 */
export function semTravessoes(texto: string): string {
  if (!/[—–]/.test(texto)) return texto;
  return texto
    .replace(/(\d)\s*[—–]\s*(\d)/g, "$1-$2")
    .replace(/^[—–]\s*/gm, "")
    .replace(/([.!?…:;])\s*[—–]\s*/g, "$1 ")
    .replace(/\s*[—–]\s*(?=[A-ZÁÉÍÓÚÂÊÔÃÕÀÇ])/g, ". ")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ", ");
}

/**
 * Legenda final do arquivo: trigger na frente, uma linha só, sem travessão,
 * sem aspas de código e sem a trigger repetida no meio (o modelo às vezes
 * devolve "nutrisecrets style. ..." mesmo sem pedir).
 */
export function montarLegenda(descricao: string, trigger: string = TRIGGER_PADRAO): string {
  const gatilho = trigger.trim();
  let corpo = semTravessoes(descricao)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
  const re = new RegExp(`^${gatilho.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[.,:;]?\\s*`, "i");
  corpo = corpo.replace(re, "");
  corpo = corpo.replace(/^[.,:;\s]+/, "");
  if (!corpo) return gatilho;
  return `${gatilho}. ${corpo}`;
}

/** Legenda de emergência (sem chave da Anthropic): o nome do arquivo vira frase. */
export function legendaDoNome(origem: string, tipo: TipoMidia): string {
  const base = origem.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  const cena = base ? base : "cena de comida";
  return tipo === "video"
    ? `${cena}, vídeo curto, luz natural lateral suave, fundo bege creme`
    : `${cena}, foto, luz natural lateral suave, fundo bege creme`;
}

export function custoTreinoUsd(passos: number, precoPasso: number = PRECO_PASSO_PADRAO_USD): number {
  if (!Number.isFinite(passos) || passos <= 0) return 0;
  return Math.round(passos * precoPasso * 100) / 100;
}

export function formatarUsd(valor: number): string {
  return `US$ ${valor.toFixed(2)}`;
}

/** "1500,2000,3000" → [1500, 2000, 3000]; ignora lixo, remove repetição. */
export function parsePassos(texto: string | undefined, padrao: number = PASSOS_PADRAO): number[] {
  if (!texto) return [padrao];
  const lista = texto
    .split(/[,\s;]+/)
    .map((p) => parseInt(p, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return lista.length ? [...new Set(lista)] : [padrao];
}

export type PacoteRemoto = {
  provedor: "supabase" | "fal";
  bucket?: string;
  path?: string;
  url: string;
  criado_em: string;
  arquivos: number;
  imagens: number;
  videos: number;
  formato: Formato;
  trigger: string;
  bytes: number;
};

export type EntradaManifesto = {
  origem: string;
  hash: string;
  tipo: TipoMidia;
  saida: string;
  legenda: string;
  legenda_fonte: "claude" | "nome-do-arquivo" | "manual";
  duracao_seg?: number;
  origem_bytes: number;
};

export type Manifesto = {
  versao: 1;
  dataset: string;
  formato: Formato;
  trigger: string;
  atualizado_em: string;
  entradas: EntradaManifesto[];
  pacotes: PacoteRemoto[];
};

export function manifestoVazio(dataset: string, formato: Formato, trigger: string): Manifesto {
  return { versao: 1, dataset, formato, trigger, atualizado_em: new Date().toISOString(), entradas: [], pacotes: [] };
}

/** O pacote mais recente é o que treina. */
export function pacoteMaisRecente(manifesto: Pick<Manifesto, "pacotes">): PacoteRemoto | null {
  if (!manifesto.pacotes.length) return null;
  return [...manifesto.pacotes].sort((a, b) => a.criado_em.localeCompare(b.criado_em)).at(-1) ?? null;
}

/**
 * O que impede o treino de começar. Devolve mensagens, nunca lança: o
 * chamador decide se avisa ou aborta.
 */
export function problemasDoPacote(pacote: PacoteRemoto | null, modo: ModoTreino): { erros: string[]; avisos: string[] } {
  const erros: string[] = [];
  const avisos: string[] = [];
  if (!pacote) {
    erros.push("Nenhum pacote enviado para este dataset. Rode `pnpm prepare-dataset -- --dataset <nome>` primeiro.");
    return { erros, avisos };
  }
  if (pacote.arquivos === 0) erros.push("O pacote está vazio.");
  if (modo === "i2v" && pacote.videos === 0) {
    erros.push("O trainer i2v exige pelo menos um vídeo no dataset (este pacote só tem imagens).");
  }
  if (pacote.arquivos > 0 && pacote.arquivos < MINIMO_ARQUIVOS_RECOMENDADO) {
    avisos.push(`Só ${pacote.arquivos} arquivos no pacote; a fal recomenda pelo menos ${MINIMO_ARQUIVOS_RECOMENDADO}. Dá pra treinar, mas o estilo sai fraco.`);
  }
  return { erros, avisos };
}

/** Linha do registro loras.json (e da tabela aline.video_loras). */
export type RegistroLora = {
  id: string;
  nome: string;
  dataset: string;
  modo: ModoTreino;
  passos: number;
  learning_rate: number;
  trigger: string;
  lora_url: string;
  lora_storage_path?: string;
  lora_url_storage?: string;
  config_url?: string;
  request_id: string;
  custo_estimado_usd: number;
  pacote_url: string;
  criado_em: string;
};

export function nomeDoLora(dataset: string, modo: ModoTreino, passos: number, quando: Date): string {
  const data = quando.toISOString().slice(0, 10);
  return `${dataset}-${modo}-${passos}p-${data}`;
}

/** Quanto foi gasto/estimado num conjunto de variações, pra imprimir no fim. */
export function totalEstimado(passosLista: number[], precoPasso: number = PRECO_PASSO_PADRAO_USD): number {
  return Math.round(passosLista.reduce((s, p) => s + custoTreinoUsd(p, precoPasso), 0) * 100) / 100;
}
