/**
 * O vídeo de marca da semana (Aline, 16/10/2026): fora das contas da fase de
 * teste (que veem todos os vídeos na aba Vídeos), cada profissional recebe UM
 * vídeo animado por semana dentro do pacote de domingo, e só quando ele cabe:
 * no tema daquela semana (o que manda) ou no nicho dela.
 *
 * Funções puras. A geração mora em lib/geracao/video-marca-da-semana.ts.
 */

import type { VideoMarca } from "../videos/marca.ts";

export const PAPEL_VIDEO_MARCA = "Vídeo animado da semana: o gene explicado na sua marca.";
export const LEMBRETE_VIDEO_MARCA =
  "O vídeo já sai com a sua logo e as suas cores. Narre por cima com o roteiro em karaokê, ou poste só com música, escolhida no próprio Instagram ao publicar, entre as que estão em alta.";

/** Minúsculo, sem acento, pontuação e sublinhado viram espaço. */
export function normalizar(t: string | null | undefined): string {
  return (t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Quantos assuntos do vídeo aparecem no texto. Assunto longo casa pelo começo
 * da palavra ("emagrec" acha "emagrecimento"); curto (até 4 letras) só como
 * palavra inteira, senão "dor" acharia "dormir" e "sono" acharia "sonora".
 */
export function assuntosNoTexto(temas: readonly string[], texto: string): number {
  const t = ` ${normalizar(texto)} `;
  if (!t.trim()) return 0;
  return temas.filter((tema) => {
    const n = normalizar(tema);
    if (!n) return false;
    return n.length <= 4 ? new RegExp(` ${n}(e?s)? `).test(t) : t.includes(` ${n}`);
  }).length;
}

export type EntradaVideoDaSemana = {
  videos: readonly Pick<VideoMarca, "id" | "temas">[];
  /** Tema da semana: tema em alta, queixas da rodada, papéis dos posts. */
  textosDaSemana: readonly (string | null | undefined)[];
  /** Nicho e público dela. */
  textosDoNicho: readonly (string | null | undefined)[];
  /** Vídeos que ela já recebeu num pacote anterior (não repete). */
  jaUsados: ReadonlySet<string>;
};

/**
 * O vídeo que mais conversa com a semana. Tema da semana vale 2, nicho vale 1.
 * Nenhum vídeo cabe, ou todos os que cabem já saíram: null (a semana fica sem
 * vídeo, nunca com um que não conversa com ela). Empate: a ordem do catálogo.
 */
export function escolherVideoDaSemana(e: EntradaVideoDaSemana): string | null {
  const semana = e.textosDaSemana.filter(Boolean).join(" \n ");
  const nicho = e.textosDoNicho.filter(Boolean).join(" \n ");
  let melhor: { id: string; pontos: number } | null = null;
  for (const v of e.videos) {
    if (e.jaUsados.has(v.id)) continue;
    const pontos = 2 * assuntosNoTexto(v.temas, semana) + assuntosNoTexto(v.temas, nicho);
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) melhor = { id: v.id, pontos };
  }
  return melhor?.id ?? null;
}

/** Dia do vídeo: o último dia de post da semana (os dois reels ficam nos primeiros). */
export function diaDoVideoMarca(dias: readonly number[]): number {
  const d = [...dias].sort((a, b) => a - b);
  return d[d.length - 1] ?? 5;
}
