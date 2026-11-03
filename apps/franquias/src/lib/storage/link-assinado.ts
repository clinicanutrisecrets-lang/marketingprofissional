/**
 * Link assinado das artes no bucket privado `franqueadas-assets`.
 *
 * 🔴 Caso Juliana (03/11/2026): um slide do carrossel saiu sem imagem na tela
 * de aprovação. O arquivo existia, mas o `createSignedUrl` falhou uma vez e
 * o código gravou o CAMINHO cru (`<conta>/ai-image/..._carrossel_3.png`) no
 * lugar do link, calado (`signed?.signedUrl ?? path`). O navegador não abre
 * caminho de bucket privado, e o slide aparecia quebrado.
 *
 * Duas defesas:
 *  1. Na gravação, tenta de novo antes de desistir, e avisa no log.
 *  2. Na leitura (tela de aprovação), todo caminho cru é assinado na hora.
 */

export const UM_ANO_EM_SEGUNDOS = 365 * 24 * 60 * 60;

type BucketAssinavel = {
  createSignedUrl(
    path: string,
    expiresIn: number,
  ): Promise<{ data: { signedUrl: string } | null; error: unknown }>;
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** É um caminho do bucket, não um link que o navegador abre. */
export function ehCaminhoCru(u: unknown): u is string {
  return typeof u === "string" && u.length > 0 && !/^(https?:|data:|blob:)/i.test(u);
}

/** Assina com até 3 tentativas. Devolve null só se todas falharem. */
export async function assinarComTentativas(
  bucket: BucketAssinavel,
  path: string,
  tentativas = 3,
): Promise<string | null> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const { data } = await bucket.createSignedUrl(path, UM_ANO_EM_SEGUNDOS);
      if (data?.signedUrl) return data.signedUrl;
    } catch {
      /* tenta de novo */
    }
    if (i < tentativas - 1) await esperar(250 * (i + 1));
  }
  return null;
}

/**
 * Para a GRAVAÇÃO: o link assinado ou, se o Storage recusar três vezes, o
 * caminho (que a tela de aprovação assina na leitura). Nunca derruba a
 * geração da arte por causa do link.
 */
export async function linkAssinadoOuCaminho(bucket: BucketAssinavel, path: string): Promise<string> {
  const url = await assinarComTentativas(bucket, path);
  if (url) return url;
  console.error(`[storage] link assinado falhou 3x; gravando o caminho (a tela assina na leitura): ${path}`);
  return path;
}

/**
 * Para a LEITURA: troca todo caminho cru de `urls_slides` e `url_imagem_final`
 * por um link assinado. O que não der para assinar fica como está.
 */
export async function assinarArtesSemLink<T extends Record<string, unknown>>(
  bucket: BucketAssinavel,
  posts: T[],
): Promise<T[]> {
  return Promise.all(
    posts.map(async (p) => {
      const slides = Array.isArray(p.urls_slides) ? (p.urls_slides as unknown[]) : null;
      const precisaSlides = !!slides?.some(ehCaminhoCru);
      const precisaUnica = ehCaminhoCru(p.url_imagem_final);
      if (!precisaSlides && !precisaUnica) return p;
      const novo: Record<string, unknown> = { ...p };
      if (slides && precisaSlides) {
        novo.urls_slides = await Promise.all(
          slides.map(async (u) => (ehCaminhoCru(u) ? (await assinarComTentativas(bucket, u)) ?? u : u)),
        );
      }
      if (precisaUnica) {
        const u = p.url_imagem_final as string;
        novo.url_imagem_final = (await assinarComTentativas(bucket, u)) ?? u;
      }
      return novo as T;
    }),
  );
}
