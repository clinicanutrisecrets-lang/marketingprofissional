/**
 * Narração pronta por vídeo (Aline, 07/11/2026: "pode ajustar"). O cartão do
 * vídeo de marca dizia "Este vídeo ainda não está pronto: falta a sua voz"
 * mesmo depois de a narração dela ficar pronta, porque olhava só o vídeo sem
 * voz. Aqui sai, de `narracoes_video`, a narração pronta mais nova de cada
 * vídeo (ref → url do MP4 com a voz). Sem import do app: roda no node:test.
 */
export type LinhaNarracao = { ref: string; status: string; url: string | null; criado_em: string };

export function narracoesProntasPorRef(linhas: LinhaNarracao[] | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  const quando: Record<string, number> = {};
  for (const l of linhas ?? []) {
    if (l.status !== "pronto" || !l.url || !l.ref) continue;
    const t = Date.parse(l.criado_em) || 0;
    if (out[l.ref] === undefined || t > quando[l.ref]!) {
      out[l.ref] = l.url;
      quando[l.ref] = t;
    }
  }
  return out;
}

/** O que o cartão mostra: o aviso de que falta a voz, ou o vídeo com a voz dela. */
export function estadoVozDoVideo(
  ref: string,
  prontas: Record<string, string> | null | undefined,
): { tipo: "falta-voz" } | { tipo: "com-voz"; url: string } {
  const url = prontas?.[ref];
  return url ? { tipo: "com-voz", url } : { tipo: "falta-voz" };
}
