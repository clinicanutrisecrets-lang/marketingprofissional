import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Dimensoes } from "../types";

const MODEL_ID = "gemini-2.5-flash-image";

const CUSTO_USD = 0.039;

const HINT_ASPECTO: Record<Dimensoes, string> = {
  "1080x1080": "Output image aspect ratio: 1:1 square.",
  "1080x1350": "Output image aspect ratio: 4:5 vertical portrait.",
  "1080x1920": "Output image aspect ratio: 9:16 vertical full-screen.",
};

export async function gerarImagemGemini(params: {
  apiKey: string;
  prompt: string;
  dimensoes: Dimensoes;
  referenciaImagem?: Buffer;
  timeoutMs?: number;
}): Promise<{ buffer: Buffer; custoUsd: number }> {
  const client = new GoogleGenerativeAI(params.apiKey);
  const model = client.getGenerativeModel({ model: MODEL_ID });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: `${params.prompt}\n\n${HINT_ASPECTO[params.dimensoes]}` },
  ];

  if (params.referenciaImagem) {
    parts.push({
      inlineData: {
        data: params.referenciaImagem.toString("base64"),
        mimeType: "image/png",
      },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs ?? 60_000);

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const parts0 = result.response.candidates?.[0]?.content?.parts ?? [];
    const imagemPart = parts0.find((p) => "inlineData" in p && p.inlineData) as
      | { inlineData: { data: string; mimeType: string } }
      | undefined;

    if (!imagemPart) {
      throw new Error("Gemini: resposta sem imagem (inlineData)");
    }

    const buffer = Buffer.from(imagemPart.inlineData.data, "base64");
    return { buffer, custoUsd: CUSTO_USD };
  } finally {
    clearTimeout(timeout);
  }
}
