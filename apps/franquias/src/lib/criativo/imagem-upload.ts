/**
 * Que arquivo de imagem a gente aceita da nutri.
 *
 * 🔴 A régua não é "é imagem?", é "o navegador vai conseguir MOSTRAR?".
 * Lição cara do Scanner Tratamentos (09/09/2026): `type.startsWith("image/")`
 * deixava o HEIC do iPhone passar, o Storage guardava, e nada aparecia na
 * tela — do lado de quem subiu, idêntico a "não aconteceu nada". E pelo outro
 * lado recusava JPG bom vindo do WhatsApp, que chega com `type` VAZIO.
 *
 * Aceitar arquivo que o navegador não desenha é pior que recusar: vira "não
 * aconteceu nada" pra quem está na tela e imagem quebrada pra quem abre o
 * post depois.
 */

/** Formatos que todo navegador desenha. */
const OK = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

/** Formatos de imagem de verdade que o navegador NÃO desenha. */
const RECUSADOS: Record<string, string> = {
  heic: "HEIC",
  heif: "HEIF",
  tif: "TIFF",
  tiff: "TIFF",
};

export type Veredito =
  | { ok: true; extensao: string; contentType: string }
  | { ok: false; erro: string };

function extensaoDe(nome: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(String(nome ?? "").trim());
  return (m?.[1] ?? "").toLowerCase();
}

function extensaoDoTipo(tipo: string): string {
  const t = String(tipo ?? "").toLowerCase();
  if (t === "image/jpeg" || t === "image/jpg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/gif") return "gif";
  if (t === "image/avif") return "avif";
  if (t === "image/heic" || t === "image/heif") return "heic";
  if (t === "image/tiff") return "tiff";
  return "";
}

/** Bytes por MB, pra o teto ser legível onde for usado. */
export const MB = 1024 * 1024;
export const IMAGEM_MAX_MB = 15;

/**
 * Decide. `contentType` e `extensao` saem da MESMA decisão de propósito:
 * gravar `.jpg` com o contentType de outro formato é arquivo mentindo sobre
 * si mesmo, e quebra no navegador de quem for abrir.
 */
export function avaliarImagem(arquivo: { name: string; type: string; size: number }): Veredito {
  if (!arquivo || !arquivo.size) return { ok: false, erro: "Escolha um arquivo." };

  if (arquivo.size > IMAGEM_MAX_MB * MB) {
    const mb = Math.round(arquivo.size / MB);
    return {
      ok: false,
      erro: `A imagem tem ${mb} MB e o limite é ${IMAGEM_MAX_MB} MB. No celular dá pra reenviar em qualidade menor pelo próprio compartilhamento.`,
    };
  }

  // O `type` do arquivo manda; sem ele (WhatsApp, Drive, "Arquivos"), decide
  // a extensão. Um dos dois sempre diz algo — recusar por causa do `type`
  // vazio barraria JPG bom.
  const porTipo = extensaoDoTipo(arquivo.type);
  const porNome = extensaoDe(arquivo.name);
  const ext = porTipo || porNome;

  if (RECUSADOS[ext]) {
    return {
      ok: false,
      erro: `Esse arquivo é ${RECUSADOS[ext]} e o navegador não consegue mostrar. No iPhone: Ajustes → Câmera → Formatos → "Mais compatível", ou abra a foto, toque em compartilhar e escolha "Copiar foto" antes de anexar.`,
    };
  }

  if (!OK.has(ext)) {
    return {
      ok: false,
      erro: "Envie a imagem em JPG, PNG ou WEBP.",
    };
  }

  const normalizada = ext === "jpeg" ? "jpg" : ext;
  const contentType = normalizada === "jpg" ? "image/jpeg" : `image/${normalizada}`;
  return { ok: true, extensao: normalizada, contentType };
}
