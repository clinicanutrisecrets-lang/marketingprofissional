/**
 * Templates de prompts pra diferentes tipos de geração.
 * A parte estática vai com cache_control pra reduzir custo em ~90%.
 */

import { COMPLIANCE_CFN_BR } from "./client";

export type ContextoFranqueada = {
  nome_comercial?: string;
  nome_completo?: string;
  nicho_principal?: string;
  publico_alvo_descricao?: string;
  diferenciais?: string;
  historia_pessoal?: string;
  resultado_transformacao?: string;
  tom_comunicacao?: string;
  palavras_chave_usar?: string[];
  palavras_evitar?: string;
  hashtags_favoritas?: string[];
  concorrentes_nao_citar?: string;
  modalidade_atendimento?: string;
  cidade?: string;
  estado?: string;
  valor_consulta_inicial?: number;
  link_agendamento?: string;
};

/**
 * System prompt base com o contexto completo da nutri.
 * Essa é a parte CACHED — não muda entre gerações da mesma nutri.
 */
export function buildSystemPrompt(ctx: ContextoFranqueada): string {
  const linhas = [
    "Você é um redator especializado em nutrição de precisão, criando conteúdo para Instagram de nutricionistas no Brasil.",
    "",
    "CONTEXTO DA NUTRICIONISTA:",
    ctx.nome_comercial && `Nome: ${ctx.nome_comercial}`,
    ctx.nicho_principal && `Nicho: ${ctx.nicho_principal.replace(/_/g, " ")}`,
    ctx.publico_alvo_descricao && `Público-alvo: ${ctx.publico_alvo_descricao}`,
    ctx.diferenciais && `Diferenciais: ${ctx.diferenciais}`,
    ctx.historia_pessoal && `História: ${ctx.historia_pessoal}`,
    ctx.resultado_transformacao && `Caso marcante: ${ctx.resultado_transformacao}`,
    ctx.tom_comunicacao && `Tom de comunicação: ${ctx.tom_comunicacao.replace(/_/g, " ")}`,
    ctx.modalidade_atendimento && `Modalidade: ${ctx.modalidade_atendimento}`,
    ctx.cidade && ctx.estado && `Local: ${ctx.cidade}/${ctx.estado}`,
    ctx.valor_consulta_inicial && `Consulta inicial: R$${ctx.valor_consulta_inicial}`,
    ctx.link_agendamento && `Link de agendamento: ${ctx.link_agendamento}`,
    "",
    ctx.palavras_chave_usar?.length
      ? `Palavras-chave que SEMPRE deve incluir quando fizer sentido: ${ctx.palavras_chave_usar.join(", ")}`
      : "",
    ctx.palavras_evitar ? `NÃO usar essas palavras/abordagens: ${ctx.palavras_evitar}` : "",
    ctx.hashtags_favoritas?.length
      ? `Hashtags favoritas da nutri: ${ctx.hashtags_favoritas.map((h) => `#${h}`).join(" ")}`
      : "",
    ctx.concorrentes_nao_citar
      ? `NUNCA citar: ${ctx.concorrentes_nao_citar}`
      : "",
    "",
    COMPLIANCE_CFN_BR,
    "",
    "FORMATO DE RESPOSTA:",
    "Retorne APENAS JSON válido seguindo o schema pedido na mensagem do usuário.",
    "Sem markdown, sem ``` cercando, sem explicações fora do JSON.",
  ].filter(Boolean);

  return linhas.join("\n");
}

export type AnguloPost =
  | "educativo_ciencia"
  | "dor_do_paciente"
  | "bastidor_da_nutri"
  | "mito_vs_verdade"
  | "caso_anonimizado"
  | "prova_social"
  | "chamada_direta";

export type TipoPost = "feed_imagem" | "feed_carrossel" | "reels" | "stories";

export const DESCRICAO_ANGULOS: Record<AnguloPost, string> = {
  educativo_ciencia:
    "Explica um conceito de nutrição com embasamento científico acessível. Quebra um mito ou mostra uma sinergia interessante.",
  dor_do_paciente:
    "Começa pela dor/frustração do público-alvo e propõe que existe caminho diferente (sem prometer).",
  bastidor_da_nutri:
    "Momento pessoal ou humanizado da rotina da nutri, que gera conexão.",
  mito_vs_verdade:
    "Desmistifica algo popular que é errado ou incompleto. Cita evidência.",
  caso_anonimizado:
    "Conta um caso de paciente (sem dados reais que identifiquem) mostrando transformação.",
  prova_social:
    "Depoimento, número de atendidos, resultado da clínica. Credibilidade.",
  chamada_direta:
    "Post mais comercial com CTA pro agendamento. Usar com parcimônia (1 em cada 5 posts).",
};

/**
 * Prompt para gerar 1 post. Compacto — a nutri já está no system (cached).
 */
export function buildPromptPost(params: {
  tipo: TipoPost;
  angulo: AnguloPost;
  semana: string;
  contexto_extra?: string;
  historico_performance?: string;
}): string {
  return `Gere 1 post de Instagram do tipo "${params.tipo}" com ângulo "${params.angulo}".

Ângulo: ${DESCRICAO_ANGULOS[params.angulo]}

Semana de referência: ${params.semana}
${params.contexto_extra ? `Contexto extra: ${params.contexto_extra}` : ""}
${params.historico_performance ? `Performance recente: ${params.historico_performance}` : ""}

Responda APENAS com JSON válido neste schema:
{
  "headline": "texto curto que vai no criativo (máx 60 chars)",
  "subtitle": "texto secundário do criativo (máx 80 chars, opcional)",
  "copy_legenda": "legenda completa do post (entre 150 e 400 chars, pode usar emoji com moderação, quebras de linha permitidas)",
  "copy_cta": "call to action curto (máx 50 chars, ex: 'Agende sua avaliação →')",
  "hashtags": ["hashtag1", "hashtag2", ...],  // 5 a 12 hashtags sem o #
  "angulo_copy": "${params.angulo}"
}`;
}

/**
 * Prompt pra gerar LP copy inteira.
 */
export function buildPromptLP(ctx: ContextoFranqueada): string {
  return `Gere o conteúdo de uma landing page personalizada pra essa nutricionista.

A página deve ter:
- Hero: headline forte + subheadline + CTA principal
- Sobre: 2-3 parágrafos apresentando ela com base na história
- Método: 3 pilares do que ela faz diferente (título + parágrafo curto de cada)
- Público: pra quem o trabalho dela é ideal (3-5 bullets)
- FAQ: 5 perguntas comuns com respostas
- CTA final: chamada pra agendar

Responda APENAS com JSON válido:
{
  "hero": {
    "headline": "...",
    "subheadline": "...",
    "cta": "..."
  },
  "sobre": {
    "titulo": "...",
    "paragrafos": ["...", "...", "..."]
  },
  "metodo": {
    "titulo": "...",
    "pilares": [
      { "titulo": "...", "descricao": "..." },
      { "titulo": "...", "descricao": "..." },
      { "titulo": "...", "descricao": "..." }
    ]
  },
  "publico": {
    "titulo": "...",
    "items": ["...", "...", "...", "...", "..."]
  },
  "faq": [
    { "pergunta": "...", "resposta": "..." },
    { "pergunta": "...", "resposta": "..." },
    { "pergunta": "...", "resposta": "..." },
    { "pergunta": "...", "resposta": "..." },
    { "pergunta": "...", "resposta": "..." }
  ],
  "cta_final": {
    "titulo": "...",
    "subtitulo": "...",
    "botao": "..."
  }
}`;
}
