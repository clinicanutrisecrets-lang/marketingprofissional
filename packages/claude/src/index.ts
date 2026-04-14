import Anthropic from "@anthropic-ai/sdk";

/**
 * Cliente Claude com prompt caching habilitado por padrão.
 * Cache reduz custo de contexto repetido em ~90%.
 */
export function createClaude(apiKey: string = process.env.ANTHROPIC_API_KEY!) {
  return new Anthropic({ apiKey });
}

export const MODEL_SONNET = "claude-sonnet-4-5";

/**
 * Compliance CFN (Conselho Federal de Nutricionistas) — regra dura
 * que DEVE estar em TODO prompt de geração de copy no Brasil.
 */
export const COMPLIANCE_CFN_BR = `
REGRAS DE COMPLIANCE OBRIGATÓRIAS (CFN — Brasil):

1. NUNCA prometer cura de doenças. Nutrição auxilia, não cura.
2. NUNCA prescrever protocolos específicos via post público.
3. NUNCA garantir resultados ("vai emagrecer X kg", "vai se livrar de").
4. NUNCA usar termos como "milagroso", "definitivo", "100% garantido".
5. NUNCA usar antes/depois com prazo determinado como promessa.
6. SEMPRE deixar implícito que atendimento individualizado é necessário.
7. EVITAR afirmações absolutas sobre resultados clínicos sem referência.
8. USAR linguagem de convite ("pode ajudar", "tem evidência de") em vez
   de imperativa ("vai resolver", "é a solução").
9. Se for conteúdo sobre suplementação: sempre contextualizar que
   avaliação individualizada é necessária.
10. Evitar comparações depreciativas com outros profissionais.

Qualquer violação = post rejeitado automaticamente.
`.trim();

/**
 * Helper para montar systemPrompt com caching.
 * Parte estática (contexto + compliance) fica cached.
 */
export function buildCachedSystem(staticContext: string) {
  return [
    {
      type: "text" as const,
      text: `${staticContext}\n\n${COMPLIANCE_CFN_BR}`,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}
