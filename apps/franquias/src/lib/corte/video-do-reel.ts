/**
 * O vídeo curto que nasce junto com o reel da semana (Aline, 02/10/2026):
 * "quando gera roteiro da estratégia, gerar o vídeo animado pra pessoa não ter
 * que digitar; já apareceria na tela de aprovação junto com os outros posts".
 * Ela continua podendo gravar com o roteiro (teleprompter) ou montar outro à
 * mão em Vídeos. Funções puras: rodam no teste.
 */
import { FRASE_MAX } from "./video-curto.ts";

/**
 * A frase que vai no vídeo. Vale primeiro a `frase` escrita PARA o vídeo
 * (Aline, 14/10/2026: "não é frase de gancho pra um vídeo de 6 s, ninguém vai
 * entender o contexto"): ela se explica sozinha e nomeia o que aparece na
 * imagem. Sem ela, o gancho do reel (headline), nunca a legenda.
 */
export function fraseDoReel(post: { frase?: unknown; headline?: unknown; roteiro?: unknown }): string | null {
  const limpa = (v: unknown) =>
    typeof v === "string" ? v.split(/\s+/).filter(Boolean).join(" ").replace(/—/g, ",").trim() : "";
  const f = limpa(post.frase);
  if (f && f.length <= FRASE_MAX) return f;
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

/** Palavra casa no texto do clipe pelo radical (bactéria × bactérias, lentilha × lentilhas). */
function casaPalavra(texto: string, p: string): boolean {
  const radical = p.length > 5 ? p.slice(0, p.length - 2) : p;
  return new RegExp(`(?<![a-z0-9])${radical}`).test(texto);
}

/**
 * O clipe que mostra o que a frase diz. Régua: palavras da FRASE nas
 * tags/título/descrição; o assunto da semana só desempata. Clipe que não
 * mostra nada da frase NÃO entra (Aline, 14/10: "os vídeos de b-roll têm que
 * ser algo específico pro vídeo para fazer sentido"): sem casamento, null, e o
 * reel fica só com o roteiro pra ela gravar. Entre os que casam: o não usado
 * recentemente, o em pé (reel é 9:16), o da biblioteca dela, o menos usado.
 * Clipe com menos de 3 s fica de fora (a frase não dá pra ler).
 */
export function escolherClipe(
  clipes: ClipeCandidato[],
  palavrasDaFrase: string[],
  /**
   * Clipes que a conta já usou em vídeo recente. Perdem o empate: sem isso
   * os dois reels da mesma semana saíam com o MESMO clipe (Gleryston,
   * 04/10/2026).
   */
  jaUsados: ReadonlySet<string> = new Set(),
  palavrasDoAssuntoSemana: string[] = [],
): ClipeCandidato | null {
  const ok = clipes.filter((c) => (c.duracao_seg ?? 0) >= 3);
  if (ok.length === 0) return null;
  const textoDo = (c: ClipeCandidato) => sem([...(c.tags ?? []), c.titulo ?? "", c.descricao ?? ""].join(" "));
  const conta = (c: ClipeCandidato, ps: string[]) => {
    const t = textoDo(c);
    return ps.reduce((n, p) => n + (casaPalavra(t, p) ? 1 : 0), 0);
  };
  const emPe = (c: ClipeCandidato) => ((c.altura_px ?? 0) > (c.largura_px ?? 0) ? 1 : 0);
  const comFrase = ok.filter((c) => conta(c, palavrasDaFrase) > 0);
  if (comFrase.length === 0) return null;
  return [...comFrase].sort(
    (a, b) =>
      conta(b, palavrasDaFrase) - conta(a, palavrasDaFrase) ||
      (jaUsados.has(a.id) ? 1 : 0) - (jaUsados.has(b.id) ? 1 : 0) ||
      conta(b, palavrasDoAssuntoSemana) - conta(a, palavrasDoAssuntoSemana) ||
      emPe(b) - emPe(a) ||
      (a.origem === "biblioteca" ? 0 : 1) - (b.origem === "biblioteca" ? 0 : 1) ||
      (a.usado_quantas_vezes ?? 0) - (b.usado_quantas_vezes ?? 0) ||
      a.id.localeCompare(b.id),
  )[0]!;
}

/** Os assuntos visuais que a biblioteca tem, pra frase do vídeo nomear um deles. */
export function assuntosVisuais(clipes: Pick<ClipeCandidato, "titulo">[], max = 60): string[] {
  const vistos = new Set<string>();
  for (const c of clipes) {
    const t = (c.titulo ?? "").trim();
    if (t && !vistos.has(t.toLowerCase())) vistos.add(t);
    if (vistos.size >= max) break;
  }
  return [...vistos];
}
