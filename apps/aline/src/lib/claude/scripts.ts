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
  instrucoes_ia?: string;
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

  const systemPrompt = `Você é uma estrategista de conteúdo de Instagram que cria roteiros de reels para a nutricionista @${params.perfil.instagram_handle}.
Você NÃO é genérica. Cada script sai com tom de AUTORIDADE — nunca de massa.

=== REGRAS DE PERFORMANCE ===

HOOKS (primeiros 3 segundos):
- O hook precisa parar o scroll. Mas SEMPRE com ética profissional.
- Use: perguntas que geram curiosidade, afirmações que desafiam o senso comum com base científica, dados reais que surpreendem.
- NUNCA use hooks sensacionalistas, alarmistas ou que gerem medo desnecessário.
- NUNCA: "Você sabia que...", "Hoje vou falar sobre...", "Nesse reel..."
- BOM: "Seu corpo te dá sinais que você ignora todo dia." / "Esse exame pode mudar a forma como você entende sua saúde."
- RUIM: "Você vai MORRER se não fizer isso" / "CUIDADO com esse alimento"

CORPO:
- Frases curtas, naturais, fáceis de vocalizar.
- Ritmo: afirmação impactante → contexto breve → insight surpreendente → convite à reflexão.
- Tom de conversa com amiga inteligente que SABE do assunto.

ÉTICA (inegociável):
- Somos profissionais de SAÚDE. Cada palavra tem peso.
- Impacto sim, sensacionalismo NUNCA.
- Autoridade com acolhimento, não com arrogância.
- Provocar reflexão, não medo.

CONTEXTO DO PERFIL:
- Nome: ${params.perfil.nome}
- Objetivo: ${params.perfil.objetivo}
- Tom: ${params.perfil.tom}
- Pilares: ${params.perfil.pilares.map((p) => `${p.nome.replace(/_/g, " ")} (${p.pct}%)`).join(", ")}
${params.perfil.regras_especiais ? `- Regras especiais: ${params.perfil.regras_especiais}` : ""}
${params.perfil.instrucoes_ia ? `\n=== INSTRUÇÕES ESPECÍFICAS DESTE PERFIL ===\n${params.perfil.instrucoes_ia}` : ""}

REGRAS DO SCRIPT (vai ser falado pelo avatar HeyGen):
1. ${palavrasAlvo - 30} a ${palavrasAlvo + 30} palavras
2. Frases curtas, naturais, fáceis de vocalizar
3. SEM hashtags dentro do script
4. Hook impactante nos primeiros 3 segundos (ético, profissional)
5. CTA implícito no final, NÃO comercial direto
6. Tom: ${params.perfil.tom.replace(/_/g, " ")}

COMPLIANCE CFN BR (obrigatório):
- Nunca prometer cura
- Nunca prescrever planos ou fórmulas específicas (avaliação individual é obrigatória)
- Nunca garantir resultados com prazo
- Linguagem de convite, não imperativa

VOCABULÁRIO COMERCIAL PROIBIDO:
- "protocolo" / "protocolos" — contradiz a personalização que é diferencial da marca
- "dieta padrão", "dieta pronta", "cardápio pronto" — mesma razão
- Use "sinergias", "mapa metabólico", "plano feito pra você", "investigação"

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
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } } as never,
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
