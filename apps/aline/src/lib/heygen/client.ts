/**
 * HeyGen API client — geração de vídeos com avatar clonado.
 * Apenas Studio Aline usa.
 */

const BASE = "https://api.heygen.com/v2";

export type HeyGenVideoStatus = "pending" | "processing" | "completed" | "failed";

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) throw new Error("HEYGEN_API_KEY não configurada");
  return key;
}

/**
 * Inicia geração de vídeo com avatar.
 * Retorna video_id. Usa pollVideoStatus pra acompanhar.
 */
export async function generateVideo(params: {
  avatarId: string;
  voiceId: string;
  script: string;
  width?: number;
  height?: number;
  background?: { type: "color"; value: string };
  test?: boolean; // true = vídeo com marca d'água (gratis em alguns planos)
}): Promise<{ video_id: string }> {
  const res = await fetch(`${BASE}/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: params.avatarId,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            voice_id: params.voiceId,
            input_text: params.script,
            speed: 1.0,
          },
          background: params.background ?? { type: "color", value: "#FFFFFF" },
        },
      ],
      dimension: {
        width: params.width ?? 1080,
        height: params.height ?? 1920, // padrão reels (9:16)
      },
      test: params.test ?? false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HeyGen generate ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { data: { video_id: string } };
  return { video_id: data.data.video_id };
}

/**
 * Verifica status do vídeo. Quando "completed", retorna video_url.
 */
export async function getVideoStatus(videoId: string): Promise<{
  status: HeyGenVideoStatus;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  error?: string;
}> {
  const url = `${BASE.replace("/v2", "/v1")}/video_status.get?video_id=${videoId}`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": getApiKey() },
  });
  if (!res.ok) throw new Error(`HeyGen status ${res.status}`);

  const data = (await res.json()) as {
    data: {
      status: HeyGenVideoStatus;
      video_url?: string;
      thumbnail_url?: string;
      duration?: number;
      error?: { message: string };
    };
  };

  return {
    status: data.data.status,
    video_url: data.data.video_url,
    thumbnail_url: data.data.thumbnail_url,
    duration: data.data.duration,
    error: data.data.error?.message,
  };
}

/**
 * Polling até o vídeo ficar pronto. Retorna URL final.
 * Padrão: tenta 30 vezes a cada 10s = 5 min de timeout.
 */
export async function pollUntilReady(
  videoId: string,
  options: { maxTentativas?: number; intervaloMs?: number } = {},
): Promise<{ video_url: string; thumbnail_url?: string; duration?: number }> {
  const maxTentativas = options.maxTentativas ?? 30;
  const intervalo = options.intervaloMs ?? 10_000;

  for (let i = 0; i < maxTentativas; i++) {
    const s = await getVideoStatus(videoId);
    if (s.status === "completed" && s.video_url) {
      return {
        video_url: s.video_url,
        thumbnail_url: s.thumbnail_url,
        duration: s.duration,
      };
    }
    if (s.status === "failed") {
      throw new Error(`HeyGen falhou: ${s.error ?? "sem detalhes"}`);
    }
    await new Promise((r) => setTimeout(r, intervalo));
  }
  throw new Error("HeyGen timeout — vídeo demorou demais");
}
