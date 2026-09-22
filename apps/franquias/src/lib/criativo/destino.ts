/**
 * Onde o arquivo que o Creatomate devolveu deve ser gravado: no campo da
 * IMAGEM ou no campo do VÍDEO.
 *
 * 🔴 A regra nasceu de um defeito real (Juliana, 08/09/2026): o carrossel dela
 * saiu como um vídeo de bicicleta. O gerador decidia o campo pelo tipo que
 * PEDIU — `if (tipo === "reels") urlVideo = ...; else urlImagem = ...` — e não
 * pelo que de fato voltou. Quando o template do Creatomate rende MP4, o MP4
 * era gravado em `url_imagem_final` e a tela mostrava um vídeo aleatório no
 * lugar da arte. Medido em 22/09: 21 posts em 3 contas nesse estado.
 *
 * A régua agora é o CONTEÚDO da resposta, nunca o pedido. E carrossel/feed são
 * formatos de IMAGEM: vídeo ali não é "campo trocado", é criativo errado — o
 * post fica SEM criativo (cai no Bannerbear) em vez de sair com um vídeo se
 * passando por arte.
 */

export type TipoCriativo = "imagem" | "video";

/** O que o Creatomate responde e que importa pra decidir o destino. */
export type RenderRecebido = {
  url: string;
  /** "jpg" | "png" | "mp4" | "gif" — o que o template de fato produziu. */
  output_format?: string | null;
  /** Segundos. Só existe em vídeo. */
  duration?: number | null;
};

const EXT_VIDEO = /\.(mp4|mov|webm|m4v)(\?|#|$)/i;
const EXT_IMAGEM = /\.(jpe?g|png|webp|avif)(\?|#|$)/i;
const FORMATO_VIDEO = new Set(["mp4", "mov", "webm", "gif"]);
const FORMATO_IMAGEM = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

/**
 * O que veio: imagem ou vídeo. `null` quando nada na resposta diz — e aí quem
 * chama decide o que fazer, em vez de a gente chutar.
 *
 * 🔴 O `output_format` do Creatomate tem precedência sobre a extensão da URL:
 * é o que o servidor declara ter produzido. A extensão é a rede de segurança
 * pra quando o campo não vem (ele é opcional na resposta).
 */
export function tipoDoRender(r: RenderRecebido): TipoCriativo | null {
  const f = String(r.output_format ?? "").trim().toLowerCase();
  if (FORMATO_VIDEO.has(f)) return "video";
  if (FORMATO_IMAGEM.has(f)) return "imagem";

  const url = String(r.url ?? "");
  if (EXT_VIDEO.test(url)) return "video";
  if (EXT_IMAGEM.test(url)) return "imagem";

  // Duração só existe em vídeo. Último recurso, e só quando é positiva:
  // alguns formatos devolvem 0 pra imagem.
  if (typeof r.duration === "number" && r.duration > 0) return "video";

  return null;
}

/** Formatos que o Instagram publica como imagem parada. */
const SO_IMAGEM = new Set(["feed_imagem", "feed_carrossel"]);

/**
 * União discriminada por `ok`: sem isso o TypeScript não consegue estreitar
 * pelo valor de `campo` (os dois membros o teriam), e quem chama não enxerga
 * o `motivo` no ramo da recusa.
 */
export type Destino =
  | { ok: true; campo: "imagem" | "video" }
  | { ok: false; campo: null; motivo: string };

/**
 * Decide o campo — ou recusa.
 *
 * - `feed_imagem` / `feed_carrossel`: só imagem. Vídeo devolvido significa que
 *   o template configurado pra esse tipo é de vídeo; recusar deixa o post cair
 *   no Bannerbear, que é pior que uma arte bonita e MUITO melhor que um vídeo
 *   aleatório na capa do carrossel de uma cliente.
 * - `reels` / `stories`: os dois formatos são legítimos, então o campo segue o
 *   que voltou — vídeo em `url_video_final`, imagem em `url_imagem_final`.
 * - Formato indecifrável: recusa. Gravar sem saber o que é foi exatamente o
 *   que produziu o defeito.
 */
export function destinoDoRender(tipoPost: string, r: RenderRecebido): Destino {
  const tipo = tipoDoRender(r);
  if (tipo === null) {
    return { ok: false, campo: null, motivo: "não deu pra saber se o arquivo é imagem ou vídeo" };
  }
  if (tipo === "video" && SO_IMAGEM.has(tipoPost)) {
    return {
      ok: false,
      campo: null,
      motivo: `o template devolveu vídeo e ${tipoPost} é formato de imagem — confira qual template está configurado pra esse tipo`,
    };
  }
  return { ok: true, campo: tipo === "video" ? "video" : "imagem" };
}

/**
 * O formato que a gente PEDE ao Creatomate, por tipo de post. Pedir é o que
 * evita o problema na origem; `destinoDoRender` é a conferência de que veio o
 * que foi pedido. Uma coisa não substitui a outra: o template pode ignorar.
 */
export function formatoPedido(tipoPost: string): "jpg" | "mp4" {
  return SO_IMAGEM.has(tipoPost) ? "jpg" : "mp4";
}
