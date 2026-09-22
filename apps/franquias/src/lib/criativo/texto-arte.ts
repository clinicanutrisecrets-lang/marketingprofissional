/**
 * Texto que vai DENTRO da arte (capa, slide, card).
 *
 * 🔴 DUAS REGRAS DA ALINE (22/09/2026), das duas coisas que ela viu nos
 * carrosséis que saíram:
 *
 * 1. "Link nunca é pra ter na arte, sempre só na legenda." No Instagram o
 *    link escrito na imagem não é clicável — quem vê teria que digitar à mão.
 *    Ele entrou ali porque `copy_cta` é gerado COM o checkout por extenso (o
 *    prompt do post de venda pede isso, e está certo: o campo existe pra ser
 *    colado na legenda), e o mesmo `copy_cta` era passado como texto de arte.
 *
 * 2. "O CTA tá na capa e não no final do carrossel." A capa é o que para o
 *    scroll; convite de ação ali queima o slide mais caro do post. O último
 *    slide é o lugar dele — e o renderizador já cria esse slide.
 *
 * Este arquivo é a fonte única das duas regras, porque são TRÊS os caminhos
 * que põem texto em imagem (editor de arte, geração semanal via Creatomate e
 * o fallback Bannerbear). Escrita em três lugares, a regra diverge calada.
 */

/**
 * URL http(s), com ou sem protocolo. O `\S` no corpo é de propósito: link não
 * tem espaço, e parar no espaço evita comer a frase inteira depois dele.
 */
const RE_URL = /\bhttps?:\/\/\S+/gi;
const RE_WWW = /\bwww\.\S+/gi;

/**
 * Domínio escrito sem protocolo nem www ("scannerdasaude.com/x", "bit.ly/y").
 *
 * 🔴 A lista de terminações é FECHADA de propósito. Um `\.[a-z]{2,}` genérico
 * comeria o fim de frase em português — "chegou. Agora olha" tem o mesmo
 * formato — e apagar a copy da nutri é pior que deixar passar um link raro.
 */
const RE_DOMINIO =
  /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|com\.br|br|net|org|io|app|me|co|link|bio|site)\b(?:\/\S*)?/gi;

/** Tem link no texto? */
export function temLink(texto: string | null | undefined): boolean {
  const t = String(texto ?? "");
  // `RegExp.test` com /g guarda lastIndex entre chamadas — copiar o padrão
  // evita que a segunda pergunta sobre o mesmo texto responda errado.
  return (
    new RegExp(RE_URL.source, "i").test(t) ||
    new RegExp(RE_WWW.source, "i").test(t) ||
    new RegExp(RE_DOMINIO.source, "i").test(t)
  );
}

/**
 * Tira o link e devolve o que sobra, limpo.
 *
 * Sobrando só pontuação ou conectivo solto ("Garanta o seu em:"), devolve
 * string vazia — meia frase apontando pra lugar nenhum é pior que nada.
 */
export function semLink(texto: string | null | undefined): string {
  const bruto = String(texto ?? "");
  if (!bruto.trim()) return "";

  const limpo = bruto
    .replace(RE_URL, " ")
    .replace(RE_WWW, " ")
    .replace(RE_DOMINIO, " ")
    // pontuação que ficou pendurada onde o link estava
    .replace(/[ \t]*[:—–-][ \t]*$/gm, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

  // Restou só ligação sem destino? Então não restou nada.
  if (!limpo || /^[\s\p{P}]*$/u.test(limpo)) return "";
  if (limpo.length < 4) return "";
  if (/^(acesse|clique|link|compre|garanta|entre|veja)[\s\p{P}]*$/iu.test(limpo)) return "";

  return limpo;
}

export type TextoDeArte = {
  /** O texto pronto pra desenhar. String vazia = não desenhe nada. */
  texto: string;
  /** Havia link e ele saiu — a tela precisa dizer isso pra nutri. */
  removeuLink: boolean;
};

/** Passa qualquer texto que vá virar pixel por aqui. */
export function textoDeArte(bruto: string | null | undefined): TextoDeArte {
  const tinha = temLink(bruto);
  return { texto: semLink(bruto), removeuLink: tinha };
}

/**
 * O CTA aparece no ÚLTIMO slide, nunca na capa.
 *
 * Recebe o CTA já escrito e a posição do slide; devolve o que aquele slide
 * deve mostrar. Peça única (post de imagem, stories) mantém o CTA: ali não
 * existe "último slide" pra onde mandá-lo.
 */
export function ctaDoSlide(params: {
  cta: string | null | undefined;
  indice: number;
  total: number;
}): string {
  const { cta, indice, total } = params;
  const limpo = semLink(cta);
  if (!limpo) return "";
  if (total <= 1) return limpo;
  return indice === total - 1 ? limpo : "";
}
