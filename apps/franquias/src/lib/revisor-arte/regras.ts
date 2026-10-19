/**
 * Revisor da ARTE (Aline, 19/10/2026: "um agente revisor de marketing que
 * confira outras qualidades antes de aparecer pro cliente").
 *
 * Por que existe: em 18/10 o pacote de domingo saiu com a foto recortada nas
 * 5 contas (o braço do sofá, a cerca, só o cabelo da Juliana) e ninguém viu
 * até a cliente reclamar. O revisor da COPY (lib/claude/revisor-copy.ts) lê o
 * texto da legenda; ninguém olhava a imagem. Este módulo olha.
 *
 * Funções puras aqui (testáveis sem rede): o que é achado, o que é grave e o
 * que fazer. Quem olha a imagem é `olhar.ts`; quem orquestra é `revisar.ts`.
 *
 * 🔴 A ação automática é UMA só e é segura: refazer a arte SEM foto (o card
 * tipográfico na cor da marca, que não tem o que cortar). Texto nunca é
 * reescrito em silêncio; o que não tem conserto mecânico vira aviso para a
 * Aline no admin e segue para a profissional como está.
 */
import { revisarCopy, type AchadoRevisao, type ContextoRevisao } from "../claude/revisor-copy.ts";

export type { AchadoRevisao };

/** O que a leitura da imagem devolve (ferramenta de `olhar.ts`). */
export type OlharArte = {
  /** Rosto/cabeça cortado pela borda, ou só um pedaço do corpo (cabelo, braço). */
  pessoa_cortada: boolean;
  /** Recorte que não se entende: o braço do sofá, um pedaço de cerca. */
  parte_sem_sentido: boolean;
  texto_legivel: boolean;
  /** Letra saindo do card ou escondida atrás da logo. */
  texto_cortado: boolean;
  /** A foto mostra o assunto do texto (ex.: um teste de DNA reconhecível). */
  foto_combina: boolean;
  o_que_a_foto_mostra: string;
  /** Erros de português NO TEXTO DA ARTE, como escritos. */
  erros_portugues: string[];
  /** 1 (não publicaria) a 5 (pronta). */
  nota: number;
  problema_principal: string;
};

export type AcaoRevisor = "ok" | "refazer_sem_foto" | "sinalizar";

/** Regras que, numa arte com foto, mandam refazer sem foto. */
export const REGRAS_GRAVES = new Set([
  "arte_reprovada",
  "pessoa_cortada",
  "parte_sem_sentido",
  "texto_cortado",
  "texto_ilegivel",
]);

type Peca = { headline?: string; subtitle?: string; corpo?: string };

/** Achados sem modelo: o texto escrito NA ARTE e o desenho de reserva. */
export function achadosMecanicos(p: {
  pecas: Peca[] | null;
  /** O desenho principal falhou e a arte saiu no de reserva. */
  desenhoReserva?: boolean;
  ctx?: ContextoRevisao;
}): AchadoRevisao[] {
  const achados: AchadoRevisao[] = [];
  if (p.desenhoReserva) {
    achados.push({
      regra: "desenho_reserva",
      gravidade: "confira",
      trecho: "",
      motivo: "O desenho principal falhou e a arte saiu no desenho de reserva. Ver o log [geracao] da semana.",
    });
  }
  // O texto da arte nunca passava pelo revisor da copy: só a legenda passava.
  const textoArte = (p.pecas ?? [])
    .map((x) => [x.headline, x.subtitle, x.corpo].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n");
  for (const a of revisarCopy(textoArte, p.ctx ?? {})) {
    achados.push({ ...a, regra: `arte_${a.regra}` });
  }
  return achados;
}

/** Nota (1 a 5) a partir da qual o próprio revisor reprova a arte. */
export const NOTA_REPROVA = 2;

/** Traduz a leitura da imagem em achados. */
export function achadosDoOlhar(o: OlharArte): AchadoRevisao[] {
  const achados: AchadoRevisao[] = [];
  const add = (regra: string, gravidade: AchadoRevisao["gravidade"], motivo: string, trecho = "") =>
    achados.push({ regra, gravidade, trecho, motivo });
  // Nota baixa conta sozinha: na 2ª prova (19/10) o revisor deu nota 1 à
  // sala recortada da Mariana sem marcar nenhum campo, e a arte passaria.
  if (o.nota <= NOTA_REPROVA) {
    add("arte_reprovada", "erro", "O revisor não publicaria esta arte.", o.problema_principal);
  }
  if (o.pessoa_cortada) add("pessoa_cortada", "erro", "A foto corta a pessoa (rosto, cabeça ou só um pedaço do corpo).");
  if (o.parte_sem_sentido) add("parte_sem_sentido", "erro", "O recorte mostra um pedaço que não se entende.", o.o_que_a_foto_mostra);
  if (o.texto_cortado) add("texto_cortado", "erro", "Há texto saindo do card ou escondido.");
  if (!o.texto_legivel) add("texto_ilegivel", "erro", "O texto não lê bem sobre a imagem.");
  if (!o.foto_combina) {
    add("foto_nao_combina", "confira", "A foto não mostra o assunto do post. Vale trocar a foto.", o.o_que_a_foto_mostra);
  }
  for (const e of o.erros_portugues.slice(0, 5)) {
    add("arte_portugues", "confira", "Possível erro de português no texto da arte.", e);
  }
  return achados;
}

/**
 * Decide o que fazer. Refazer sem foto só quando: a arte TEM foto, há um
 * achado grave e existe o texto da arte para redesenhar. O resto é aviso.
 */
export function decidirAcao(achados: AchadoRevisao[], p: { temFoto: boolean; podeRefazer: boolean }): AcaoRevisor {
  const grave = achados.some((a) => REGRAS_GRAVES.has(a.regra));
  if (grave && p.temFoto && p.podeRefazer) return "refazer_sem_foto";
  return achados.length ? "sinalizar" : "ok";
}

/**
 * Só conta erro de português quando o revisor diz a correção E ela é
 * diferente do que está escrito. Na prova de 19/10 ele apontou "cansaço" (que
 * está certo) como erro: sem a correção comparada, alarme falso vira ruído.
 */
function errosReais(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const o = x as { escrito?: unknown; correto?: unknown };
    const escrito = typeof o?.escrito === "string" ? o.escrito.trim() : "";
    const correto = typeof o?.correto === "string" ? o.correto.trim() : "";
    if (!escrito || !correto || escrito.toLocaleLowerCase("pt-BR") === correto.toLocaleLowerCase("pt-BR")) continue;
    out.push(`${escrito} → ${correto}`.slice(0, 120));
  }
  return out;
}

/** Valida a saída da ferramenta. Qualquer campo torto = sem leitura. */
export function validarOlhar(entrada: unknown): OlharArte | null {
  const e = entrada as Record<string, unknown> | null;
  if (!e || typeof e !== "object") return null;
  const bools = ["pessoa_cortada", "parte_sem_sentido", "texto_legivel", "texto_cortado", "foto_combina"] as const;
  if (bools.some((k) => typeof e[k] !== "boolean")) return null;
  const nota = typeof e.nota === "number" ? Math.min(5, Math.max(1, Math.round(e.nota))) : 3;
  return {
    pessoa_cortada: e.pessoa_cortada as boolean,
    parte_sem_sentido: e.parte_sem_sentido as boolean,
    texto_legivel: e.texto_legivel as boolean,
    texto_cortado: e.texto_cortado as boolean,
    foto_combina: e.foto_combina as boolean,
    o_que_a_foto_mostra: String(e.o_que_a_foto_mostra ?? "").slice(0, 200),
    erros_portugues: errosReais(e.erros_portugues),
    nota,
    problema_principal: String(e.problema_principal ?? "").slice(0, 200),
  };
}

/** Uma linha pro log e pro alerta do admin. */
export function resumoAchados(achados: AchadoRevisao[]): string {
  return achados.map((a) => (a.trecho ? `${a.regra} ("${a.trecho.slice(0, 40)}")` : a.regra)).join(", ");
}
