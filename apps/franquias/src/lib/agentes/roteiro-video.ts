"use server";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

export type RoteiroVideo = {
  formato: "reels_15s" | "reels_30s" | "video_60s";
  duracao_segundos: number;
  hook: string;
  desenvolvimento: string[];
  cta_final: string;
  dicas_gravacao: string[];
  legenda_sugerida: string;
};

export type GerarRoteiroResult = {
  ok: boolean;
  roteiro?: RoteiroVideo;
  erro?: string;
};

export async function gerarRoteiroVideo(params: {
  nomeMarca: string;
  nicho: string;
  publicoAlvo: string;
  temaCriativo: string;
  objetivo: string;
  headline?: string;
  cidade?: string;
  historiaPessoal?: string;
}): Promise<GerarRoteiroResult> {
  const systemPrompt = `
Você é roteirista de vídeos para anúncios no Instagram/Facebook — especializado em nutrição clínica no Brasil.

Crie roteiros curtos, diretos e persuasivos para Reels ou vídeos de 15s, 30s ou 60s.

REGRAS DE COMPLIANCE CFN (OBRIGATÓRIO):
- PROIBIDO prometer cura de doenças
- PROIBIDO dizer "emagreça X kg em Y dias"
- PROIBIDO usar "milagre", "definitivo", "100% garantido"
- PROIBIDO mostrar antes/depois com prazo definido
- OBRIGATÓRIO sugerir avaliação individualizada
- PERMITIDO falar sobre bem-estar, hábitos saudáveis, educação nutricional

ESTRUTURA DO ROTEIRO:
1. Hook (primeiros 3 segundos — decide se o usuário para ou não)
2. Desenvolvimento (problema → solução → prova)
3. CTA final (claro e direto)

FORMATO DE SAÍDA: JSON válido, schema abaixo.
Schema:
{
  "formato": "reels_15s" | "reels_30s" | "video_60s",
  "duracao_segundos": number,
  "hook": "frase exata de abertura do vídeo (máx 10 palavras)",
  "desenvolvimento": ["frase 1", "frase 2", "..."],
  "cta_final": "chamada final de ação (máx 15 palavras)",
  "dicas_gravacao": ["dica 1", "dica 2", "dica 3"],
  "legenda_sugerida": "legenda completa com emojis pra post (máx 200 chars)"
}

Escolha o formato baseado no tema:
- Dicas rápidas → reels_15s
- Storytelling breve → reels_30s
- Explicação mais detalhada → video_60s

Apenas JSON. Nada mais.
`.trim();

  const userMsg = [
    `Nome da marca: ${params.nomeMarca}`,
    `Nicho: ${params.nicho}`,
    `Público-alvo: ${params.publicoAlvo}`,
    `Tema/ângulo do criativo: ${params.temaCriativo}`,
    `Objetivo: ${params.objetivo}`,
    params.headline ? `Headline de referência: ${params.headline}` : null,
    params.cidade ? `Cidade: ${params.cidade}` : null,
    params.historiaPessoal ? `História pessoal da nutri: ${params.historiaPessoal}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  let responseText: string;
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    });
    const block = resp.content[0];
    if (!block || block.type !== "text") {
      return { ok: false, erro: "Resposta inesperada do modelo" };
    }
    responseText = block.text;
  } catch (e) {
    return { ok: false, erro: `Claude: ${e instanceof Error ? e.message : String(e)}` };
  }

  let roteiro: RoteiroVideo;
  try {
    const jsonLimpo = responseText
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    roteiro = JSON.parse(jsonLimpo);
  } catch {
    return { ok: false, erro: `JSON inválido: ${responseText.slice(0, 300)}` };
  }

  return { ok: true, roteiro };
}
