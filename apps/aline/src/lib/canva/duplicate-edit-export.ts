import "server-only";
import {
  copyDesign,
  uploadAssetFromBuffer,
  applyEdits,
  exportDesignPng,
  type EditOp,
} from "./client";

export type CanvaPipelineInput = {
  designId: string;
  textos?: Record<string, string>;
  fotoHero?: { buffer: Buffer; filename: string };
};

export type CanvaPipelineOutput = {
  copyDesignId: string;
  pngUrl: string;
  tempoMs: number;
};

/**
 * Pipeline completo:
 * 1. Duplica design original (não muta o template do pool)
 * 2. (opcional) Upload foto hero como asset → swap no layer "foto_hero"
 * 3. Aplica edits textuais nos layers nomeados
 * 4. Exporta PNG → poll job → retorna URL
 *
 * Layers no design original devem ter os nomes:
 * - "foto_hero" (image layer pra swap de foto Pexels)
 * - "headline" (text layer)
 * - "subtitle" (text layer)
 * - "cta" (text layer)
 * - "handle" (text layer pro @ da nutri)
 */
export async function canvaDuplicateAndExport(
  input: CanvaPipelineInput,
): Promise<CanvaPipelineOutput> {
  const t0 = Date.now();

  const copy = await copyDesign(input.designId);

  const ops: EditOp[] = [];

  if (input.fotoHero) {
    const asset = await uploadAssetFromBuffer(
      input.fotoHero.buffer,
      input.fotoHero.filename,
    );
    ops.push({ type: "replace_image", layer_name: "foto_hero", asset_id: asset.id });
  }

  if (input.textos) {
    for (const [layer, value] of Object.entries(input.textos)) {
      if (value && value.length > 0) {
        ops.push({ type: "replace_text", layer_name: layer, value });
      }
    }
  }

  if (ops.length > 0) {
    await applyEdits(copy.id, ops);
  }

  const pngUrl = await exportDesignPng(copy.id);

  return {
    copyDesignId: copy.id,
    pngUrl,
    tempoMs: Date.now() - t0,
  };
}
