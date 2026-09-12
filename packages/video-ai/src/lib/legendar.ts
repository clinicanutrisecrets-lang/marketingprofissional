import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { cfg } from "./config.ts";
import { montarLegenda, type TipoMidia } from "./regras.ts";

const SISTEMA = `Você escreve legendas de treino para um modelo de vídeo (LoRA de estilo) de uma marca de nutrição.
Descreva SÓ o que está na imagem, de forma objetiva, em UMA frase corrida de 30 a 60 palavras, em português do Brasil.
Ordem: o que aparece (prato, ingredientes, objetos), enquadramento e ângulo (close, top-down, 45 graus), luz (direção, dureza), cores predominantes e fundo, textura e movimento se houver.
Nunca invente marca, texto, pessoas ou ingredientes que não estejam visíveis. Nunca opine ("delicioso", "lindo"). Nunca use travessão; use vírgula, dois-pontos ou parênteses.
Responda só com a frase, sem aspas, sem prefixo, sem lista.`;

function midia(caminho: string): { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } } {
  return {
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: fs.readFileSync(caminho).toString("base64") },
  };
}

export type ResultadoLegenda = { legenda: string; fonte: "claude"; tokensEntrada: number; tokensSaida: number };

/**
 * Uma foto → uma frase. Um vídeo → três quadros (início, meio, fim) na mesma
 * mensagem, pedindo pra descrever também o movimento entre eles.
 */
export async function legendarComClaude(quadros: string[], tipo: TipoMidia, trigger: string): Promise<ResultadoLegenda> {
  if (!cfg.anthropicKey) throw new Error("ANTHROPIC_API_KEY ausente");
  const client = new Anthropic({ apiKey: cfg.anthropicKey });

  const pedido = tipo === "video"
    ? "Estes são três quadros (início, meio e fim) de um vídeo de 5 segundos. Descreva a cena e diga o que se move entre os quadros (câmera, vapor, corte, fio de mel, mão). Uma frase só."
    : "Descreva esta foto. Uma frase só.";

  const resposta = await client.messages.create({
    model: cfg.legendaModel,
    max_tokens: 400,
    system: SISTEMA,
    messages: [{ role: "user", content: [...quadros.map(midia), { type: "text", text: pedido }] }],
  });

  if (resposta.stop_reason === "refusal") {
    throw new Error("O modelo recusou descrever este arquivo.");
  }
  const texto = resposta.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ")
    .trim();
  if (!texto) throw new Error("Resposta vazia do modelo.");

  return {
    legenda: montarLegenda(texto, trigger),
    fonte: "claude",
    tokensEntrada: resposta.usage.input_tokens,
    tokensSaida: resposta.usage.output_tokens,
  };
}
