/**
 * Bannerbear API client — geração de criativos a partir de templates.
 *
 * Templates precisam ter placeholders com estes nomes (configurar no dashboard):
 * - headline      (texto principal)
 * - subtitle      (texto secundário, opcional)
 * - foto_nutri    (imagem profissional)
 * - logo          (logo da marca)
 * - cor_primaria  (fundo ou barra de destaque)
 * - cta           (texto do botão)
 */

const BASE_URL = "https://api.bannerbear.com/v2";

export type PlaceholderMod =
  | { name: string; text: string; color?: string }
  | { name: string; image_url: string }
  | { name: string; color: string };

export type ImageResponse = {
  uid: string;
  self: string;
  image_url: string | null;
  image_url_png: string | null;
  image_url_jpg: string | null;
  status: "pending" | "completed" | "failed";
  template: string;
  modifications: PlaceholderMod[];
  created_at: string;
};

function getApiKey(): string {
  const key = process.env.BANNERBEAR_API_KEY;
  if (!key) throw new Error("BANNERBEAR_API_KEY não configurada");
  return key;
}

export async function generateImage(params: {
  templateId: string;
  modifications: PlaceholderMod[];
  synchronous?: boolean;
}): Promise<ImageResponse> {
  const res = await fetch(`${BASE_URL}/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template: params.templateId,
      modifications: params.modifications,
      synchronous: params.synchronous ?? true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bannerbear error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function pollImage(uid: string): Promise<ImageResponse> {
  const res = await fetch(`${BASE_URL}/images/${uid}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });
  if (!res.ok) throw new Error(`pollImage: ${res.status}`);
  return res.json();
}

/**
 * Helper: dado os dados da nutri + conteúdo do post, monta as modifications.
 */
export function buildModifications(params: {
  headline: string;
  subtitle?: string;
  cta?: string;
  cor_primaria_hex?: string;
  logo_url?: string;
  foto_nutri_url?: string;
}): PlaceholderMod[] {
  const mods: PlaceholderMod[] = [
    { name: "headline", text: params.headline },
  ];
  if (params.subtitle) mods.push({ name: "subtitle", text: params.subtitle });
  if (params.cta) mods.push({ name: "cta", text: params.cta });
  if (params.cor_primaria_hex) mods.push({ name: "cor_primaria", color: params.cor_primaria_hex });
  if (params.logo_url) mods.push({ name: "logo", image_url: params.logo_url });
  if (params.foto_nutri_url) mods.push({ name: "foto_nutri", image_url: params.foto_nutri_url });
  return mods;
}

/**
 * Retorna o template correto pra cada tipo de post.
 */
export function resolveTemplateId(tipo: string): string {
  const map: Record<string, string | undefined> = {
    feed_imagem: process.env.BANNERBEAR_TEMPLATE_FEED_IMAGEM,
    feed_carrossel: process.env.BANNERBEAR_TEMPLATE_CARROSSEL,
    reels: process.env.BANNERBEAR_TEMPLATE_REELS_COVER,
  };
  const id = map[tipo];
  if (!id) throw new Error(`Template Bannerbear não configurado para tipo: ${tipo}`);
  return id;
}
