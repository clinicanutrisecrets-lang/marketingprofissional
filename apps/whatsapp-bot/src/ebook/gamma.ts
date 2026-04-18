import { request } from "undici";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

type GenerationCreateResp = { generationId: string };

type GenerationStatusResp = {
  status: "pending" | "processing" | "completed" | "failed";
  gammaUrl?: string;
  exportUrl?: string;
  credits?: { used: number; remaining: number };
  error?: string;
};

export type GammaResult = {
  gammaUrl: string;
  pdfPath: string;
};

/**
 * Gera um ebook em PDF no Gamma e baixa localmente.
 * Usa o tema custom "Scanner" (id em GAMMA_THEME_ID) pra paleta oficial.
 */
export async function generateEbookPdf(
  title: string,
  markdownInput: string,
  opts?: { numCards?: number }
): Promise<GammaResult> {
  fs.mkdirSync(config.paths.ebooks, { recursive: true });

  const fixedEnding = [
    "",
    "## Sobre a autora",
    "",
    config.brand.aboutAuthor,
    "",
    "## Sobre o Scanner da Saúde",
    "",
    config.brand.aboutScanner,
    "",
    "## Contato",
    "",
    `**${config.brand.author}**`,
    "",
    `Instagram: [@nutri_secrets](${config.brand.instaNutri}) · [@scannerdasaude.d](${config.brand.instaScanner})`,
    "",
  ].join("\n");

  const fullInput = `${markdownInput}\n${fixedEnding}`;

  const genId = await createGeneration({
    inputText: fullInput,
    textMode: "preserve", // usa o conteúdo como está, sem reinventar
    format: "document",
    themeName: config.gamma.themeId,
    numCards: opts?.numCards ?? 12,
    exportAs: "pdf",
    textOptions: { language: "pt-br", amount: "detailed" },
    imageOptions: {
      source: "aiGenerated",
      stylePreset: "abstract",
      // Cores sólidas da paleta Scanner, sem fotografia realista.
      style:
        "Minimal editorial composition. Solid block colors from the Scanner palette only: teal #0BB8A8, deep purple #7C3AED, amber #F59E0B, dark navy #1A2E45, pure white #FFFFFF. Clean geometric shapes, generous negative space, no photorealistic elements, no busy textures, no gradients mixing outside this palette. Elegant, quiet, scientific.",
    },
    additionalInstructions: [
      "Capa (primeiro card): layout ultra limpo. SEM imagem de fundo atrás do título.",
      "Só tipografia forte + um bloco geométrico sólido sutil nas cores da paleta Scanner (teal/roxo/âmbar) se quiser algum elemento visual.",
      "Nos demais cards, use ilustrações abstratas minimalistas da paleta Scanner — nunca fotografias de alimentos, cápsulas ou pessoas.",
      "Layout sempre elegante, hierarquia clara, respiro generoso.",
    ].join(" "),
  });

  const result = await pollUntilReady(genId, 20 * 60 * 1000);
  if (!result.exportUrl) throw new Error("Gamma completou mas sem exportUrl.");

  const pdfPath = path.join(
    config.paths.ebooks,
    `${slugify(title)}-${Date.now()}.pdf`
  );
  await downloadTo(result.exportUrl, pdfPath);

  return { gammaUrl: result.gammaUrl ?? "", pdfPath };
}

async function createGeneration(body: Record<string, unknown>): Promise<string> {
  const { statusCode, body: resBody } = await request(
    `${config.gamma.baseUrl}/generations`,
    {
      method: "POST",
      headers: {
        "X-API-KEY": config.gamma.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const text = await resBody.text();
  if (statusCode >= 400) {
    throw new Error(`Gamma POST /generations falhou ${statusCode}: ${text}`);
  }
  const data = JSON.parse(text) as GenerationCreateResp;
  if (!data.generationId) throw new Error(`Resposta do Gamma sem generationId: ${text}`);
  return data.generationId;
}

async function pollUntilReady(
  generationId: string,
  timeoutMs: number
): Promise<GenerationStatusResp> {
  const start = Date.now();
  let delay = 5000;

  while (Date.now() - start < timeoutMs) {
    await sleep(delay);
    const { statusCode, body } = await request(
      `${config.gamma.baseUrl}/generations/${generationId}`,
      { headers: { "X-API-KEY": config.gamma.apiKey } }
    );
    const text = await body.text();
    if (statusCode >= 400) {
      throw new Error(`Gamma GET /generations/${generationId} ${statusCode}: ${text}`);
    }
    const data = JSON.parse(text) as GenerationStatusResp;

    if (data.status === "completed") return data;
    if (data.status === "failed") {
      throw new Error(`Gamma falhou: ${data.error ?? "erro desconhecido"}`);
    }
    // Backoff leve: cresce até 15s
    delay = Math.min(delay + 2000, 15_000);
  }
  throw new Error(`Gamma timeout (${timeoutMs}ms) aguardando generation ${generationId}`);
}

async function downloadTo(url: string, destPath: string): Promise<void> {
  const { statusCode, body } = await request(url);
  if (statusCode >= 400) throw new Error(`Download PDF falhou: ${statusCode}`);
  const buf = Buffer.from(await body.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
