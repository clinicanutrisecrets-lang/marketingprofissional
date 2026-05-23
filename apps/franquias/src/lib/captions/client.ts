/**
 * Captions.ai — Mirage API client
 * Base: https://api.mirage.app/v1
 * Auth: x-api-key header (set CAPTIONS_API_KEY in env)
 */

const BASE_URL = "https://api.mirage.app/v1";

function getKey(): string {
  const key = process.env.CAPTIONS_API_KEY;
  if (!key) throw new Error("CAPTIONS_API_KEY não configurada");
  return key;
}

function headers() {
  return { "x-api-key": getKey(), "Content-Type": "application/json" };
}

export type CaptionTemplate = {
  id: string;
  name: string;
  preview_url?: string;
};

export type CaptionJob = {
  id: string;
  object: string;
  status: "PROCESSING" | "COMPLETE" | "FAILED" | "CANCELLED";
  progress: number;
  created_at: number;
  completed_at: number | null;
  source_video_id: string;
  video_id: string;
  caption_template_id: string;
  error: string | null;
};

export async function listTemplates(): Promise<CaptionTemplate[]> {
  const res = await fetch(`${BASE_URL}/caption-templates`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`listTemplates: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.data ?? data ?? [];
}

export async function criarJob(
  videoUrl: string,
  captionTemplateId: string,
): Promise<CaptionJob> {
  const res = await fetch(`${BASE_URL}/videos/captions`, {
    method: "POST",
    headers: { "x-api-key": getKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ video_url: videoUrl, caption_template_id: captionTemplateId }),
  });
  if (!res.ok) throw new Error(`criarJob: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function getStatus(jobId: string): Promise<CaptionJob> {
  const res = await fetch(`${BASE_URL}/videos/${jobId}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`getStatus: ${res.status} ${await res.text()}`);
  return res.json();
}

export function getDownloadUrl(videoId: string): string {
  return `${BASE_URL}/videos/${videoId}/content`;
}
