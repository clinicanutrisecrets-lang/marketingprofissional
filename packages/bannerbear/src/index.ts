/**
 * Bannerbear — geração de criativos a partir de templates com placeholders.
 *
 * Templates têm placeholders (make dynamic no editor visual):
 * - headline    (texto principal)
 * - subtitle    (texto secundário)
 * - foto_nutri  (imagem profissional)
 * - logo        (logo da marca)
 * - cor_primaria (fundo ou detalhe)
 * - cta         (texto do botão)
 *
 * Próxima iteração:
 * - generateDesign({ templateId, modifications })
 * - downloadImage(designId)
 * - generateCollection(templateId, variations[])  ← para carrossel
 */

const BANNERBEAR_API = "https://api.bannerbear.com/v2";

export type PlaceholderMods = {
  name: string;
  text?: string;
  image_url?: string;
  color?: string;
}[];

export async function generateDesign(params: {
  apiKey: string;
  templateId: string;
  modifications: PlaceholderMods;
  synchronous?: boolean;
}) {
  const res = await fetch(`${BANNERBEAR_API}/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template: params.templateId,
      modifications: params.modifications,
      synchronous: params.synchronous ?? true,
    }),
  });

  if (!res.ok) throw new Error(`Bannerbear error: ${res.status}`);
  return res.json() as Promise<{ uid: string; image_url: string; status: string }>;
}
