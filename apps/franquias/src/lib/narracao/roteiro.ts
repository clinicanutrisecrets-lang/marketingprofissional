/**
 * Roteiro da narração em karaokê (Aline, 13/10/2026).
 *
 * O vídeo animado é feito de cenas com duração fixa; aqui cada cena vira um
 * trecho {de, ate, texto} que a tela acende na hora certa. O texto sai do
 * próprio SPEC que desenhou o vídeo, então a fala bate com o que aparece.
 * Função pura: a tela e o teste usam a mesma.
 */

export type Trecho = { de: number; ate: number; texto: string };

/** Ritmo confortável de leitura em voz alta (palavras por segundo). */
export const RITMO_CONFORTAVEL = 2.6;

const TIPOS_DO_MOTOR = new Set([
  "hook", "sintoma", "gene", "sinergia", "nota", "marcadores", "virada", "cta", "cta_anuncio",
]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function frase(...partes: string[]): string {
  return partes
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (/[.!?…:]$/.test(p) ? p : `${p}.`))
    .join(" ");
}

/** O que dizer em cada tipo de cena, a partir do que está escrito nela. */
function textoDaCena(c: Record<string, unknown>): string {
  switch (c.tipo) {
    case "hook":
      return frase(str(c.l1), str(c.l2));
    case "sintoma":
      return frase(str(c.titulo), str(c.texto));
    case "gene":
      return frase(str(c.gene) ? `O gene ${str(c.gene)}` : "", str(c.texto));
    case "sinergia": {
      const itens = Array.isArray(c.itens) ? (c.itens as Record<string, unknown>[]) : [];
      const nomes = itens.map((it) => str(it.nome)).filter(Boolean);
      return frase(str(c.titulo), nomes.length ? nomes.join(", ") : "");
    }
    case "nota":
      return frase(str(c.texto));
    case "marcadores": {
      const itens = Array.isArray(c.itens) ? (c.itens as Record<string, unknown>[]) : [];
      return frase(str(c.titulo), ...itens.map((it) => frase(str(it.nome), str(it.ludico))));
    }
    case "virada":
      return frase(str(c.l1), str(c.l2), str(c.texto));
    case "cta":
    case "cta_anuncio":
      return frase(str(c.l1), str(c.l2));
    default:
      return "";
  }
}

/**
 * Trechos do vídeo animado, com os MESMOS cortes do motor: cena de tipo
 * desconhecido sai, duração limitada a 20 s e o total a 60 s (as do fim
 * saem inteiras). Se o motor mudar essas regras, o karaokê desalinha: os
 * números vivem também em packages/reel-engine/engine/build.py.
 */
export function trechosDoReel(spec: unknown): Trecho[] {
  const cenas =
    spec && typeof spec === "object" && Array.isArray((spec as { cenas?: unknown }).cenas)
      ? ((spec as { cenas: unknown[] }).cenas as Record<string, unknown>[])
      : [];
  const trechos: Trecho[] = [];
  let t = 0;
  for (const c of cenas) {
    if (!c || !TIPOS_DO_MOTOR.has(String(c.tipo))) continue;
    const bruto = Number(c.dur);
    const dur = Math.max(1, Math.min(Number.isFinite(bruto) ? bruto : 5, 20));
    if (t + dur > 60 + 1e-6) break;
    trechos.push({ de: arred(t), ate: arred(t + dur), texto: textoDaCena(c) });
    t += dur;
  }
  return trechos;
}

function arred(n: number): number {
  return Math.round(n * 100) / 100;
}

/** O trecho que está na tela no segundo `t` (ou -1 antes do primeiro / depois do último). */
export function indiceNoTempo(trechos: Trecho[], t: number): number {
  for (let i = 0; i < trechos.length; i++) {
    if (t >= trechos[i]!.de && t < trechos[i]!.ate) return i;
  }
  return -1;
}

export function contarPalavras(texto: string): number {
  return texto.split(/\s+/).filter(Boolean).length;
}

/** O trecho pede mais pressa do que dá pra ler com calma? */
export function trechoApertado(tr: Trecho): boolean {
  const seg = tr.ate - tr.de;
  return seg > 0 && contarPalavras(tr.texto) / seg > RITMO_CONFORTAVEL;
}

/** Quantas palavras do trecho já deveriam ter sido lidas no segundo `t` (pro acender do karaokê). */
export function palavrasAcesas(tr: Trecho, t: number): number {
  const total = contarPalavras(tr.texto);
  const seg = tr.ate - tr.de;
  if (seg <= 0) return total;
  const frac = Math.min(1, Math.max(0, (t - tr.de) / seg));
  return Math.round(frac * total);
}

/**
 * Parou a gravação antes do fim do vídeo? A voz cobre só até `ate` e o resto
 * sai mudo. Folga de 1,5 s porque o "Parar" no último segundo é legítimo.
 * Sem duração conhecida (metadado ainda não carregou), não acusa.
 */
export function paradaAntesDoFim(ate: number, total: number): boolean {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(ate)) return false;
  return ate < total - 1.5;
}
