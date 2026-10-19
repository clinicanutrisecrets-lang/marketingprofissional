import "server-only";
import sharp from "sharp";
import { createClaude, CLAUDE_MODEL_AGENTES } from "@/lib/claude/client";
import { validarOlhar, type OlharArte } from "./regras";

/**
 * Olha a arte PRONTA (o PNG que a profissional vai ver) e responde, numa
 * ferramenta com campos fechados, o que um revisor de marketing olharia:
 * pessoa cortada, recorte sem sentido, texto legível, foto que combina com o
 * assunto e erro de português na arte.
 *
 * Uma leitura por arte com foto (só a capa), no modelo dos agentes, com a
 * imagem reduzida a 768 px: centavos por semana por conta. Falha nunca
 * derruba o pacote: sem leitura, a arte segue como saiu.
 */
const FERRAMENTA = {
  name: "revisar_arte",
  description: "Revisão de qualidade de uma arte de Instagram antes de ir para a profissional.",
  input_schema: {
    type: "object" as const,
    properties: {
      pessoa_cortada: {
        type: "boolean",
        description:
          "true SOMENTE se a BORDA do card corta a pessoa de um jeito estranho: parte da cabeça ou do rosto fica fora do card (testa, olhos, queixo cortados), ou só aparece um pedaço do corpo sem a pessoa (só o cabelo, só um braço). Pessoa inteira de costas, de perfil, olhando para baixo ou com o rosto escondido pelo próprio gesto NÃO é cortada.",
      },
      parte_sem_sentido: {
        type: "boolean",
        description:
          "true se a foto mostra um pedaço que não se entende sozinho (o braço de um sofá, um pedaço de cerca, um canto de parede) em vez da cena.",
      },
      texto_legivel: { type: "boolean", description: "true se todo o texto da arte lê bem sobre o fundo." },
      texto_cortado: { type: "boolean", description: "true se alguma letra sai do card ou fica escondida." },
      foto_combina: {
        type: "boolean",
        description:
          "false SOMENTE se a foto contradiz ou engana sobre o assunto (ex.: post sobre teste de DNA com foto de comida, post de receita com foto de exame). Foto da nutricionista, de consulta, de consultório ou de ambiente de trabalho combina com qualquer post. Arte sem foto: true.",
      },
      o_que_a_foto_mostra: { type: "string", description: "Uma frase curta do que a foto mostra. Vazio se não houver foto." },
      erros_portugues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            escrito: { type: "string", description: "A palavra como está na arte." },
            correto: { type: "string", description: "Como deveria ser escrita." },
          },
          required: ["escrito", "correto"],
        },
        description:
          "Erros de português REAIS no texto escrito na arte (palavra errada ou acento faltando). Palavra já escrita certa (cansaço, você, saúde) não é erro. Na dúvida, deixe vazio.",
      },
      nota: { type: "number", description: "De 1 (não publicaria) a 5 (pronta para publicar)." },
      problema_principal: { type: "string", description: "O maior problema, numa frase. Vazio se estiver boa." },
    },
    required: [
      "pessoa_cortada",
      "parte_sem_sentido",
      "texto_legivel",
      "texto_cortado",
      "foto_combina",
      "o_que_a_foto_mostra",
      "erros_portugues",
      "nota",
      "problema_principal",
    ],
  },
};

export async function olharArte(
  png: Buffer,
  p: { texto: string; assunto?: string },
): Promise<{ olhar: OlharArte | null; uso: { input_tokens: number; output_tokens: number } }> {
  const jpg = await sharp(png).resize(768, 768, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const claude = createClaude();
  const r = await claude.messages.create(
    {
      model: CLAUDE_MODEL_AGENTES,
      max_tokens: 500,
      tools: [FERRAMENTA],
      tool_choice: { type: "tool", name: FERRAMENTA.name },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpg.toString("base64") } },
            {
              type: "text",
              text: [
                "Você é o revisor de marketing de uma nutricionista. Esta é a arte de um post de Instagram, como ela vai receber.",
                `Texto que a arte deveria mostrar: ${p.texto.slice(0, 600)}`,
                p.assunto ? `Assunto do post: ${p.assunto.slice(0, 300)}` : "",
                "Seja exigente com foto cortada e recorte sem sentido; não invente problema que não está na imagem.",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        },
      ],
    },
    { timeout: 25_000 },
  );
  const bloco = r.content.find((b) => b.type === "tool_use") as { input?: unknown } | undefined;
  return {
    olhar: bloco ? validarOlhar(bloco.input) : null,
    uso: { input_tokens: r.usage?.input_tokens ?? 0, output_tokens: r.usage?.output_tokens ?? 0 },
  };
}
