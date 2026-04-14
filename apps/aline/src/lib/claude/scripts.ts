import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-sonnet-4-5";

export function createClaude() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
  return new Anthropic({ apiKey });
}

export type Perfil = {
  slug: string;
  nome: string;
  instagram_handle: string;
  objetivo: string;
  tom: string;
  pilares: Array<{ nome: string; pct: number }>;
  regras_especiais?: string;
};

/**
 * Gera script otimizado pra reel com avatar.
 * Restrição importante: 30-90 segundos = 70-200 palavras.
 * Tom natural pra falar (sem #hashtag dentro do script).
 */
export async function gerarScriptReel(params: {
  perfil: Perfil;
  briefing: string;
  duracaoSeg?: number;
}): Promise<{
  titulo: string;
  script: string;
  cta_legenda: string;
  hashtags: string[];
}> {
  const claude = createClaude();
  const palavrasAlvo = Math.round((params.duracaoSeg ?? 60) * 2.5);

  const systemPrompt = `Você cria roteiros de reels para Instagram da nutricionista @${params.perfil.instagram_handle}.

CONTEXTO DO PERFIL:
- Nome: ${params.perfil.nome}
- Objetivo: ${params.perfil.objetivo}
- Tom: ${params.perfil.tom}
- Pilares: ${params.perfil.pilares.map((p) => `${p.nome.replace(/_/g, " ")} (${p.pct}%)`).join(", ")}
${params.perfil.regras_especiais ? `- Regras especiais: ${params.perfil.regras_especiais}` : ""}

REGRAS DO SCRIPT (vai ser falado pelo avatar HeyGen):
1. ${palavrasAlvo - 30} a ${palavrasAlvo + 30} palavras
2. Frases curtas, naturais, fáceis de vocalizar
3. SEM hashtags dentro do script
4. Hook forte nos primeiros 3 segundos
5. CTA implícito no final, NÃO comercial direto
6. Tom: ${params.perfil.tom.replace(/_/g, " ")}

COMPLIANCE CFN BR (obrigatório):
- Nunca prometer cura
- Nunca prescrever protocolo específico
- Nunca garantir resultados com prazo
- Linguagem de convite, não imperativa

Retorne APENAS JSON válido, sem markdown:
{
  "titulo": "título curto pro post (max 60 chars)",
  "script": "texto que o avatar fala (palavra por palavra, sem direção de cena)",
  "cta_legenda": "CTA pra colar no final da legenda do post",
  "hashtags": ["hash1", "hash2", ...]
}`;

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `Briefing pro reel: "${params.briefing}"\n\nGere o script.`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude sem resposta");

  const cleaned = block.text
    .trim()
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}
