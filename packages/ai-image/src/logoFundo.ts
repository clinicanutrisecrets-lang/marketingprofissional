/**
 * Logo com fundo chapado vira logo recortada.
 *
 * Caso real (Daiane, 01/10/2026): a logo subiu em JPG, 500x500, fundo branco e
 * margem enorme. JPG não tem transparência, então todo card saía com um
 * quadrado branco no topo, sobre o fundo bege da marca ("ficou feio, ficou
 * aparecendo um quadrado branco com a minha logo"). Pedir pra profissional
 * refazer a logo não resolve: quem tem logo com fundo transparente já sobe
 * PNG, e quem não tem não sabe gerar.
 *
 * Funções puras sobre pixels RGBA (sem sharp), pra dar pra testar.
 *
 * As travas:
 *  - logo que já tem transparência nos cantos fica como está (só o recorte de
 *    margem é feito por quem chama);
 *  - só age quando os quatro cantos têm a MESMA cor (fundo chapado de fato);
 *  - fundo claro: some toda cor próxima da do fundo, inclusive o miolo das
 *    letras ("a", "e", "o"), que é ilha e o preenchimento a partir da borda
 *    não alcança;
 *  - fundo escuro ou colorido: só o que encosta na borda some (ilha da mesma
 *    cor pode ser parte da marca);
 *  - se sobrar quase nada ou quase tudo, devolve null e a logo fica original.
 */

/** Distância de cor (0 a ~441). */
function dist(d: Uint8ClampedArray | Uint8Array, i: number, r: number, g: number, b: number): number {
  const dr = d[i]! - r;
  const dg = d[i + 1]! - g;
  const db = d[i + 2]! - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Abaixo disto é fundo; acima de TOL_FIM é desenho; no meio, borda suave. */
const TOL_INICIO = 28;
const TOL_FIM = 70;

export type ResultadoFundo = {
  pixels: Uint8ClampedArray;
  /** Fração da imagem que virou transparente. */
  removido: number;
};

/** A cor do fundo, se os quatro cantos concordarem e forem opacos. */
export function corDoFundo(
  d: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
): [number, number, number] | null {
  const cantos = [0, w - 1, (h - 1) * w, (h - 1) * w + (w - 1)].map((p) => p * 4);
  for (const i of cantos) if (d[i + 3]! < 250) return null; // já tem transparência
  const [r, g, b] = [d[cantos[0]!]!, d[cantos[0]! + 1]!, d[cantos[0]! + 2]!];
  for (const i of cantos) if (dist(d, i, r, g, b) > 30) return null;
  return [r, g, b];
}

export function removerFundoChapado(
  d: Uint8ClampedArray | Uint8Array,
  w: number,
  h: number,
): ResultadoFundo | null {
  const fundo = corDoFundo(d, w, h);
  if (!fundo) return null;
  const [r, g, b] = fundo;
  const claro = 0.299 * r + 0.587 * g + 0.114 * b > 225;

  const out = new Uint8ClampedArray(d);
  const total = w * h;
  const alfaDe = (i: number): number => {
    const dd = dist(d, i, r, g, b);
    if (dd <= TOL_INICIO) return 0;
    if (dd >= TOL_FIM) return 255;
    return Math.round(((dd - TOL_INICIO) / (TOL_FIM - TOL_INICIO)) * 255);
  };

  let removido = 0;
  if (claro) {
    for (let p = 0; p < total; p++) {
      const i = p * 4;
      const a = Math.min(alfaDe(i), d[i + 3]!);
      out[i + 3] = a;
      if (a === 0) removido++;
    }
  } else {
    // Preenchimento a partir da borda (só o que encosta nela).
    const visto = new Uint8Array(total);
    const pilha: number[] = [];
    for (let x = 0; x < w; x++) pilha.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) pilha.push(y * w, y * w + (w - 1));
    while (pilha.length) {
      const p = pilha.pop()!;
      if (visto[p]) continue;
      visto[p] = 1;
      const i = p * 4;
      const a = alfaDe(i);
      if (a === 255) continue; // desenho: para aqui
      out[i + 3] = Math.min(a, d[i + 3]!);
      if (a === 0) removido++;
      else continue; // borda suave: não atravessa
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) pilha.push(p - 1);
      if (x < w - 1) pilha.push(p + 1);
      if (y > 0) pilha.push(p - w);
      if (y < h - 1) pilha.push(p + w);
    }
  }

  // Borda suave: tira a cor do fundo que ficou misturada no pixel, senão a
  // logo ganha um halo claro sobre fundo escuro.
  for (let p = 0; p < total; p++) {
    const i = p * 4;
    const a = out[i + 3]! / 255;
    if (a <= 0 || a >= 1 || out[i + 3]! === d[i + 3]!) continue;
    out[i] = (d[i]! - (1 - a) * r) / a;
    out[i + 1] = (d[i + 1]! - (1 - a) * g) / a;
    out[i + 2] = (d[i + 2]! - (1 - a) * b) / a;
  }

  const fracao = removido / total;
  // Nada de fundo (<5%) ou a logo sumiu (>97%): não mexe.
  if (fracao < 0.05 || fracao > 0.97) return null;
  return { pixels: out, removido: fracao };
}
