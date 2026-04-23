export type Provider = "openai" | "gemini";

export type TipoPeca = "feed_imagem" | "feed_carrossel" | "stories";

export type Dimensoes = "1080x1080" | "1080x1350" | "1080x1920";

export type ModoTexto =
  | "sharp_overlay" // Modo B: IA só gera visual, Sharp insere texto pixel-perfect
  | "ia_gera";      // Modo A: IA gera tudo (mais bonito, risco de erro em pt-BR)

export type BrandGuidelines = {
  nomeMarca: string;
  corPrimariaHex: string;
  corSecundariaHex?: string;
  logoUrl?: string;
  fotoProfissionalUrl?: string;
  tomVisual?: string;
  nicho?: string;
};

export type ConteudoPeca = {
  headline: string;
  subtitle?: string;
  corpo?: string;
  cta?: string;
  eyebrow?: string;
};

export type SlideRef = {
  indiceSlide: number;
  totalSlides: number;
  referenciaImagem?: Buffer;
};

export type RenderRequest = {
  tipo: TipoPeca;
  provider: Provider;
  apiKey: string;
  brand: BrandGuidelines;
  conteudo: ConteudoPeca;
  dimensoes?: Dimensoes;
  slide?: SlideRef;
  modoTexto?: ModoTexto;
  timeoutMs?: number;
};

export type RenderResult = {
  buffer: Buffer;
  provider: Provider;
  promptUsado: string;
  modoTexto: ModoTexto;
  tempoMs: number;
  custoEstimadoUsd: number;
};

export const DIMENSOES_POR_TIPO: Record<TipoPeca, Dimensoes> = {
  feed_imagem: "1080x1080",
  feed_carrossel: "1080x1350",
  stories: "1080x1920",
};

export type SafeZone = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getSafeZone(dim: Dimensoes): SafeZone {
  const [w, h] = dim.split("x").map(Number) as [number, number];
  if (dim === "1080x1080") {
    return { x: 0, y: Math.round(h * 0.58), width: w, height: Math.round(h * 0.42) };
  }
  if (dim === "1080x1350") {
    return { x: 0, y: Math.round(h * 0.55), width: w, height: Math.round(h * 0.45) };
  }
  return { x: 0, y: Math.round(h * 0.35), width: w, height: Math.round(h * 0.4) };
}
