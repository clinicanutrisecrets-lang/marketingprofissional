"use server";

import { createClaude, CLAUDE_MODEL } from "@/lib/claude/client";

/**
 * Claude sugere tags pra um vídeo, dado um título descritivo.
 * Usado quando a nutri faz upload — preenche tags automático.
 */
export async function sugerirTagsParaVideo(
  titulo: string,
  descricao?: string,
): Promise<{ ok: boolean; tags?: string[]; erro?: string }> {
  try {
    const claude = createClaude();
    const response = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `Sugira 5 a 8 tags em português para um vídeo curto desse contexto:

Título: ${titulo}
${descricao ? `Descrição: ${descricao}` : ""}

Tags devem ser palavras simples e gerais, em minúsculas, sem acentos, que sirvam pra fazer match com temas de posts de nutricionista (ex: "cafe", "manha", "treino", "vegetais", "natureza").

Retorne APENAS um JSON array, nada mais:
["tag1", "tag2", "tag3", "tag4", "tag5"]`,
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return { ok: false, erro: "Sem resposta" };

    const cleaned = block.text
      .trim()
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    const tags = JSON.parse(cleaned) as string[];
    return { ok: true, tags };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
