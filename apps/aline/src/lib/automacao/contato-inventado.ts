/**
 * Trava contra CONTATO INVENTADO no texto que o robô escreve.
 *
 * 🔴 Pedido da Aline (22/09/2026), depois de ler uma resposta do robô: ele
 * ofereceu `contato@scannerdasaude.com`, um e-mail que não existe em lugar
 * nenhum — nem na ficha do perfil, nem nas regras, nem na base. Quem recebe
 * escreve pra lá, ninguém responde, e a pessoa conclui que foi ignorada.
 *
 * A regra no prompt ("nunca invente forma de contato") é PEDIDO, não garantia
 * — a mesma lição das restrições alimentares e das interações no Scanner. Por
 * isso o texto pronto é relido aqui: e-mail, telefone, link ou @ que não
 * apareça no contexto que o modelo recebeu é invenção, e não sai.
 *
 * Sinaliza e REMOVE só o contato, nunca a resposta inteira: a frase em volta
 * costuma estar certa ("a equipe te ajuda com isso"), e jogar tudo fora
 * deixaria a pessoa sem resposta por causa de um endereço.
 */

const RE_EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
const RE_URL = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/giu;
/** Telefone BR com ao menos 8 dígitos no miolo; evita casar ano ou dose. */
const RE_TELEFONE = /(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}\b/g;
/** @perfil — só com 3+ caracteres, pra não casar e-mail já coberto acima. */
const RE_ARROBA = /(^|[^\p{L}\p{N}._%+-])@([\p{L}\p{N}._]{3,})/gu;

function normalizar(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Só os dígitos — "(41) 99249-5825" e "5541992495825" viram comparáveis. */
function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

export type ContatoSuspeito = { tipo: "email" | "telefone" | "link" | "arroba"; valor: string };

/**
 * Contatos que aparecem no TEXTO e não aparecem no CONTEXTO.
 *
 * `contexto` é tudo que o modelo tinha na mão: ficha do perfil, orientações da
 * dona, base do Scanner, histórico da conversa e a pergunta da pessoa.
 */
export function contatosInventados(texto: string, contexto: string): ContatoSuspeito[] {
  const alvo = normalizar(texto);
  const fonte = normalizar(contexto);
  const fonteDigitos = soDigitos(fonte);
  const achados: ContatoSuspeito[] = [];
  const visto = new Set<string>();

  const anotar = (tipo: ContatoSuspeito["tipo"], bruto: string) => {
    const valor = bruto.trim().replace(/[.,;:)]+$/, "");
    if (!valor) return;
    const chave = `${tipo}:${normalizar(valor)}`;
    if (visto.has(chave)) return;
    visto.add(chave);
    achados.push({ tipo, valor });
  };

  for (const m of alvo.matchAll(RE_EMAIL)) {
    if (!fonte.includes(m[0])) anotar("email", m[0]);
  }
  for (const m of alvo.matchAll(RE_URL)) {
    // Compara o domínio: a dona escreve o link curto, o modelo às vezes
    // acrescenta caminho. Domínio que ela nunca citou é que é invenção.
    const dominio = m[0].replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (dominio && !fonte.includes(dominio)) anotar("link", m[0]);
  }
  for (const m of alvo.matchAll(RE_TELEFONE)) {
    const d = soDigitos(m[0]);
    if (d.length >= 8 && !fonteDigitos.includes(d)) anotar("telefone", m[0]);
  }
  for (const m of alvo.matchAll(RE_ARROBA)) {
    if (!fonte.includes(`@${m[2]}`)) anotar("arroba", `@${m[2]}`);
  }
  return achados;
}

/**
 * Tira do texto os contatos inventados, deixando a frase em pé.
 *
 * ⚠️ Remove o contato e a pontuação solta que sobra, nunca a resposta toda.
 */
export function limparContatosInventados(
  texto: string,
  contexto: string,
): { texto: string; removidos: ContatoSuspeito[] } {
  const removidos = contatosInventados(texto, contexto);
  if (removidos.length === 0) return { texto, removidos };
  let out = texto;
  for (const c of removidos) {
    // Casa no texto ORIGINAL (com acento e caixa), por isso a busca é
    // insensível em vez de usar o valor normalizado.
    const re = new RegExp(c.valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "");
  }
  return {
    texto: out
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\(\s*\)|\[\s*\]/g, "")
      .replace(/\s+([.,;:!?])/g, "$1")
      .replace(/([(:,;])\s*([.!?])/g, "$2")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    removidos,
  };
}
