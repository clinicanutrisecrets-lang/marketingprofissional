/**
 * Áudio recebido no direct → texto, pelo AssemblyAI (o mesmo que a Sofia usa
 * no Scanner). Precisa de ASSEMBLYAI_API_KEY na Vercel do studio-aline.
 * Sem chave, sem rede ou estourando o tempo → null, e o robô trata como
 * mensagem sem texto (não responde no automático).
 */

const BASE = "https://api.assemblyai.com/v2";

export async function transcreverAudio(url: string, limiteMs = 45_000): Promise<string | null> {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    console.warn("[automacao/audio] ASSEMBLYAI_API_KEY ausente — áudio ignorado");
    return null;
  }
  const inicio = Date.now();
  try {
    // A URL do CDN do Instagram é pública (e temporária): o AssemblyAI baixa direto.
    const criar = await fetch(`${BASE}/transcript`, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({ audio_url: url, language_code: "pt", speech_model: "best" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!criar.ok) {
      console.error("[automacao/audio] criar transcrição falhou", criar.status, (await criar.text()).slice(0, 200));
      return null;
    }
    const { id } = (await criar.json()) as { id: string };
    while (Date.now() - inicio < limiteMs) {
      await new Promise((r) => setTimeout(r, 2500));
      const res = await fetch(`${BASE}/transcript/${id}`, {
        headers: { Authorization: key },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;
      const j = (await res.json()) as { status: string; text?: string; error?: string };
      if (j.status === "completed") return (j.text ?? "").trim() || null;
      if (j.status === "error") {
        console.error("[automacao/audio] transcrição com erro:", j.error);
        return null;
      }
    }
    console.warn("[automacao/audio] transcrição demorou mais que o limite");
    return null;
  } catch (e) {
    console.error("[automacao/audio] falha:", (e as Error).message);
    return null;
  }
}
