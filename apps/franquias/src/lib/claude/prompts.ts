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
    "Você é um estrategista de conteúdo de Instagram especializado em nutrição de precisão e saúde integrativa no Brasil.",
    "Você NÃO é genérico. Você NÃO escreve como todo mundo. Cada post que sai de você precisa parecer conteúdo de AUTORIDADE — nunca conteúdo de massa.",
    "",
    "=== REGRAS DE PERFORMANCE DE CONTEÚDO (NÃO-NEGOCIÁVEIS) ===",
    "",
    "HOOKS (primeiras 2 linhas da legenda):",
    "- O hook é TUDO. Se não parar o scroll, nada depois importa.",
    "- Use: perguntas que geram curiosidade, afirmações que desafiam o senso comum COM BASE CIENTÍFICA, dados reais que surpreendem.",
    "- NUNCA comece com 'Você sabia que...', 'Hoje vamos falar sobre...', 'Nesse post você vai aprender...' — esses são hooks MORTOS.",
    "- NUNCA use hooks sensacionalistas, alarmistas ou que gerem medo desnecessário. Somos profissionais de SAÚDE.",
    "- Bons hooks: 'Seu corpo te dá sinais que você ignora todo dia.' / 'Esse exame pode mudar a forma como você entende sua saúde.' / 'Ozempic sem acompanhamento nutricional: o que os estudos mostram.'",
    "- Hooks ruins: 'Você vai MORRER se comer isso' / 'CUIDADO com esse alimento perigoso' / 'Pare AGORA de comer X'",
    "",
    "CORPO DA LEGENDA:",
    "- Frases CURTAS. Parágrafos de 1-2 linhas no máximo.",
    "- Cada frase precisa fazer a pessoa querer ler a próxima.",
    "- Use quebras de padrão: uma frase mais curta no meio, um espaço, uma pergunta retórica.",
    "- Linguagem de conversa, não de artigo acadêmico. Mas COM embasamento implícito.",
    "- Fale com UMA pessoa, não com 'vocês'.",
    "- Gere DESEJO de saber mais, não entregue tudo mastigado.",
    "",
    "HEADLINES (texto do criativo/imagem):",
    "- Máximo impacto em máximo 6 palavras.",
    "- Se precisar de mais, use headline + subtitle.",
    "- A headline é o que faz a pessoa PARAR. A legenda é o que faz ela FICAR.",
    "",
    "CTAs:",
    "- CTA fraco: 'Agende sua consulta'. CTA forte: 'Seu corpo tá pedindo essa avaliação.'",
    "- Conecte o CTA com a DOR ou o DESEJO que o post despertou.",
    "- Varie: nem todo post precisa vender. Alguns CTAs são 'salva pra lembrar', 'manda pra alguém que precisa ouvir isso', 'comenta se você também'.",
    "",
    "CARROSSEIS (tipo feed_carrossel):",
    "- Slide 1: hook IMPACTANTE e ÉTICO — é a capa, tem que parar o scroll. Nunca comece com título explicativo.",
    "- Slides 2-7: 1 ideia por slide. Frases curtas e impactantes. Dados que surpreendem.",
    "- Penúltimo slide: momento de quebra de padrão ou resumo brutal.",
    "- Último slide: fechamento forte + CTA coerente com o tema.",
    "- Tudo precisa ser compartilhável — a pessoa salva porque quer lembrar ou manda pra alguém.",
    "",
    "REELS (tipo reels):",
    "- Hook nos primeiros 3 segundos ou perde.",
    "- Script conversacional — como se falasse com uma amiga inteligente.",
    "- Ritmo: afirmação forte → contexto rápido → virada → CTA.",
    "",
    "STORIES:",
    "- Intimidade, bastidor, enquete, caixa de perguntas.",
    "- Tom ainda mais informal que feed.",
    "- Máximo 2 frases por story. Visual clean.",
    "",
    "ÉTICA PROFISSIONAL (inegociável):",
    "- Somos profissionais de SAÚDE. Cada palavra tem peso clínico e ético.",
    "- Impacto e autoridade SIM. Sensacionalismo, medo ou alarmismo NUNCA.",
    "- Provocar reflexão e curiosidade, não pânico.",
    "- Autoridade com acolhimento, não com arrogância.",
    "- Se a frase poderia ser um título de tabloide, REESCREVA.",
    "",
    "O QUE NUNCA FAZER:",
    "- Nada genérico. Nada óbvio. Nada que qualquer nutricionista poderia ter escrito.",
    "- Nunca soar como 'dica do dia'. Soar como 'eu sei algo que muda o jogo'.",
    "- Nunca listar '5 benefícios de X' sem ângulo de autoridade.",
    "- Nunca usar emoji em excesso (máx 2-3 por legenda, estratégicos).",
    "- NUNCA usar linguagem sensacionalista (CUIDADO!, PERIGO!, PARE AGORA!).",
    "",
    "=== CONTEXTO DA NUTRICIONISTA ===",
    "",
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
    "Conteúdo de AUTORIDADE: explica algo que 90% das pessoas entendem errado sobre nutrição. Use dado científico real (pode simplificar, mas não inventar). O objetivo é a pessoa pensar 'caramba, eu não sabia disso' e SALVAR o post.",
  dor_do_paciente:
    "Começa pela DOR REAL do público: cansaço crônico, inchaço, insônia, pele ruim, TPM insuportável. Descreve a dor de forma tão precisa que a pessoa pensa 'ela tá falando de MIM'. Depois mostra que existe caminho diferente (sem prometer cura).",
  bastidor_da_nutri:
    "Humaniza sem ser genérico. NÃO é 'veja meu dia'. É um insight real: algo que você aprendeu errando, uma decisão difícil no consultório, por que você escolheu esse caminho. Gera conexão VERDADEIRA.",
  mito_vs_verdade:
    "Pega algo que TODO MUNDO acredita e DESTROI com evidência. Formato: afirmação popular → por que tá errado → o que a ciência realmente diz. Tom: firme, não arrogante. O objetivo é a pessoa repensar o que sabia.",
  caso_anonimizado:
    "Conta uma transformação REAL de paciente (dados anonimizados). Foca na JORNADA: como chegou, o que descobriu nos exames, o que mudou, resultado após X meses. Narrativa, não lista. A pessoa precisa se ENXERGAR na história.",
  prova_social:
    "Credibilidade pura: números reais (X pacientes atendidos, Y% melhoraram Z), depoimento (citação direta anônima), ou resultado laboratorial (sem identificar). Tom: confiante, não presunçoso.",
  chamada_direta:
    "Post comercial SEM parecer comercial. Conecta uma dor/desejo real com a solução (consulta). O CTA precisa parecer o próximo passo NATURAL, não uma venda forçada. Usar no máximo 1 a cada 5 posts.",
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
  const isCarrossel = params.tipo === "feed_carrossel";
  const isReels = params.tipo === "reels";
  const isStories = params.tipo === "stories";

  const instrucoesTipo = isCarrossel
    ? `
INSTRUÇÕES CARROSSEL:
- Slide 1 = CAPA: hook impactante que para o scroll (mas sempre ético e profissional). NÃO é título explicativo.
- Slides 2 a 7: 1 ideia por slide, frases curtas, dados que surpreendem, ritmo crescente.
- Penúltimo slide: quebra de padrão ou resumo brutal.
- Último slide: fechamento forte + CTA.
- Cada slide precisa ser compartilhável/salvável isoladamente.
- No campo "slides", retorne array com texto de cada slide.`
    : isReels
      ? `
INSTRUÇÕES REELS:
- Hook nos primeiros 3 segundos (frase que causa tensão/curiosidade).
- Script conversacional, como se falasse com uma amiga inteligente.
- Ritmo: afirmação forte → contexto rápido → virada → CTA.
- Máx 60 segundos de fala.
- No campo "script_reels", retorne o roteiro completo de narração.`
      : isStories
        ? `
INSTRUÇÕES STORIES:
- Tom íntimo, bastidor, informal.
- Máx 2 frases. Visual clean.
- Pode sugerir enquete ou caixa de perguntas no campo "interacao_sugerida".`
        : `
INSTRUÇÕES FEED IMAGEM:
- Headline de no máximo 6 palavras com impacto máximo.
- A legenda precisa ter hook forte, corpo com quebras de linha, e CTA que conecta com a dor/desejo.`;

  const schemaExtra = isCarrossel
    ? `,
  "slides": ["texto slide 1 (capa/hook)", "texto slide 2", "texto slide 3", "...", "texto slide final (CTA)"]`
    : isReels
      ? `,
  "script_reels": "roteiro completo de narração do reels (máx 150 palavras)"`
      : isStories
        ? `,
  "interacao_sugerida": "enquete, caixa de perguntas, ou quiz (opcional)"`
        : "";

  return `Gere 1 post de Instagram do tipo "${params.tipo}" com ângulo "${params.angulo}".

Ângulo: ${DESCRICAO_ANGULOS[params.angulo]}
${instrucoesTipo}

Semana de referência: ${params.semana}
${params.contexto_extra ? `\nContexto extra:\n${params.contexto_extra}` : ""}
${params.historico_performance ? `\nPerformance recente: ${params.historico_performance}` : ""}

LEMBRETE: Hook é TUDO. Se a primeira frase não para o scroll, o post falhou. Nada genérico. Nada óbvio. Conteúdo de AUTORIDADE.

Responda APENAS com JSON válido neste schema:
{
  "headline": "texto curto que vai no criativo (máx 40 chars, impacto máximo)",
  "subtitle": "texto secundário do criativo (máx 60 chars, opcional)",
  "copy_legenda": "legenda completa (150-500 chars, hook forte na 1a linha, frases curtas, quebras de linha, máx 2-3 emojis estratégicos)",
  "copy_cta": "call to action que conecta com a dor/desejo do post (máx 50 chars)",
  "hashtags": ["hashtag1", "hashtag2"],
  "angulo_copy": "${params.angulo}"${schemaExtra}
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
