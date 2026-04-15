import { createClaude, CLAUDE_MODEL } from "@/lib/claude/client";

export type SinalBruto = {
  fonte: string;
  tema: string;
  resumo?: string;
  url?: string;
};

export type TendenciaClassificada = {
  fonte: string;
  tema: string;
  resumo: string;
  relevancia_icp: number; // 1-10
  angulo_sugerido: string;
  hashtags_sugeridas: string[];
  url_referencia?: string;
};

const ICP_DESC = `PERFIL DO PÚBLICO-ALVO (ICP):
- Mulheres 35-60 anos, alto poder aquisitivo
- Pagam R$ 1.800 em exame laboratorial avançado
- Pagam R$ 650 em consulta
- Interesse em SAÚDE INTEGRATIVA, MEDICINA FUNCIONAL, nutrição baseada em ciência
- Temas que atraem: hormônios, longevidade, fertilidade, tireoide, microbiota, autoimunidade, inflamação crônica, cortisol, insulina, prevenção real (não dieta da moda)
- Temas que REPELEM: emagrecimento milagroso, Ozempic como atalho, receitas fitness bobas, detox caseiro, "10 mil passos", calorias vazias.

Temas de alta prioridade (10):
- Estudos novos sobre longevidade, hormônios, inflamação
- Nutrição baseada em ciência recente
- Crítica a mitos da mídia popular
- Exames preventivos avançados (o que não se vê no básico)

Temas de baixa prioridade (1-3):
- Dieta da moda (cetogênica, low-carb genérico, jejum sem contexto)
- Receitas simples sem embasamento
- Celebridade que emagreceu`;

const SYSTEM_PROMPT = `Você é um analista de conteúdo pra uma plataforma de marketing de nutricionistas especializadas em saúde integrativa.

Seu trabalho: receber uma LISTA de sinais externos (buscas em alta, notícias, hashtags) e classificar cada um de acordo com relevância pro ICP abaixo.

${ICP_DESC}

Retorne SOMENTE um JSON array. Cada item deve ter:
{
  "fonte": string,
  "tema": string (reformulado, atrativo pro ICP),
  "resumo": string (1-2 frases, o que o post poderia abordar),
  "relevancia_icp": number (1-10),
  "angulo_sugerido": string (curto, uma linha, tipo "mito_vs_verdade" ou "educativo_ciencia"),
  "hashtags_sugeridas": array de strings (3-5),
  "url_referencia"?: string
}

Filtre RIGOROSAMENTE. É melhor retornar 5 temas ótimos do que 20 fracos.
Descarte qualquer coisa que seja emagrecimento mirabolante, Ozempic, dieta da moda, ou celebridade.
Só retorne itens com relevancia_icp >= 6.`;

export async function classificarSinais(
  sinais: SinalBruto[],
): Promise<TendenciaClassificada[]> {
  if (sinais.length === 0) return [];

  const claude = createClaude();

  const userPrompt = `Aqui estão ${sinais.length} sinais externos coletados hoje. Classifique:

${sinais
  .map(
    (s, i) =>
      `${i + 1}. [${s.fonte}] ${s.tema}${s.resumo ? ` — ${s.resumo}` : ""}${s.url ? ` (${s.url})` : ""}`,
  )
  .join("\n")}`;

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return [];

  try {
    const cleaned = block.text
      .trim()
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as TendenciaClassificada[];
    return parsed.filter((t) => t.relevancia_icp >= 6);
  } catch (e) {
    console.warn("[classifier] JSON invalido:", e);
    return [];
  }
}
