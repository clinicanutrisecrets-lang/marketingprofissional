/**
 * Post de venda do teste = post de venda da CONSULTA (Aline, 14/10/2026).
 *
 * As três regras, para todas as contas:
 *  1. Nunca vender o teste. O produto é a consulta (Consulta Nutrigenética,
 *     Consulta Epigenética, DNA 360), e o teste entra pela palavra-chave
 *     "INCLUI": "a consulta inclui o teste".
 *  2. O foco é sempre a consulta de interpretação: a leitura do teste
 *     cruzada com os exames e com o que a pessoa sente (correlação).
 *  3. A coleta: na consulta presencial ela é feita na própria consulta;
 *     quando a consulta é online, o kit vai para casa, em todo o Brasil.
 *
 * E o visual aprovado no mesmo dia: carrossel com a foto de consulta na capa
 * inteira, fotos nos slides do meio só quando o texto deixa espaço, e o fecho
 * na cor da marca. As fotos são as do Drive dela (public/consulta-teste).
 *
 * Funções puras: nada de rede nem banco, pra dar pra testar.
 */
import type { SlideEditorial } from "@scanner/ai-image";
import { semLink } from "../criativo/texto-arte.ts";

export type ProdutoConsulta = {
  nome: string;
  scanner_produto_id?: string | null;
  checkout_url?: string | null;
};

/**
 * Como a consulta se chama no post. O catálogo às vezes guarda o NOME DO
 * PRODUTO ("DNA 360") numa oferta que é a Consulta Nutrigenética: o link
 * diz a verdade, então ele decide primeiro.
 */
export function nomeDaConsulta(p: ProdutoConsulta): string {
  const nome = (p.nome ?? "").trim();
  const url = (p.checkout_url ?? "").toLowerCase();
  if (p.scanner_produto_id === "teste_epigenetico") {
    return /consulta/i.test(nome) ? nome : "Consulta Epigenética";
  }
  if (url.includes("consulta-nutrigenetica") || /consulta\s+nutrigen/i.test(nome)) return "Consulta Nutrigenética";
  return nome || "Consulta Nutrigenética";
}

/** O que a consulta inclui, em palavras de gente. */
export function oQueInclui(p: ProdutoConsulta): string {
  return p.scanner_produto_id === "teste_epigenetico" ? "o teste epigenético" : "o teste genético";
}

export const COLETA_PRESENCIAL_OU_KIT =
  "Na consulta presencial a coleta é feita na própria consulta. Quando a consulta é online, o kit vai para a casa da pessoa, em qualquer lugar do Brasil.";

/** A regra inteira, pronta pra entrar em qualquer prompt de venda do teste. */
export function regraConsultaInclui(p: ProdutoConsulta): string {
  const nome = nomeDaConsulta(p);
  const teste = oQueInclui(p);
  const dna360 =
    /dna\s*360/i.test(nome)
      ? ` "${nome}" é o acompanhamento que começa pela consulta nutrigenética: apresente como consulta e acompanhamento, nunca como exame.`
      : "";
  return [
    `REGRA DE VENDA (todas as contas): o produto deste post é a CONSULTA "${nome}", nunca o teste.${dna360}`,
    `O teste entra SEMPRE pela palavra "inclui": "a ${/^consulta/i.test(nome) ? nome : "consulta"} inclui ${teste}". Nunca "compre o teste", "faça o seu teste", "garanta o seu teste" nem "teste por R$".`,
    "O foco é a consulta de INTERPRETAÇÃO: a leitura do teste cruzada com os exames de sangue e com o que a pessoa sente hoje (correlação). Um resultado sozinho não diz o que fazer; quem decide é a correlação feita na consulta.",
    `Coleta: ${COLETA_PRESENCIAL_OU_KIT} Diga as duas formas, porque a seguidora não sabe qual é a dela.`,
  ].join("\n");
}

/**
 * Estrutura do carrossel de venda da consulta (6 slides), escrita pra entrar
 * na instrução do post. Cada slide do meio: título curto, quebra de linha,
 * 1 ou 2 frases. É esse formato que o desenhador separa em título e corpo.
 */
export function estruturaCarrosselConsulta(p: ProdutoConsulta, queixa: string): string {
  const nome = nomeDaConsulta(p);
  return [
    "CARROSSEL DE 6 SLIDES, nesta ordem (cada item do campo \"slides\"):",
    `1. Capa: um gancho sobre ${queixa} que leva à leitura do corpo (ex.: "O seu DNA não é a resposta. A leitura dele é."). Até 60 caracteres, depois uma quebra de linha e uma frase de apoio dizendo que a consulta cruza o teste com os exames e com o que a pessoa sente.`,
    "2. Por que só o teste não basta: um resultado sozinho não diz o que fazer; o mesmo resultado pede condutas diferentes conforme os exames e os sintomas.",
    "3. O que acontece na consulta: gene, exame e sintoma lidos juntos, e a prioridade do caso em ordem.",
    `4. A consulta inclui ${oQueInclui(p)}: ${COLETA_PRESENCIAL_OU_KIT}`,
    "5. O que a pessoa leva: a leitura explicada, a correlação com os exames, as prioridades e o plano (o que comer, o que suplementar).",
    `6. Fecho: "${nome}" + "inclui ${oQueInclui(p)}" + "O link está na bio."`,
    "Nos slides 2 a 5: primeiro um TÍTULO curto (até 60 caracteres), depois uma quebra de linha, depois no máximo 2 frases curtas. Sem rótulo, sem numeração.",
  ].join("\n");
}

const RE_COLETA = /\b(coleta|cotonete|kit|saliva|bochecha|swab)\b/i;

/** Separa "Título\nCorpo" (ou a 1ª frase) do texto de um slide. */
export function tituloECorpo(t: string): { titulo: string; corpo?: string } {
  const limpo = semLink(t).replace(/\r/g, "").trim();
  const quebra = limpo.indexOf("\n");
  if (quebra > 0) {
    const titulo = limpo.slice(0, quebra).trim();
    const corpo = limpo.slice(quebra + 1).replace(/\s+/g, " ").trim();
    return corpo ? { titulo, corpo } : { titulo };
  }
  const umaLinha = limpo.replace(/\s+/g, " ");
  // 1ª frase como título, só se ela for curta: frase longa como título
  // encolheria a letra até ficar miúda.
  const m = umaLinha.match(/^(.{12,90}?[.!?])\s+(.+)$/);
  if (m) return { titulo: m[1]!.trim(), corpo: m[2]!.trim() };
  return { titulo: umaLinha };
}

/** As fotos em public/consulta-teste (as do Drive dela). */
export const FOTOS_CONSULTA = ["consulta-tablet", "consulta-mesa", "leitura-exames", "anotacoes"] as const;
export const FOTOS_COLETA = ["coleta-mulher", "coleta-homem", "kit-homem", "kit-banheiro"] as const;

/**
 * Onde está o rosto (ou a mão com o cotonete) em cada foto, de 0 (topo) a 1
 * (base). O corte do slide do meio centra nesse ponto: o centro cego cortava
 * a cabeça das pessoas sentadas (Aline, 14/10/2026). Medido foto a foto.
 */
export const FOCO_FOTO: Record<string, number> = {
  "consulta-tablet": 0.48,
  "consulta-mesa": 0.3,
  "leitura-exames": 0.42,
  anotacoes: 0.5,
  "coleta-mulher": 0.32,
  "coleta-homem": 0.35,
  "kit-homem": 0.4,
  "kit-banheiro": 0.36,
};

export type SlideComFoto = SlideEditorial & { fotoNome?: string };

/**
 * Os slides do carrossel da consulta, com a foto que cada um pede.
 * Capa: foto de CONSULTA (o produto é a consulta). Slide que fala da coleta:
 * foto de coleta, só no genético (o kit do epigenético é outro, e foto do kit
 * errado engana). Os outros do meio: foto de consulta. O desenhador tira a
 * foto quando o texto não deixa espaço. `semana` gira as fotos.
 */
export function slidesDaConsulta(
  textos: string[],
  p: ProdutoConsulta,
  semana = 0,
): SlideComFoto[] {
  const limpos = textos.map((t) => String(t ?? "").trim()).filter(Boolean);
  if (limpos.length < 2) return [];
  const nome = nomeDaConsulta(p);
  const genetico = p.scanner_produto_id !== "teste_epigenetico";
  const ultimo = limpos.length - 1;
  const consultas = FOTOS_CONSULTA.map((_, i) => FOTOS_CONSULTA[(i + semana) % FOTOS_CONSULTA.length]!);
  const coletas = FOTOS_COLETA.map((_, i) => FOTOS_COLETA[(i + semana) % FOTOS_COLETA.length]!);
  let iConsulta = 1; // a 1ª vai na capa
  let iColeta = 0;

  return limpos.map((t, i): SlideComFoto => {
    const { titulo, corpo } = tituloECorpo(t);
    if (i === 0) {
      return { tipo: "capa", titulo, kicker: nome, subtitulo: corpo, fotoNome: consultas[0] };
    }
    if (i === ultimo) {
      return { tipo: "fecho", titulo, chamada: corpo, rotulo: nome };
    }
    const fala = RE_COLETA.test(t);
    const fotoNome =
      fala && genetico ? coletas[iColeta++ % coletas.length] : consultas[iConsulta++ % consultas.length];
    return {
      tipo: "meio",
      titulo,
      corpo,
      // Rótulo curto: o longo encostava no número da página.
      rotulo: fala ? "A consulta inclui o teste" : nome,
      fotoNome,
      ...(fotoNome && FOCO_FOTO[fotoNome] !== undefined ? { fotoFocoY: FOCO_FOTO[fotoNome] } : {}),
    };
  });
}

/** A URL pública de uma foto de public/consulta-teste. */
export function fotoDaConsultaUrl(
  nome: string,
  base = process.env.NEXT_PUBLIC_APP_URL || "https://app.scannerdasaude.com",
): string {
  return `${base.replace(/\/+$/, "")}/consulta-teste/${nome}.jpg`;
}
