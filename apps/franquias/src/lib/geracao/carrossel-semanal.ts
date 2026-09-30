/**
 * O que vai DESENHADO na arte dos posts da semana.
 *
 * Duas decisões, as duas pedidas pelo time (Juliana, 25/09/2026, olhando a
 * tela Aprovar semana: "dos posts não dá pra tirar isso, o 'Nutrição de
 * Precisão', e estas CTAs de baixo? Vai ficar mais limpo"):
 *
 *  1. Sem selo em cima. O gerador escrevia "Nutrição de Precisão" à mão em
 *     TODA arte de feed e de stories, de toda profissional, qualquer que
 *     fosse a especialidade dela.
 *  2. Sem chamada em baixo. A frase de chamada (`copy_cta`) já vai na
 *     LEGENDA, que é onde o Instagram deixa a pessoa agir. Repetida na arte,
 *     ela disputa espaço com o título e deixa a peça com cara de anúncio.
 *
 * E o carrossel passa a sair pelo desenhador tipográfico (o mesmo das artes
 * de feed e stories, custo zero, sem foto de IA). Antes ele dependia só do
 * Creatomate, cuja conta foi zerada de propósito porque o layout estava
 * feio, e por isso todo carrossel chegava sem imagem desde 13/09/2026.
 *
 * Funções puras: nada de rede nem banco, pra dar pra testar.
 */
import type { ConteudoPeca } from "@scanner/ai-image";
import { semLink } from "../criativo/texto-arte.ts";

/** Instagram aceita até 10; acima de 8 o carrossel cansa e a arte encolhe o texto. */
export const MAX_SLIDES = 8;

/**
 * Até este tamanho o texto do slide sai como TÍTULO (letra grande, no
 * centro). Acima disso vira corpo: parágrafo longo em letra de título
 * encolheria até ficar ilegível. Conferido rasterizando o carrossel: frase
 * curta como corpo ficava miúda no alto de um slide vazio.
 */
export const MAX_CHARS_TITULO_SLIDE = 160;

function slideDoMeio(t: string): ConteudoPeca {
  return t.length <= MAX_CHARS_TITULO_SLIDE ? { headline: t } : { headline: "", corpo: t };
}

/** Arte de peça única (feed e stories): só título e subtítulo. */
export function conteudoDaArteUnica(post: {
  headline?: string | null;
  subtitle?: string | null;
}): ConteudoPeca {
  const headline = semLink(post.headline);
  const subtitle = semLink(post.subtitle);
  return subtitle ? { headline, subtitle } : { headline };
}

function textosDosSlides(bruto: unknown): string[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .map((s) => {
      // O modelo às vezes devolve objeto em vez de texto.
      if (typeof s === "string") return s;
      if (s && typeof s === "object") {
        const o = s as Record<string, unknown>;
        return [o.headline, o.titulo, o.texto, o.corpo]
          .filter((v): v is string => typeof v === "string")
          .join("\n\n");
      }
      return "";
    })
    .map((s) => semLink(s).trim())
    .filter(Boolean);
}

/**
 * Os slides do carrossel, na ordem: capa, meio, fecho.
 *
 * Preferência pelos slides que o modelo escreveu (o prompt pede o campo
 * `slides`). Sem eles, a legenda vira carrossel: a capa é o título do post e
 * cada parágrafo da legenda vira um slide. Nunca inventa texto de chamada.
 *
 * Devolve lista vazia quando não há material pra 2 slides: aí o post segue
 * sem arte, que a tela mostra, em vez de um "carrossel" de um slide só.
 */
export function slidesDoCarrosselSemanal(post: {
  headline?: string | null;
  subtitle?: string | null;
  slides?: unknown;
  copy_legenda?: string | null;
}): ConteudoPeca[] {
  const textos = textosDosSlides(post.slides).slice(0, MAX_SLIDES);

  if (textos.length >= 2) {
    const ultimo = textos.length - 1;
    return textos.map((t, i) => {
      if (i === 0) return { headline: t };
      // O fecho sai no layout grande (hero), então vai como título.
      if (i === ultimo) return { headline: t };
      return slideDoMeio(t);
    });
  }

  const capa = semLink(post.headline) || textos[0] || "";
  if (!capa) return [];

  // Quebra ANTES de limpar: semLink junta espaços, e a quebra de linha
  // (que separa os parágrafos) sumiria junto.
  const paragrafos = String(post.copy_legenda ?? "")
    .split(/\n+/)
    .map((p) => semLink(p).trim())
    // Parágrafo curto é gancho ou pergunta solta; hashtag não é conteúdo.
    .filter((p) => p.length > 25 && !p.startsWith("#"))
    .slice(0, MAX_SLIDES - 1);
  if (!paragrafos.length) return [];

  const sub = semLink(post.subtitle);
  return [
    sub ? { headline: capa, subtitle: sub } : { headline: capa },
    ...paragrafos.map(slideDoMeio),
  ];
}
