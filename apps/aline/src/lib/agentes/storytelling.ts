import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAlineClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_BASE = `
Você é roteirista de storytelling especializado em saúde, nutrição e medicina de precisão — conteúdo que prende, convence e dá vontade de compartilhar.

Regras duras:
- Compliance CFN quando o perfil é de nutricionista: sem promessa de cura, sem antes/depois com prazo, sem peso/medida explícitos. Transformação qualitativa.
- Anonimização obrigatória em caso de paciente.
- Tom humano. Zero motivacional barato. Frases visuais. Tensão real.
- Respeite tom declarado do perfil e regras especiais.
- Ao sugerir imagem, descreva em 1 linha (vai virar prompt do agente de imagem).

VOCABULÁRIO COMERCIAL PROIBIDO:
- NUNCA "protocolo" / "protocolos"
- NUNCA "dieta padrão", "cardápio pronto"
- @nutrisecrets: use "sinergias", "mapa metabólico", "plano personalizado"
- @scannerdasaude: use "detetive da saúde", "investigação", "raciocínio clínico"

Saída: APENAS JSON válido.
`.trim();

export type ModoStorytelling = "6a_depoimento" | "6b_publico_se_ve" | "6c_ideia_historia";

const SCHEMAS: Record<ModoStorytelling, string> = {
  "6a_depoimento": `
Input: { quem_era, problema_inicial, ponto_ruptura, solucao_aplicada, resultado, objecoes_relatadas }. Output JSON:
{
  "arco": { "antes": "", "ponto_ruptura": "", "processo": "", "depois": "", "frase_impacto": "", "cta": "" },
  "versao_post_longo": "legenda 1200-2000 chars",
  "versao_post_curto": "legenda 400-600 chars",
  "versao_reels_script": "roteiro 45-60s",
  "versao_ad_125chars": "primary text até 125 chars + headline até 40 chars",
  "descricao_visual": "1 frase",
  "alertas_compliance": []
}`.trim(),
  "6b_publico_se_ve": `
Input: { dor, desejo, publico, transformacao }. Output JSON:
{
  "personagem": "", "conflito": "", "pensamento_interno": "", "momento_virada": "", "final_com_insight": "",
  "versao_post": "800-1200 chars", "versao_reels_script": "30-45s 2ª pessoa",
  "descricao_visual": ""
}`.trim(),
  "6c_ideia_historia": `
Input: { tema, mensagem, publico, duracao_alvo }. Output JSON:
{
  "contexto": "", "conflito": "", "curiosidade": "", "climax": "", "moral": "", "cta": "",
  "versao_post": "600-900 chars", "versao_reels_script": "conforme duracao_alvo",
  "descricao_visual": ""
}`.trim(),
};

export type InputStorytelling = {
  perfilSlug: string;
  modo: ModoStorytelling;
  depoimentoId?: string;
  input: Record<string, unknown>;
};

export type ResultStorytelling = {
  ok: boolean;
  storytellingId?: string;
  output?: Record<string, unknown>;
  erro?: string;
};

export async function executarStorytelling(
  params: InputStorytelling,
): Promise<ResultStorytelling> {
  const aline = createAlineClient();

  const { data: p } = await aline
    .from("perfis")
    .select("id, nome, objetivo, tom, pilares, regras_especiais, nicho_principal, publico_alvo, palavras_evitar")
    .eq("slug", params.perfilSlug)
    .maybeSingle();
  if (!p) return { ok: false, erro: "Perfil não encontrado" };

  const perfilRow = p as Record<string, unknown>;
  const perfilId = perfilRow.id as string;

  const systemText = `${SYSTEM_BASE}\n\n=== PERFIL ===\n${JSON.stringify(perfilRow, null, 2)}\n\n=== MODO: ${params.modo} ===\n${SCHEMAS[params.modo]}`;
  const userMsg = `Dados:\n${JSON.stringify(params.input, null, 2)}\n\nEntregue JSON conforme schema do modo ${params.modo}.`;

  const inicio = Date.now();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let responseText: string;
  let usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number };

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMsg }],
    });
    const block = resp.content[0];
    if (!block || block.type !== "text") return { ok: false, erro: "Resposta inesperada" };
    responseText = block.text;
    usage = {
      input_tokens: resp.usage.input_tokens,
      output_tokens: resp.usage.output_tokens,
      cache_read_input_tokens: resp.usage.cache_read_input_tokens ?? 0,
    };
  } catch (e) {
    return { ok: false, erro: `Claude: ${e instanceof Error ? e.message : String(e)}` };
  }

  const latencia = Date.now() - inicio;

  let parsed: Record<string, unknown>;
  try {
    const jsonLimpo = responseText
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(jsonLimpo);
  } catch {
    return { ok: false, erro: `JSON inválido: ${responseText.slice(0, 300)}` };
  }

  const custoUsd =
    (usage.input_tokens * 3) / 1_000_000 + (usage.output_tokens * 15) / 1_000_000;

  const { data: salvo, error: saveErr } = await aline
    .from("storytellings_gerados")
    .insert({
      perfil_id: perfilId,
      depoimento_id: params.depoimentoId ?? null,
      modo: params.modo,
      input: params.input,
      output: parsed,
      versao_post_longo: (parsed.versao_post_longo as string) ?? (parsed.versao_post as string) ?? null,
      versao_post_curto: (parsed.versao_post_curto as string) ?? null,
      versao_reels_script: (parsed.versao_reels_script as string) ?? null,
      versao_ad_125: (parsed.versao_ad_125chars as string) ?? null,
      ia_modelo: MODEL,
      ia_tokens_input: usage.input_tokens,
      ia_tokens_output: usage.output_tokens,
      ia_tokens_cached: usage.cache_read_input_tokens ?? 0,
      ia_custo_usd: custoUsd,
      latencia_ms: latencia,
      status: "novo",
    })
    .select("id")
    .single();

  if (saveErr) return { ok: false, erro: saveErr.message };
  return { ok: true, storytellingId: (salvo as { id: string }).id, output: parsed };
}
