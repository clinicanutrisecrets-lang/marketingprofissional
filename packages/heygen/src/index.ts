/**
 * HeyGen — geração de reels com avatar clonado.
 *
 * Uso: APENAS no sistema pessoal da Aline (apps/aline).
 * Não expor pras franqueadas.
 *
 * ⚠️ Plano Creator ($24/mês) NÃO tem acesso à API.
 * Para integração programática, é necessário upgrade pra API plan
 * (~$99/mês) ou Scale/Enterprise.
 *
 * Enquanto não houver upgrade, funcionamos em modo manual:
 * - Sistema gera o script (Claude)
 * - Mostra no painel com botão "Copiar e abrir HeyGen"
 * - Aline cola no HeyGen, gera vídeo, baixa
 * - Faz upload no painel (drag & drop)
 * - Fluxo segue normal
 */

export const HEYGEN_API_ENABLED =
  process.env.HEYGEN_API_ENABLED === "true";

export type HeyGenScriptBlock = {
  texto: string;
  avatar_id?: string;
  voice_id?: string;
};

/**
 * Gera vídeo com avatar clonado.
 * Só funciona se HEYGEN_API_ENABLED=true (requer upgrade de plano).
 */
export async function generateVideo(params: {
  apiKey: string;
  avatarId: string;
  voiceId: string;
  script: string;
  dimension?: { width: number; height: number };
}) {
  if (!HEYGEN_API_ENABLED) {
    throw new Error(
      "HeyGen API desabilitada. Upgrade o plano pra API tier ou use fluxo manual.",
    );
  }

  const res = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "X-Api-Key": params.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: "avatar", avatar_id: params.avatarId },
          voice: { type: "text", voice_id: params.voiceId, input_text: params.script },
        },
      ],
      dimension: params.dimension ?? { width: 1080, height: 1920 },
    }),
  });

  if (!res.ok) throw new Error(`HeyGen error: ${res.status}`);
  return res.json() as Promise<{ data: { video_id: string } }>;
}

/**
 * Helper pro fluxo manual — gera mensagem + link pra Aline copiar
 * o script e abrir o HeyGen.
 */
export function buildManualInstructions(script: string) {
  return {
    script,
    instrucoes:
      "1. Copie o script abaixo\n2. Abra https://app.heygen.com → Create Video → AI Studio\n3. Selecione seu avatar clonado\n4. Cole o script\n5. Gere o vídeo (leva ~2 min)\n6. Baixe e faça upload aqui no painel",
    link_heygen: "https://app.heygen.com",
  };
}
