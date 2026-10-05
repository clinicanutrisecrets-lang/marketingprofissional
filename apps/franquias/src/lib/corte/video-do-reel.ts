/**
 * O vídeo curto que nasce junto com o reel da semana (Aline, 02/10/2026):
 * "quando gera roteiro da estratégia, gerar o vídeo animado pra pessoa não ter
 * que digitar; já apareceria na tela de aprovação junto com os outros posts".
 * Ela continua podendo gravar com o roteiro (teleprompter) ou montar outro à
 * mão em Vídeos. Funções puras: rodam no teste.
 */
import { FRASE_MAX } from "./video-curto.ts";

/** A frase que vai no vídeo: o gancho do reel (headline), nunca a legenda. */
export function fraseDoReel(post: { headline?: unknown; roteiro?: unknown }): string | null {
  const limpa = (v: unknown) =>
    typeof v === "string" ? v.split(/\s+/).filter(Boolean).join(" ").replace(/—/g, ",").trim() : "";
  const h = limpa(post.headline);
  if (h && h.length <= FRASE_MAX) return h;
  const r = limpa(post.roteiro);
  if (!r) return null;
  const primeira = r.match(/^.+?[.!?](\s|$)/)?.[0]?.trim() ?? r;
  return primeira.length <= FRASE_MAX ? primeira : null;
}

export type ClipeCandidato = {
  id: string;
  origem: "biblioteca" | "acervo";
  titulo?: string | null;
  descricao?: string | null;
  tags?: string[] | null;
  duracao_seg?: number | null;
  largura_px?: number | null;
  altura_px?: number | null;
  usado_quantas_vezes?: number | null;
};

const sem = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const PALAVRAS_VAZIAS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "em", "com", "para", "pra", "que", "uma", "um", "cuidado"]);

export function palavrasDoAssunto(textos: string[]): string[] {
  const out = new Set<string>();
  for (const t of textos) {
    for (const p of sem(t).split(/[^a-z0-9]+/)) {
      if (p.length >= 4 && !PALAVRAS_VAZIAS.has(p)) out.add(p);
    }
  }
  return [...out];
}

/**
 * O clipe da biblioteca que mais conversa com o assunto. Régua: palavras do
 * assunto nas tags/título/descrição; empate vai pro clipe EM PÉ (reel é 9:16),
 * depois pro da biblioteca dela, depois pro menos usado (variedade).
 * Clipe com menos de 3 s fica de fora (a frase não dá pra ler).
 */
export function escolherClipe(
  clipes: ClipeCandidato[],
  palavras: string[],
  /**
   * Clipes que a conta já usou em vídeo recente. Ficam por último: sem isso
   * os dois reels da mesma semana saíam com o MESMO clipe (Gleryston,
   * 04/10/2026), porque o assunto é parecido e o contador de uso nunca sobe.
   */
  jaUsados: ReadonlySet<string> = new Set(),
): ClipeCandidato | null {
  const ok = clipes.filter((c) => (c.duracao_seg ?? 0) >= 3);
  if (ok.length === 0) return null;
  const pontos = (c: ClipeCandidato) => {
    const texto = sem([...(c.tags ?? []), c.titulo ?? "", c.descricao ?? ""].join(" "));
    return palavras.reduce((n, p) => n + (texto.includes(p) ? 1 : 0), 0);
  };
  const emPe = (c: ClipeCandidato) => ((c.altura_px ?? 0) > (c.largura_px ?? 0) ? 1 : 0);
  return [...ok].sort(
    (a, b) =>
      (jaUsados.has(a.id) ? 1 : 0) - (jaUsados.has(b.id) ? 1 : 0) ||
      pontos(b) - pontos(a) ||
      emPe(b) - emPe(a) ||
      (a.origem === "biblioteca" ? 0 : 1) - (b.origem === "biblioteca" ? 0 : 1) ||
      (a.usado_quantas_vezes ?? 0) - (b.usado_quantas_vezes ?? 0) ||
      a.id.localeCompare(b.id),
  )[0]!;
}
