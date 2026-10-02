/**
 * A marca da profissional no formato que o desenhador de arte espera.
 *
 * Fonte única: o pacote da semana e o post de venda desenham arte com a MESMA
 * marca. Duas montagens campo a campo divergiriam caladas (uma com a cor
 * padrão, outra sem logo), e a nutri veria dois estilos no mesmo perfil.
 *
 * Função pura: roda no teste sem servidor.
 */
import type { BrandGuidelines } from "@scanner/ai-image";

export const COR_PRIMARIA_PADRAO = "#2F5D50";

export type FranqueadaParaMarca = {
  nome_comercial?: string | null;
  nome_completo?: string | null;
  cor_primaria_hex?: string | null;
  cor_secundaria_hex?: string | null;
  nicho_principal?: string | null;
};

export function brandDaFranqueada(
  f: FranqueadaParaMarca,
  assets: { logoUrl?: string | null; fotoUrl?: string | null },
): BrandGuidelines {
  return {
    nomeMarca: f.nome_comercial || f.nome_completo || "",
    corPrimariaHex: f.cor_primaria_hex || COR_PRIMARIA_PADRAO,
    corSecundariaHex: f.cor_secundaria_hex ?? undefined,
    logoUrl: assets.logoUrl ?? undefined,
    fotoProfissionalUrl: assets.fotoUrl ?? undefined,
    tomVisual: "editorial premium health clinic, sophisticated, calm",
    nicho: f.nicho_principal || "nutrição funcional",
  };
}
