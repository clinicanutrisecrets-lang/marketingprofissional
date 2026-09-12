/**
 * Geometria da FOTO no card — onde ela entra, que tamanho tem e como o bloco
 * de texto se acomoda em volta. Puro (sem sharp, sem fontes) de propósito:
 * é o que o teste roda sem instalar nada, e é a única fonte de verdade que
 * todos os layouts do `cardDesigner` consultam antes de desenhar.
 *
 * Decisão da Aline (12/09/2026): o card é tipográfico — cores da paleta,
 * diagramação de título/subtítulo e ESPAÇO pra foto que a própria nutri sobe.
 * Ela escolhe o lugar (topo, base ou ao lado) e o tamanho; a foto nunca fica
 * presa na tirinha do topo.
 *
 * Regra de ouro: a foto NUNCA sobrepõe texto. Se não cabe, encolhe; se nem
 * encolhida cabe, o texto é desenhado e a foto sai — com aviso, nunca em
 * silêncio.
 */

/** Onde a foto entra em relação ao texto. */
export type FotoLugar = "topo" | "base" | "direita";
/** Tamanho da foto, relativo ao card. */
export type FotoTamanho = "pequena" | "media" | "grande";

/** `topo` + `media` reproduz o comportamento antigo (tirinha 84% × ~22%). */
export const FOTO_LUGAR_PADRAO: FotoLugar = "topo";
export const FOTO_TAMANHO_PADRAO: FotoTamanho = "media";

export type Rect = { x: number; y: number; w: number; h: number };

export type PlanoFoto = {
  /** Retângulo da foto no canvas; `null` = não coube, texto desenhado sem ela. */
  foto: Rect | null;
  /** Retângulo reservado ao bloco de texto (o renderer desenha dentro dele). */
  texto: Rect;
  /** A foto foi reduzida abaixo do tamanho pedido pra caber. */
  encolhida: boolean;
  /** Mensagem pra tela quando a foto encolheu ou saiu. */
  aviso: string | null;
};

export function normalizarFotoLugar(raw: unknown): FotoLugar {
  return raw === "base" || raw === "direita" ? raw : FOTO_LUGAR_PADRAO;
}

export function normalizarFotoTamanho(raw: unknown): FotoTamanho {
  return raw === "pequena" || raw === "grande" ? raw : FOTO_TAMANHO_PADRAO;
}

/** Dois retângulos se cruzam? (borda encostada não conta como colisão) */
export function colide(a: Rect, b: Rect): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

/** O retângulo está inteiro dentro do canvas W×H? */
export function dentroDoCanvas(r: Rect, W: number, H: number): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H;
}

/**
 * Tamanho NOMINAL da foto (antes de qualquer encolhimento) por lugar e
 * tamanho. Frações do canvas, não pixels fixos, pra valer em 1:1, 4:5 e 9:16.
 *
 *  topo/base   pequena 40% × 14%h · media 84% × 22%h (antigo) · grande 84% × 34%h
 *  direita     coluna de 38% da largura; altura 28% / 42% / 58%
 *
 * No stories (9:16) as alturas encolhem um pouco: a peça é alta e a foto
 * em 34% da altura viraria um painel.
 */
export function tamanhoNominalFoto(params: {
  W: number;
  H: number;
  lugar: FotoLugar;
  tamanho: FotoTamanho;
}): { w: number; h: number } {
  const { W, H, lugar, tamanho } = params;
  const stories = H / W > 1.5;
  if (lugar === "direita") {
    const fracH = tamanho === "pequena" ? 0.28 : tamanho === "grande" ? 0.58 : 0.42;
    return { w: Math.round(W * 0.38), h: Math.round(H * fracH * (stories ? 0.85 : 1)) };
  }
  if (tamanho === "pequena") {
    return { w: Math.round(W * 0.4), h: Math.round(H * (stories ? 0.12 : 0.14)) };
  }
  if (tamanho === "grande") {
    return { w: Math.round(W * 0.84), h: Math.round(H * (stories ? 0.3 : 0.34)) };
  }
  return { w: Math.round(W * 0.84), h: Math.round(H * (stories ? 0.2 : 0.22)) };
}

/**
 * Largura da coluna de TEXTO quando a foto vai à direita. O renderer mede o
 * texto com esta largura ANTES de chamar `planejarFoto`, porque a altura do
 * bloco depende dela.
 */
export function larguraColunaTexto(W: number, margemX: number, gap: number): number {
  const fotoW = tamanhoNominalFoto({ W, H: W, lugar: "direita", tamanho: "media" }).w;
  // A foto encosta na margem direita; o texto vai da margem esquerda até o
  // respiro antes da foto.
  return Math.max(Math.round(W * 0.3), W - margemX - fotoW - gap - margemX);
}

export type EntradaPlano = {
  W: number;
  H: number;
  lugar: FotoLugar;
  tamanho: FotoTamanho;
  /** Limite superior útil (abaixo da logo). */
  areaTopo: number;
  /** Limite inferior útil (acima do @handle). */
  areaBase: number;
  /** Margem lateral do texto (usada na coluna do `direita`). */
  margemX: number;
  /** Largura do bloco de texto já medido. */
  larguraTexto: number;
  /** Altura do bloco de texto já medido (na largura acima). */
  alturaTexto: number;
  /** Respiro entre foto e texto. */
  gap: number;
  /** Onde o grupo se ancora verticalmente na área útil (0 = topo, 0.5 = centro). */
  ancora?: number;
};

const ALTURA_MINIMA_FRAC = 0.08;
/**
 * Abaixo desta fração do tamanho nominal a redução vira AVISO. Encolher 10–20%
 * pra acomodar um título de três linhas é ajuste de diagramação, não problema
 * — avisar toda vez treinaria a profissional a ignorar o aviso que importa.
 */
const FRACAO_AVISO_ENCOLHIDA = 0.7;

const AVISO_NAO_COUBE =
  "A foto não coube neste layout com esse tamanho — tente Pequena ou outro lugar.";
const AVISO_ENCOLHIDA =
  "A foto foi reduzida pra não cobrir o texto — se quiser maior, encurte o texto ou troque o lugar.";

/**
 * Planeja foto + texto. Nunca devolve foto cruzando o texto: encolhe a foto
 * até a altura mínima (8% do card) e, se ainda assim não couber ao lado do
 * texto, devolve `foto: null` com aviso.
 */
export function planejarFoto(p: EntradaPlano): PlanoFoto {
  const { W, H, lugar, tamanho, areaTopo, areaBase, margemX, gap } = p;
  const disponivel = Math.max(0, areaBase - areaTopo);
  const ancora = p.ancora ?? 0.46;
  const alturaTexto = Math.max(0, Math.round(p.alturaTexto));
  const larguraTexto = Math.max(1, Math.round(p.larguraTexto));
  const nominal = tamanhoNominalFoto({ W, H, lugar, tamanho });
  const minH = Math.round(H * ALTURA_MINIMA_FRAC);

  if (lugar === "direita") {
    // Duas colunas: texto à esquerda, foto encostada na margem direita.
    // Não há como cruzar — a colisão é impedida pela própria geometria; o que
    // pode faltar é altura, e aí a foto encolhe até o mínimo.
    const fotoH = Math.min(nominal.h, disponivel);
    const encolhida = fotoH < nominal.h;
    if (fotoH < minH) {
      // área útil menor que a foto mínima (logo gigante + texto?) — sem foto
      return {
        foto: null,
        texto: { x: margemX, y: areaTopo, w: larguraTexto, h: alturaTexto },
        encolhida: false,
        aviso: AVISO_NAO_COUBE,
      };
    }
    const fotoX = W - margemX - nominal.w;
    // Coluna de texto precisa terminar antes da foto (com respiro). Se o
    // renderer mediu o texto mais largo que a coluna, a foto não pode entrar.
    if (margemX + larguraTexto + gap > fotoX) {
      return {
        foto: null,
        texto: { x: margemX, y: areaTopo, w: larguraTexto, h: alturaTexto },
        encolhida: false,
        aviso: AVISO_NAO_COUBE,
      };
    }
    const grupo = Math.max(fotoH, alturaTexto);
    const y0 = Math.max(areaTopo, Math.min(Math.round(areaTopo + (disponivel - grupo) * ancora), areaBase - grupo));
    return {
      foto: { x: fotoX, y: y0 + Math.round((grupo - fotoH) / 2), w: nominal.w, h: fotoH },
      texto: { x: margemX, y: y0 + Math.round((grupo - alturaTexto) / 2), w: larguraTexto, h: alturaTexto },
      encolhida,
      aviso: fotoH < nominal.h * FRACAO_AVISO_ENCOLHIDA ? AVISO_ENCOLHIDA : null,
    };
  }

  // topo / base: pilha vertical. Encolhe a foto em passos de 15% até o grupo
  // (foto + respiro + texto) caber na área útil.
  let fotoH = nominal.h;
  let encolhida = false;
  const cabe = (h: number) => h + gap + alturaTexto <= disponivel;
  while (!cabe(fotoH) && fotoH > minH) {
    fotoH = Math.max(minH, Math.floor(fotoH * 0.85));
    encolhida = true;
  }
  const textoX = Math.round((W - larguraTexto) / 2);
  if (!cabe(fotoH)) {
    // Nem no mínimo. Texto sozinho, foto fora — e a tela fica sabendo.
    const y0 = Math.max(areaTopo, Math.min(Math.round(areaTopo + (disponivel - alturaTexto) * ancora), areaBase - alturaTexto));
    return {
      foto: null,
      texto: { x: textoX, y: y0, w: larguraTexto, h: alturaTexto },
      encolhida: false,
      aviso: AVISO_NAO_COUBE,
    };
  }
  const fotoW = Math.min(nominal.w, W);
  const aviso = fotoH < nominal.h * FRACAO_AVISO_ENCOLHIDA ? AVISO_ENCOLHIDA : null;
  const grupo = fotoH + gap + alturaTexto;
  const y0 = Math.max(areaTopo, Math.min(Math.round(areaTopo + (disponivel - grupo) * ancora), areaBase - grupo));
  const fotoX = Math.round((W - fotoW) / 2);
  if (lugar === "topo") {
    return {
      foto: { x: fotoX, y: y0, w: fotoW, h: fotoH },
      texto: { x: textoX, y: y0 + fotoH + gap, w: larguraTexto, h: alturaTexto },
      encolhida,
      aviso,
    };
  }
  return {
    foto: { x: fotoX, y: y0 + alturaTexto + gap, w: fotoW, h: fotoH },
    texto: { x: textoX, y: y0, w: larguraTexto, h: alturaTexto },
    encolhida,
    aviso,
  };
}

/** Lugares que cada layout sabe desenhar. `citacao` e `lista` são pilhas. */
export const LUGARES_POR_LAYOUT: Record<string, readonly FotoLugar[]> = {
  foto: ["topo", "base", "direita"],
  hero: ["topo", "base", "direita"],
  editorial: ["topo", "base", "direita"],
  citacao: ["topo", "base"],
  lista: ["topo", "base"],
};

export const AVISO_LAYOUT_SEM_FOTO =
  "Este tipo de arte não usa foto — troque pra Clássico, Editorial, Citação ou Lista.";

/**
 * Resolve o lugar pedido contra o que o layout suporta. Layout que não aceita
 * `direita` cai em `topo`, e o chamador mostra o motivo (nunca em silêncio).
 */
export function resolverLugar(
  layout: string,
  lugar: FotoLugar,
): { lugar: FotoLugar; aviso: string | null } {
  const suportados = LUGARES_POR_LAYOUT[layout];
  if (!suportados) return { lugar, aviso: AVISO_LAYOUT_SEM_FOTO };
  if (suportados.includes(lugar)) return { lugar, aviso: null };
  return {
    lugar: "topo",
    aviso: "Neste tipo de arte a foto entra no topo ou na base — ela foi colocada no topo.",
  };
}
