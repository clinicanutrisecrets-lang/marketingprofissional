import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-sonnet-4-5";

export function createClaude() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
  return new Anthropic({ apiKey });
}

/**
 * Compliance CFN — regras que DEVEM estar em todo prompt de conteúdo.
 * Nutricionistas no Brasil são regulados pelo Conselho Federal de Nutrição
 * e qualquer copy que violar pode causar problema ético/legal.
 */
export const COMPLIANCE_CFN_BR = `
REGRAS DE COMPLIANCE OBRIGATÓRIAS (CFN - Brasil) - NÃO PODEM SER VIOLADAS:

1. NUNCA prometer cura de doenças. Nutrição auxilia, não cura.
2. NUNCA prescrever planos ou fórmulas específicas via post público (ex: "tome X de Y todo dia"). Avaliação individualizada é obrigatória.
3. NUNCA garantir resultados com prazo ("emagrece 5kg em 30 dias").
4. NUNCA usar termos como "milagroso", "definitivo", "100% garantido", "único método".
5. NUNCA apresentar antes/depois como promessa replicável.
6. SEMPRE deixar implícito que atendimento individualizado é necessário.
7. USAR linguagem de convite ("pode ajudar", "tem evidência de") em vez de imperativa ("resolve", "cura").
8. Se mencionar suplementação: sempre contextualizar que avaliação clínica é necessária.
9. Evitar comparações depreciativas com outros profissionais ou áreas.
10. Evitar termos médicos que só cabem em prescrição ("dose", "posologia").

VOCABULÁRIO COMERCIAL PROIBIDO (além das regras CFN):
- "protocolo" / "protocolos" — contradiz o diferencial de personalização da marca.
  Use no lugar: "sinergia", "sinergias nutricionais", "mapa metabólico",
  "personalização por DNA", "plano feito pra você", ou (contexto B2B)
  "investigação clínica", "raciocínio diagnóstico", "detetive da saúde".
- "dieta padrão", "dieta pronta", "dieta pré-montada", "cardápio pronto" — mesma razão.

Qualquer violação = post rejeitado automaticamente.
`.trim();
