import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_BASE = `
Você é roteirista de storytelling especializado em saúde e nutrição — conteúdo que prende, convence e dá vontade de compartilhar. Público premium (mulheres 30-55, ticket R$ 500-3.000 em consultas e testes).

Regras duras:
- Compliance CFN: nenhuma promessa de cura, sem antes/depois com prazo, sem dados de peso/medida explícitos ("perdeu 10kg em 30 dias" ← proibido). Use linguagem de transformação qualitativa ("recuperou energia", "entendeu o próprio corpo", "parou de sofrer com inchaço").
- Anonimização obrigatória em caso de paciente (Marina, 42 — sem sobrenome, sem dado identificável).
- Tom humano. Zero linguagem motivacional genérica. Frases visuais. Tensão real. Linguagem de livro, não de folheto.
- Quando sugerir imagem/visual, descreva em 1 linha (vai virar prompt do agente de imagem).

VOCABULÁRIO COMERCIAL PROIBIDO (além das regras CFN):
- NUNCA "protocolo" / "protocolos" — contradiz personalização da marca
- NUNCA "dieta padrão", "dieta pronta", "cardápio pronto"
- Use: "sinergias", "mapa metabólico", "plano personalizado", "investigação"

Saída: APENAS JSON válido.
`.trim();

export type ModoStorytelling = "6a_depoimento" | "6b_publico_se_ve" | "6c_ideia_historia";

const SCHEMAS: Record<ModoStorytelling, string> = {
  "6a_depoimento": `
Transforme um case/depoimento real em narrativa compartilhável. Input: { quem_era, problema_inicial, ponto_ruptura, solucao_aplicada, resultado, objecoes_relatadas }. Output JSON:
{
  "arco": {
    "antes": "1-2 frases — situação inicial, respeitando anonimato",
    "ponto_ruptura": "o momento em que ela decidiu agir",
    "processo": "o caminho sem romantização, com texturas reais",
    "depois": "transformação qualitativa (sem números de peso/medida)",
    "frase_impacto": "uma frase curta, visual, memorável",
    "cta": "convite leve pra conversar/agendar"
  },
  "versao_post_longo": "legenda Instagram 1200-2000 chars, respeitando o arco",
  "versao_post_curto": "legenda 400-600 chars pra feed/carrossel",
  "versao_reels_script": "roteiro 45-60s, 1ª pessoa da nutri falando ou narrador",
  "versao_ad_125chars": "copy primary text Meta (máx 125 chars) + headline (máx 40 chars)",
  "descricao_visual": "1 frase descrevendo imagem/cenário ideal",
  "alertas_compliance": ["cuidados específicos (ex: 'nunca usar palavra X')"]
}
`.trim(),
  "6b_publico_se_ve": `
Reescreva uma ideia/tema como história onde o leitor se reconhece. Input: { dor, desejo, publico, transformacao, formato_saida }. Output JSON:
{
  "personagem": "arquétipo do público (sem nome real)",
  "conflito": "o que ela vive por dentro que ninguém vê",
  "pensamento_interno": "voz mental típica — frases que ela pensa ao acordar",
  "momento_virada": "o que faz ela questionar o caminho atual",
  "final_com_insight": "a realização sem prescrever ou prometer",
  "versao_post": "legenda 800-1200 chars",
  "versao_reels_script": "roteiro 30-45s, 2ª pessoa ('você')",
  "descricao_visual": "1 frase descrevendo imagem/cenário"
}
`.trim(),
  "6c_ideia_historia": `
Transforme ideia bruta em história curta com arco. Input: { tema, mensagem, publico, duracao_alvo }. Output JSON:
{
  "contexto": "onde/quando — micro-cena concreta",
  "conflito": "o problema no centro da cena",
  "curiosidade": "gancho que faz continuar",
  "climax": "virada na história",
  "moral": "mensagem sem moralismo barato",
  "cta": "ação sugerida",
  "versao_post": "legenda 600-900 chars",
  "versao_reels_script": "roteiro conforme duracao_alvo",
  "descricao_visual": "1 frase"
}
`.trim(),
};

export type InputStorytelling = {
  franqueadaId: string;
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
  const admin = createAdminClient();

  const { data: franq } = await admin
    .from("franqueadas")
    .select("nome_comercial, nicho_principal, tom_comunicacao, publico_alvo_descricao, palavras_evitar")
    .eq("id", params.franqueadaId)
    .maybeSingle();
  if (!franq) return { ok: false, erro: "Franqueada não encontrada" };

  const systemText = `${SYSTEM_BASE}\n\n=== CONTEXTO DA NUTRI ===\n${JSON.stringify(franq, null, 2)}\n\n=== MODO: ${params.modo} ===\n${SCHEMAS[params.modo]}`;
  const userMsg = `Dados:\n${JSON.stringify(params.input, null, 2)}\n\nEntregue o JSON conforme schema do modo ${params.modo}.`;

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

  const { data: salvo, error: saveErr } = await admin
    .from("storytellings_gerados")
    .insert({
      franqueada_id: params.franqueadaId,
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
