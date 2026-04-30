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
 *
 * Atualizado pra Resolução CFN nº 856 de 25/04/2026 (publicada DOU 28/04/2026).
 * Vigência: 90 dias após publicação ≈ 28/07/2026.
 * Mantemos as regras já vigentes da CFN 599/2018 e adicionamos as novas
 * (IA, antes/depois, publicidade de marcas).
 */
export const COMPLIANCE_CFN_BR = `
REGRAS DE COMPLIANCE OBRIGATÓRIAS (CFN — Brasil) — NÃO PODEM SER VIOLADAS:

== CFN 599/2018 (regras já vigentes) ==
1. NUNCA prometer cura de doenças. Nutrição auxilia, não cura.
2. NUNCA prescrever planos/fórmulas específicas em post público (ex: "tome X de Y todo dia"). Avaliação individualizada é obrigatória.
3. NUNCA garantir resultados com prazo ("emagrece 5kg em 30 dias").
4. NUNCA usar "milagroso", "definitivo", "100% garantido", "único método".
5. NUNCA apresentar antes/depois como promessa replicável.
6. SEMPRE deixar implícito que atendimento individualizado é necessário.
7. USAR linguagem de convite ("pode ajudar", "há evidência de") em vez de imperativa ("resolve", "cura").
8. Suplementação: sempre contextualizar que avaliação clínica é necessária.
9. Evitar comparações depreciativas com outros profissionais ou áreas.
10. Evitar termos médicos que só cabem em prescrição ("dose", "posologia").

== CFN 856/2026 (novas — vigência 28/07/2026, mas já adotamos) ==
11. PROIBIDO simular resultados clínicos via IA. Não criar/manipular/divulgar imagens, vídeos ou áudios gerados por IA que simulem PESSOAS REAIS ou RESULTADOS CLÍNICOS de modo a induzir ao erro, sensacionalismo ou promessa de resultado (deepfakes, antes/depois fictícios etc.).
12. PROIBIDO publicar antes/depois de pacientes — mesmo com consentimento. Idem composição corporal, exames, medidas de pacientes em redes sociais.
13. PROIBIDO indicar/prescrever/manifestar preferência ou associar imagem da nutri a marcas de alimentos, bebidas, suplementos alimentares, fitoterápicos e similares (presencial, telenutrição ou redes sociais).
14. OBRIGATÓRIO informar quando o conteúdo foi produzido com auxílio de IA. Quando publicarmos arte/copy gerada por IA, incluir aviso discreto ("imagem ilustrativa gerada por IA" / "texto produzido com auxílio de IA") quando aplicável.
15. IA não substitui profissional na interação direta com paciente — não automatize prescrição/diagnóstico via DM.

== VOCABULÁRIO COMERCIAL PROIBIDO ==
- "protocolo" / "protocolos" — contradiz o diferencial de personalização.
  Use: "sinergia", "sinergias nutricionais", "mapa metabólico",
  "personalização por DNA", "plano feito pra você", ou (B2B)
  "investigação clínica", "raciocínio diagnóstico", "detetive da saúde".
- "dieta padrão", "dieta pronta", "dieta pré-montada", "cardápio pronto" — idem.

== ARTE GERADA POR IA — restrições adicionais ==
- NUNCA gerar pessoas em pose/contexto que sugira "resultado de tratamento" (corpo emagrecido com numero, antes/depois lado-a-lado, balança com numero).
- NUNCA gerar pessoas reconhecíveis (deepfakes ou semelhança a pessoa real).
- Pessoas geradas devem aparecer em contextos NEUTROS (consultório, fala em câmera, alimentação saudável genérica, contemplação) — sem promessa de resultado.
- Preferir cenas SEM pessoas: alimentos, gráficos, ícones, ambientes, texturas, paisagens.

Qualquer violação = post rejeitado automaticamente.
`.trim();
