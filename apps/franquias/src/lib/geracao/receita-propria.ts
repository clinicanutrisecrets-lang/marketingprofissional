/**
 * A receita DELA no carrossel de sinergia (Aline, 16/10/2026: "Essa é uma
 * receita? Se sim, digite aqui a receita. Que daí quando você for fazer o post
 * de sinergia, usaria esse").
 *
 * Foto de comida em "Minhas fotos" marcada como receita, com ingredientes e
 * modo de preparo escritos por ela, vira candidata à sinergia da semana, antes
 * das receitas do Lótus. Ela vale UMA vez (a chave entra em `sinergia_chave`).
 *
 * 🔴 Regra de adoçantes do Scanner: receita com xilitol, maltitol ou adoçante
 * artificial nunca vira post. A tela recusa ao salvar e a montagem recusa de
 * novo (a receita pode ter sido escrita antes da regra existir).
 *
 * Funções puras: nada de rede nem banco.
 */
import type { ReceitaSinergia } from "./sinergia.ts";

export const MIN_INGREDIENTES = 3;
export const MIN_MODO_PREPARO = 30;
export const MAX_INGREDIENTES_TEXTO = 2000;
export const MAX_MODO_PREPARO = 3000;

/** Prefixo da chave: separa a receita dela das do Scanner em `sinergia_chave`. */
export const PREFIXO_RECEITA_PROPRIA = "propria:";

const ADOCANTES_PROIBIDOS: [RegExp, string][] = [
  [/xilitol|xylitol/, "xilitol"],
  [/maltitol/, "maltitol"],
  [/sucralose/, "sucralose"],
  [/aspartame/, "aspartame"],
  [/sacarina/, "sacarina"],
  [/ciclamato/, "ciclamato"],
  [/acessulfame|acesulfame/, "acessulfame"],
];

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O adoçante proibido que aparece no texto, ou null. */
export function adocanteProibido(texto: string): string | null {
  const t = semAcento(texto);
  for (const [re, nome] of ADOCANTES_PROIBIDOS) if (re.test(t)) return nome;
  return null;
}

/** Uma linha por ingrediente; marcadores de lista e linhas vazias saem. */
export function linhasDeIngredientes(texto: string): string[] {
  return String(texto ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*·]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

export type ReceitaEscrita = { titulo: string; ingredientes: string; modo_preparo: string };

/** O que está errado na receita escrita (pra tela dizer), ou null quando ela serve. */
export function problemaDaReceita(r: ReceitaEscrita): string | null {
  if (!r.titulo.trim()) return "Escreva o nome da receita no campo \"O que é?\".";
  const ing = linhasDeIngredientes(r.ingredientes);
  if (ing.length < MIN_INGREDIENTES) return `Escreva pelo menos ${MIN_INGREDIENTES} ingredientes, um por linha.`;
  if (r.ingredientes.length > MAX_INGREDIENTES_TEXTO) return "A lista de ingredientes ficou longa demais.";
  const modo = r.modo_preparo.replace(/\s+/g, " ").trim();
  if (modo.length < MIN_MODO_PREPARO) return "Escreva o modo de preparo (pelo menos uma frase completa).";
  if (r.modo_preparo.length > MAX_MODO_PREPARO) return "O modo de preparo ficou longo demais.";
  const ad = adocanteProibido(`${r.titulo}\n${r.ingredientes}\n${r.modo_preparo}`);
  if (ad) {
    return `Esta receita leva ${ad}, que o Scanner não usa em receita. Troque por estévia, eritritol ou um adoçante natural (tâmara, fruta, mel) para ela poder virar post.`;
  }
  return null;
}

export type ArquivoReceita = {
  id: string;
  tipo: string;
  url_storage: string | null;
  descricao: string | null;
  eh_receita: boolean | null;
  receita_ingredientes: string | null;
  receita_modo_preparo: string | null;
};

/** A foto vira receita da sinergia? null quando não serve (e nunca é inventada). */
export function receitaPropriaParaSinergia(a: ArquivoReceita): ReceitaSinergia | null {
  if (a.tipo !== "foto_comida" || a.eh_receita !== true || !a.url_storage) return null;
  const escrita = {
    titulo: (a.descricao ?? "").replace(/\s+/g, " ").trim(),
    ingredientes: a.receita_ingredientes ?? "",
    modo_preparo: a.receita_modo_preparo ?? "",
  };
  if (problemaDaReceita(escrita)) return null;
  return {
    chave: `${PREFIXO_RECEITA_PROPRIA}${a.id}`,
    foto_url: a.url_storage,
    titulo: escrita.titulo,
    temas: [],
    tipo: "receita",
    ingredientes: linhasDeIngredientes(escrita.ingredientes),
    modo_preparo: escrita.modo_preparo.trim(),
    tempo_min: null,
    rendimento: null,
    compostos: [],
  };
}

/**
 * A receita dela da semana: a primeira (na ordem em que chegaram) que serve e
 * ainda não foi usada. null = segue com as receitas do Scanner.
 */
export function escolherReceitaPropria(arquivos: ArquivoReceita[], usadas: string[]): ReceitaSinergia | null {
  const ja = new Set(usadas);
  for (const a of arquivos) {
    const r = receitaPropriaParaSinergia(a);
    if (r && !ja.has(r.chave)) return r;
  }
  return null;
}
