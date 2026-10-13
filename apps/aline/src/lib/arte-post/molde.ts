/**
 * Arte do post do Studio (Aline, 12/10/2026: "os posts que não estão ali, eu
 * queria que eles estivessem… as cores, o tipo da letra, o tipo de gancho…
 * a gente já tem imagens das receitas").
 *
 * O calendário editorial (docs/CALENDARIO-EDITORIAL.md) gravou só a CAPA, o
 * cruzamento e o envio de cada post; o resto (validação, tchan, mini soluções)
 * estava num artifact. Aqui mora o molde dos sete passos que a outra sessão
 * fechou com ela, a marca de cada perfil e a validação do que o modelo devolve.
 *
 * Puro de propósito: o teste roda com node.
 */

export const MAX_ARTE = {
  headline: 70,
  corpo: 260,
  eyebrow: 28,
  cta: 90,
  legenda: 2200,
} as const;

export const SLIDES_MIN = 4;
export const SLIDES_MAX = 7;

/** O molde que a outra sessão fechou com ela em 08/09 (CALENDARIO-EDITORIAL.md). */
export const MOLDE_SETE_PASSOS = [
  "MOLDE DO CARROSSEL (sete passos, nesta ordem, um passo por slide no máximo):",
  "1. A capa é EXPLÍCITA: a palavra que a pessoa usa, não metáfora educada. A capa já vem pronta: use exatamente o texto dado.",
  "2. A frase da resignação: o que ela diz para si mesma, entre aspas.",
  "3. A VALIDAÇÃO antes de qualquer pergunta. Nenhum slide diz que ela fez besteira. O tratamento que não funcionou estava certo para outra pessoa.",
  "4. O tchan: a correlação que ela não conhecia, com o cruzamento do post.",
  "5. UMA MINI SOLUÇÃO PARA CADA TIPO: três ou quatro perfis, cada um com algo para fazer hoje, de graça.",
  "6. O que é da consulta: a pergunta que sobrou. Nunca \"procure um profissional\".",
  "7. O envio nomeia uma pessoa pelo TRAÇO, não pelo rótulo (\"alguém que não tem problema em iniciar o sono, mas acorda já cansada\").",
  "",
  "O fim é DESEJO, não frustração: \"qual dos perfis é o seu\" convida.",
  "A Fábrica da Saúde em todo texto, sempre colada na tradução: \"a ferritina, que é parte da matéria-prima da sua fábrica de saúde\". Nunca a palavra sozinha.",
  "O teste de fracasso: se no fim a leitora pode dizer \"não precisava de teste genético pra isso\", o post falhou.",
].join("\n");

export const REGRAS_TEXTO = [
  "REGRAS ABSOLUTAS:",
  "- Zero travessão (nem — nem –). Use vírgula, ponto ou dois-pontos.",
  "- Nunca escreva \"IA\" nem \"inteligência artificial\".",
  "- Nunca afirme que quem lê TEM uma doença: fale do que o sintoma pode indicar e do que vale investigar.",
  "- Nenhum número, dose, faixa, gene ou alimento fora da CURADORIA DO SCANNER dada. Se ela não sustenta uma afirmação, não escreva a afirmação.",
  "- Nada de promessa de resultado, nada de depoimento, nada de escassez.",
  "- Português do Brasil com acentos.",
].join("\n");

export type SlideArte = { headline: string; corpo?: string };

export type ArteGerada = {
  eyebrow: string;
  slides: SlideArte[];
  fecho: { headline: string; cta: string };
  legenda: string;
  hashtags: string[];
  /** Só nos posts de receita: a receita do Scanner sustenta o tema? */
  receita_serve?: boolean;
};

/** Ferramenta pro modelo: o teto de cada campo vai na descrição. */
export const FERRAMENTA_ARTE = {
  name: "montar_carrossel",
  description: "Devolve os slides internos, o fecho e a legenda do carrossel.",
  input_schema: {
    type: "object" as const,
    properties: {
      eyebrow: { type: "string", description: `Setor da Fábrica da Saúde do post, em até ${MAX_ARTE.eyebrow} caracteres (ex.: MATÉRIA-PRIMA).` },
      slides: {
        type: "array",
        description: `Slides internos (sem a capa e sem o fecho), de ${SLIDES_MIN - 2} a ${SLIDES_MAX - 2}.`,
        items: {
          type: "object",
          properties: {
            headline: { type: "string", description: `Título do slide, até ${MAX_ARTE.headline} caracteres.` },
            corpo: { type: "string", description: `Texto do slide, até ${MAX_ARTE.corpo} caracteres.` },
          },
          required: ["headline", "corpo"],
        },
      },
      fecho: {
        type: "object",
        properties: {
          headline: { type: "string", description: `O envio (passo 7), até ${MAX_ARTE.headline} caracteres.` },
          cta: { type: "string", description: `Convite curto pra comentar ou salvar, até ${MAX_ARTE.cta} caracteres.` },
        },
        required: ["headline", "cta"],
      },
      legenda: { type: "string", description: `Legenda do post, até ${MAX_ARTE.legenda} caracteres. Abre com a capa.` },
      hashtags: { type: "array", items: { type: "string" }, description: "De 3 a 8 hashtags, sem espaço." },
      receita_serve: { type: "boolean", description: "Só se veio RECEITA: true se ela sustenta o tema do post." },
    },
    required: ["eyebrow", "slides", "fecho", "legenda", "hashtags"],
  },
};

function texto(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/** Recusa nomeando o campo: a nova tentativa recebe o motivo. */
export function validarArte(bruto: unknown): { ok: true; arte: ArteGerada } | { ok: false; motivo: string } {
  const b = (bruto ?? {}) as Record<string, unknown>;
  const eyebrow = texto(b.eyebrow).toUpperCase();
  if (eyebrow.length > MAX_ARTE.eyebrow) return { ok: false, motivo: `eyebrow com ${eyebrow.length} caracteres (máximo ${MAX_ARTE.eyebrow})` };
  const slidesBrutos = Array.isArray(b.slides) ? b.slides : [];
  const slides: SlideArte[] = [];
  for (let i = 0; i < slidesBrutos.length; i++) {
    const s = (slidesBrutos[i] ?? {}) as Record<string, unknown>;
    const headline = texto(s.headline);
    const corpo = texto(s.corpo);
    if (!headline) return { ok: false, motivo: `slide ${i + 1} sem título` };
    if (headline.length > MAX_ARTE.headline) return { ok: false, motivo: `título do slide ${i + 1} com ${headline.length} caracteres (máximo ${MAX_ARTE.headline})` };
    if (corpo.length > MAX_ARTE.corpo) return { ok: false, motivo: `texto do slide ${i + 1} com ${corpo.length} caracteres (máximo ${MAX_ARTE.corpo})` };
    slides.push({ headline, corpo });
  }
  if (slides.length < SLIDES_MIN - 2 || slides.length > SLIDES_MAX - 2) {
    return { ok: false, motivo: `${slides.length} slides internos (entre ${SLIDES_MIN - 2} e ${SLIDES_MAX - 2})` };
  }
  const f = (b.fecho ?? {}) as Record<string, unknown>;
  const fecho = { headline: texto(f.headline), cta: texto(f.cta) };
  if (!fecho.headline) return { ok: false, motivo: "fecho sem o envio" };
  if (fecho.headline.length > MAX_ARTE.headline) return { ok: false, motivo: `envio com ${fecho.headline.length} caracteres (máximo ${MAX_ARTE.headline})` };
  if (fecho.cta.length > MAX_ARTE.cta) return { ok: false, motivo: `chamada com ${fecho.cta.length} caracteres (máximo ${MAX_ARTE.cta})` };
  const legenda = typeof b.legenda === "string" ? b.legenda.trim() : "";
  if (legenda.length < 80) return { ok: false, motivo: "legenda curta demais" };
  if (legenda.length > MAX_ARTE.legenda) return { ok: false, motivo: `legenda com ${legenda.length} caracteres (máximo ${MAX_ARTE.legenda})` };
  const hashtags = (Array.isArray(b.hashtags) ? b.hashtags : [])
    .map((h) => texto(h).replace(/\s+/g, ""))
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .slice(0, 8);

  const tudo = [eyebrow, ...slides.flatMap((s) => [s.headline, s.corpo ?? ""]), fecho.headline, fecho.cta, legenda].join(" ");
  if (/[—–]/.test(tudo)) return { ok: false, motivo: "texto com travessão" };
  // A sigla só conta em CAIXA ALTA: "aí" e "ia" (de ir) não são a sigla.
  if (/(?<![\p{L}])IA(?![\p{L}])/u.test(tudo) || /intelig[êe]ncia artificial/i.test(tudo)) {
    return { ok: false, motivo: "texto cita IA" };
  }
  return {
    ok: true,
    arte: {
      eyebrow,
      slides,
      fecho,
      legenda,
      hashtags,
      ...(typeof b.receita_serve === "boolean" ? { receita_serve: b.receita_serve } : {}),
    },
  };
}

/** A capa é a primeira linha da legenda gravada (é o que a grade mostra). */
export function capaDoPost(legenda: string | null | undefined): string {
  return (legenda ?? "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";
}

/** Legenda ainda é o esqueleto do calendário ("Cruza X. Envia pra Y")? */
export function legendaEhEsqueleto(legenda: string | null | undefined): boolean {
  const l = (legenda ?? "").trim();
  return l.length < 400 && /\n(Cruza |O ângulo:)/.test(l);
}

export type CoresArte = {
  corPrimariaHex: string;
  corDestaqueHex?: string;
  corTextoHex?: string;
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * As cores que a outra sessão gravou em aline.perfis.
 * - nutrisecrets: paleta em objeto (tiffany, magenta, creme, escuro). Tiffany
 *   é bloco, nunca letra; magenta é o destaque; escuro é o texto.
 * - scannerdasaude: paleta em lista, uma cor por pilar ("rotaciona por pilar").
 */
export function coresDoPerfil(
  perfil: { cor_primaria?: string | null; cor_secundaria?: string | null; paleta_cores?: unknown },
  pilar?: string | null,
): CoresArte {
  const prim = HEX.test(perfil.cor_primaria ?? "") ? perfil.cor_primaria! : "#0ABFBC";
  const pal = perfil.paleta_cores;
  if (pal && !Array.isArray(pal) && typeof pal === "object") {
    const o = pal as Record<string, string>;
    return {
      corPrimariaHex: HEX.test(o.tiffany ?? "") ? o.tiffany! : prim,
      corDestaqueHex: HEX.test(o.magenta ?? "") ? o.magenta : undefined,
      corTextoHex: HEX.test(o.escuro ?? "") ? o.escuro : "#1A1A2E",
    };
  }
  if (Array.isArray(pal)) {
    const lista = pal as Array<{ hex?: string; uso?: string; nome?: string }>;
    const p = (pilar ?? "").toLowerCase();
    const porUso = (uso: string) => lista.find((c) => c.uso === uso && HEX.test(c.hex ?? ""))?.hex;
    const cor =
      (/convite|venda/.test(p) && porUso("venda_direta")) ||
      (/bastidor|m[ée]dico|profiss/.test(p) && porUso("bastidores_software")) ||
      (/dor|carreira/.test(p) && porUso("transformacao_carreira")) ||
      porUso("educacao_precisao") ||
      prim;
    return { corPrimariaHex: cor, corDestaqueHex: cor, corTextoHex: "#1A1A2E" };
  }
  return { corPrimariaHex: prim, corTextoHex: "#1A1A2E" };
}

/**
 * O post precisa de arte nova? Sem imagem, ou com imagem no estilo antigo
 * (anterior ao carrossel editorial aprovado em 13/10/2026; os arquivos novos
 * levam "_editorial_" no nome). Post já no estilo novo fica como está.
 */
export function precisaArteNova(midias: Array<{ url?: string | null; tipo?: string | null }>): boolean {
  const imagens = midias.filter((m) => m.tipo !== "video");
  if (imagens.length === 0) return true;
  // Arte que não saiu do motor do Studio (ex.: o carrossel de sinergia que a
  // própria Aline fez) NUNCA é refeita.
  if (!imagens.every((m) => (m.url ?? "").includes("/ai-image/"))) return false;
  return !imagens.every((m) => (m.url ?? "").includes("_editorial_"));
}
