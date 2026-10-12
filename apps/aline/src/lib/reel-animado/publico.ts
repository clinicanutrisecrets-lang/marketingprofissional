/**
 * Pra quem o reel desenhado fala (Aline, 12/10/2026: "se a linguagem é para o
 * profissional ou para o paciente").
 *
 * O prompt base (spec.ts) é o do Avançado e foi escrito pra seguidora leiga.
 * Pro @scannerdasaude o público é a PROFISSIONAL, então o bloco abaixo vai na
 * mensagem do pedido e reescreve o tom e a chamada, sem mexer no contrato com
 * o renderizador (tipos de cena, campos e tetos de texto continuam os mesmos).
 *
 * Puro de propósito: o teste roda com node.
 */

export type PublicoReel = "paciente" | "profissional";

export function blocoPublicoReel(publico: PublicoReel): string {
  if (publico === "profissional") {
    return [
      "PÚBLICO: PROFISSIONAL DA SAÚDE (nutricionista, médico, biomédico). Este bloco vence o que o formato diz sobre leiga.",
      "- Fale de colega pra colega: pode usar o nome técnico (genótipo, alelo de risco, faixa funcional, mecanismo), sempre curto.",
      "- O campo \"ludico\" dos marcadores e o \"texto\" do gene viram LEITURA CLÍNICA em 1 frase: o que muda na conduta quando aquilo aparece.",
      "- O gancho é a situação de consultório (\"A paciente fez tudo certo e não emagreceu.\"), nunca a dor da paciente em primeira pessoa.",
      "- A virada leva pra leitura integrada (gene, exame e sintoma juntos), não pra \"investigue a sua saúde\".",
      "- CTA: acao1 \"VEJA COMO FAÇO\" ou \"LINK NA BIO\"; acao2 \"SALVE PRA CONSULTA\". Nunca \"me chama no direct\" pedindo atendimento.",
      "- Nada de promessa de resultado de paciente nem de faturamento.",
    ].join("\n");
  }
  return [
    "PÚBLICO: PACIENTE (seguidora leiga). Linguagem simples, sem jargão: se citar o gene, explique pela função na Fábrica da Saúde.",
    "- Nunca afirme que quem assiste TEM a condição: fale do que o sintoma pode indicar e do que vale investigar.",
  ].join("\n");
}

export type ResumoRoteiro = {
  publico: PublicoReel;
  duracaoSeg: number;
  cenas: number;
  /** "FTO rs9939609" — o que o vídeo cita, pra conferir contra a curadoria. */
  genes: string[];
  marcadores: string[];
  alimentos: string[];
  gancho: string;
  /** Quantos registros da curadoria do Scanner sustentaram o roteiro. */
  registrosCurados: number;
};

/** O que o vídeo vai dizer, em uma tela: pra ela conferir antes de postar. */
export function resumoDoRoteiro(
  spec: Record<string, unknown>,
  publico: PublicoReel,
  registrosCurados: number,
): ResumoRoteiro {
  const cenas = Array.isArray(spec.cenas) ? (spec.cenas as Record<string, unknown>[]) : [];
  const genes: string[] = [];
  const marcadores: string[] = [];
  const alimentos: string[] = [];
  let gancho = "";
  let dur = 0;
  for (const c of cenas) {
    const d = Number(c.dur);
    if (Number.isFinite(d)) dur += d;
    if (c.tipo === "hook") gancho = [c.l1, c.l2].filter((x) => typeof x === "string").join(" ");
    if (c.tipo === "gene") genes.push([c.gene, c.rs].filter((x) => typeof x === "string" && x).join(" "));
    if (c.tipo === "marcadores" && Array.isArray(c.itens)) {
      for (const it of c.itens as Record<string, unknown>[]) if (typeof it.nome === "string") marcadores.push(it.nome);
    }
    if (c.tipo === "sinergia" && Array.isArray(c.itens)) {
      for (const it of c.itens as Record<string, unknown>[]) if (typeof it.nome === "string") alimentos.push(it.nome);
    }
  }
  return {
    publico,
    duracaoSeg: Math.round(dur),
    cenas: cenas.length,
    genes,
    marcadores,
    alimentos,
    gancho,
    registrosCurados,
  };
}
