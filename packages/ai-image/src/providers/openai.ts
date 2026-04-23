import OpenAI from "openai";
import type { Dimensoes } from "../types";

const TAMANHO_OPENAI: Record<Dimensoes, "1024x1024" | "1024x1536" | "1536x1024"> = {
  "1080x1080": "1024x1024",
  "1080x1350": "1024x1536",
  "1080x1920": "1024x1536",
};

const CUSTO_USD: Record<"1024x1024" | "1024x1536" | "1536x1024", number> = {
  "1024x1024": 0.167,
  "1024x1536": 0.25,
  "1536x1024": 0.25,
};

export async function gerarImagemOpenAI(params: {
  apiKey: string;
  prompt: string;
  dimensoes: Dimensoes;
  timeoutMs?: number;
}): Promise<{ buffer: Buffer; custoUsd: number }> {
  const client = new OpenAI({
    apiKey: params.apiKey,
    timeout: params.timeoutMs ?? 60_000,
  });

  const size = TAMANHO_OPENAI[params.dimensoes];

  const resp = await client.images.generate({
    model: "gpt-image-1",
    prompt: params.prompt,
    size,
    quality: "high",
    n: 1,
  });

  const data = resp.data?.[0];
  if (!data) throw new Error("OpenAI: sem dados na resposta");

  let buffer: Buffer;
  if (data.b64_json) {
    buffer = Buffer.from(data.b64_json, "base64");
  } else if (data.url) {
    const res = await fetch(data.url);
    if (!res.ok) throw new Error(`OpenAI: falha ao baixar imagem: ${res.status}`);
    buffer = Buffer.from(await res.arrayBuffer());
  } else {
    throw new Error("OpenAI: resposta sem b64_json nem url");
  }

  return { buffer, custoUsd: CUSTO_USD[size] };
}
