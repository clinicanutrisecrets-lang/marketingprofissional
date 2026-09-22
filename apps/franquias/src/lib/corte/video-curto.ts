/**
 * Vídeo curto: um clipe da biblioteca com a frase escrita em cima.
 *
 * Pedido da Aline (22/09/2026): "fazer aqueles vídeos curtinhos que é só o
 * vídeo com uma escrita em cima, que está na moda".
 *
 * 🔴 ESTA RÉGUA É ESPELHO da do worker (packages/corte-ia/clipe_frase.py).
 * Os números vivem nos dois lados porque a tela precisa recusar ANTES de
 * gastar uma rodada de worker, e o worker precisa recusar mesmo que alguém
 * chame a rota direto. Mudou aqui, muda lá — há teste comparando os dois
 * arquivos, justamente pra não divergirem calados.
 */

export const FRASE_MAX = 120;
export const DUR_MIN = 2;
export const DUR_MAX = 15;
export const DUR_PADRAO = 8;

export type Avaliacao = { ok: true; frase: string } | { ok: false; msg: string };

/** Frase pronta pra tela, ou o motivo da recusa em linguagem de quem lê. */
export function avaliarFrase(bruta: string): Avaliacao {
  const frase = (bruta || "").split(/\s+/).filter(Boolean).join(" ");
  if (!frase) return { ok: false, msg: "Escreva a frase que vai aparecer no vídeo." };
  if (frase.length > FRASE_MAX) {
    return {
      ok: false,
      msg: `A frase tem ${frase.length} caracteres e no vídeo curto cabem ${FRASE_MAX}. Corte pro essencial, que é o que faz esse formato funcionar.`,
    };
  }
  return { ok: true, frase };
}

/**
 * Duração final. Nunca passa do clipe: repetir ou congelar o último quadro
 * entrega vídeo travado, que é pior que vídeo curto.
 */
export function duracaoFinal(pedida: number | null | undefined, duracaoClipe: number | null | undefined): number {
  const d = Math.max(DUR_MIN, Math.min(DUR_MAX, pedida || DUR_PADRAO));
  const clipe = duracaoClipe && duracaoClipe > 0 ? duracaoClipe : null;
  return clipe ? Math.round(Math.min(d, clipe) * 100) / 100 : d;
}

/** De onde o clipe veio. A URL nunca sai da tela — só o id. */
export type OrigemClipe = "biblioteca" | "acervo";

export function origemValida(v: unknown): OrigemClipe {
  return v === "acervo" ? "acervo" : "biblioteca";
}

/**
 * Onde a faixa com a frase fica na altura do vídeo — 0 é o topo, 1 é o pé.
 *
 * Pedido da Aline (22/09/2026): "como se fosse o editor igual do Instagram,
 * que é só eu mover para cima e para baixo, eu colocar na posição que eu
 * quero". Até aqui a faixa era sempre o centro exato da tela, e o centro é
 * justamente onde o assunto do clipe costuma estar.
 *
 * 🔴 É FRAÇÃO, NUNCA PIXEL. A tela desenha sobre uma miniatura de tamanho
 * qualquer e o worker renderiza em 1080x1920; mandar pixel da tela faria a
 * frase sair num lugar no preview e noutro no vídeo.
 */
export const POS_PADRAO = 0.5;

/** Quanto a faixa não pode invadir em cima e embaixo, em fração da altura.
 *  Embaixo a folga é maior por causa da assinatura (@handle), que mora no pé
 *  do vídeo: faixa por cima dela some com a assinatura. */
export const POS_MIN = 0.18;
export const POS_MAX = 0.82;

/** A faixa não passa daqui pra baixo: é onde mora a assinatura (@handle), no
 *  pé do vídeo. Vale como teto da BORDA de baixo da faixa, não do centro —
 *  frase de cinco linhas puxada pro pé engoliria a assinatura inteira. */
export const PISO_FAIXA = 0.906;

/**
 * Posição válida. Valor ausente, texto, NaN ou fora da faixa nunca vira erro:
 * vira o centro de sempre, que é o comportamento que já existia. Recusar aqui
 * jogaria fora um vídeo inteiro por causa de um número.
 */
export function posicaoFaixa(v: unknown): number {
  // 🔴 Só número e texto de número contam. `Number(null)` e `Number("")` dão
  // ZERO, e zero aqui é o topo da tela: campo vazio empurraria a frase pro
  // alto em vez de deixá-la no centro, que é o comportamento de sempre.
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim() !== ""
        ? Number(v)
        : NaN;
  if (!Number.isFinite(n)) return POS_PADRAO;
  const clamp = Math.min(POS_MAX, Math.max(POS_MIN, n));
  return Math.round(clamp * 1000) / 1000;
}

/**
 * Posição válida quando já se sabe a ALTURA da faixa (em fração da altura do
 * vídeo). É a mesma conta que o worker faz depois de medir o texto: a faixa
 * tem que caber inteira e não pode invadir a assinatura no pé.
 *
 * Existe pra o arraste na tela parar onde o vídeo vai parar. Sem isto, a
 * frase de cinco linhas ficava colada no pé no preview e subia no vídeo.
 */
export function posicaoComFaixaDentro(centro: unknown, alturaFracao: number): number {
  const h = Math.min(1, Math.max(0, Number(alturaFracao) || 0));
  const meia = h / 2;
  const min = Math.max(POS_MIN, meia);
  const max = Math.min(POS_MAX, PISO_FAIXA - h + meia);
  // Faixa maior que o espaço que sobra: não há posição a escolher, vale o
  // centro — é o que o worker também faz.
  if (max < min) return POS_PADRAO;
  const bruto = posicaoFaixa(centro);
  return Math.round(Math.min(max, Math.max(min, bruto)) * 1000) / 1000;
}
