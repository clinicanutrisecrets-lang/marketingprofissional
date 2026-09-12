import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import ffprobeStatic from "ffprobe-static";
import sharp from "sharp";
import { DIMENSOES, FPS_TREINO, FRAMES_TREINO, type Formato } from "./regras.ts";

const run = promisify(execFile);
// ffmpeg-static é CommonJS com `module.exports = caminho`; o import ESM do
// NodeNext traz o namespace inteiro, por isso o require explícito.
const ffmpegPath = createRequire(import.meta.url)("ffmpeg-static") as string | null;

function binFfmpeg(): string {
  if (!ffmpegPath) throw new Error("ffmpeg-static não trouxe binário para esta plataforma.");
  return ffmpegPath;
}

export type InfoVideo = { duracaoSeg: number; largura: number; altura: number; fps: number };

/** Lê duração e dimensões com o ffprobe empacotado (sem instalar nada). */
export async function sondarVideo(arquivo: string): Promise<InfoVideo> {
  const { stdout } = await run(ffprobeStatic.path, [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,r_frame_rate:format=duration",
    "-of", "json",
    arquivo,
  ]);
  const json = JSON.parse(stdout) as {
    streams?: { width?: number; height?: number; r_frame_rate?: string }[];
    format?: { duration?: string };
  };
  const s = json.streams?.[0] ?? {};
  const [num, den] = (s.r_frame_rate ?? "0/1").split("/").map(Number);
  return {
    duracaoSeg: Number(json.format?.duration ?? 0) || 0,
    largura: s.width ?? 0,
    altura: s.height ?? 0,
    fps: den ? num / den : 0,
  };
}

/**
 * Normaliza um vídeo pro formato do trainer: escala + corte central no
 * formato pedido, 16 fps, 81 quadros, sem áudio, H.264 yuv420p.
 * `-autorotate` é padrão no ffmpeg, então vídeo de celular em pé sai em pé.
 */
export async function normalizarVideo(entrada: string, saida: string, formato: Formato, inicioSeg: number): Promise<void> {
  const { largura, altura } = DIMENSOES[formato];
  const vf = `scale=${largura}:${altura}:force_original_aspect_ratio=increase,crop=${largura}:${altura},fps=${FPS_TREINO}`;
  await run(binFfmpeg(), [
    "-y", "-hide_banner", "-loglevel", "error",
    "-ss", inicioSeg.toFixed(3),
    "-i", entrada,
    "-vf", vf,
    "-frames:v", String(FRAMES_TREINO),
    "-an",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
    "-movflags", "+faststart",
    saida,
  ]);
}

/**
 * Foto: o sharp lê a orientação EXIF (foto de celular deitada vira em pé) e
 * corta no centro. O ffmpeg ignora EXIF de imagem, por isso não é usado aqui.
 */
export async function normalizarImagem(entrada: string, saida: string, formato: Formato): Promise<void> {
  const { largura, altura } = DIMENSOES[formato];
  await sharp(entrada)
    .rotate()
    .resize(largura, altura, { fit: "cover", position: "centre" })
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(saida);
}

/** Três quadros (início, meio, fim) do clipe já normalizado, pra legenda. */
export async function extrairQuadros(video: string, pastaSaida: string, base: string): Promise<string[]> {
  const info = await sondarVideo(video);
  const d = info.duracaoSeg || FRAMES_TREINO / FPS_TREINO;
  const tempos = [0.05, d / 2, Math.max(0, d - 0.15)];
  const saidas: string[] = [];
  for (let i = 0; i < tempos.length; i++) {
    const out = `${pastaSaida}/${base}-q${i + 1}.jpg`;
    await run(binFfmpeg(), [
      "-y", "-hide_banner", "-loglevel", "error",
      "-ss", tempos[i].toFixed(3),
      "-i", video,
      "-frames:v", "1", "-q:v", "3",
      out,
    ]);
    saidas.push(out);
  }
  return saidas;
}
