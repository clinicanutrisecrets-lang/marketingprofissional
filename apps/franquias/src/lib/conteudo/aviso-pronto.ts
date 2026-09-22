import {
  aprovacaoEmRevisao,
  aprovacaoVazia,
  type AprovacaoCandidata,
} from "../aprovacao/semana.ts";

/**
 * O aviso de "seus conteúdos ficaram prontos" no painel.
 *
 * Pedido da Aline (22/09/2026): "quando aperta ali Pedir conteúdo, quando fica
 * pronto, tem como no banner inicial do dashboard ter escrito 'seus conteúdos
 * ficaram prontos, clique aqui para aprovar' e daí tem um CTA que direciona".
 *
 * Antes não havia aviso NENHUM: o pedido dela virava post na geração da semana
 * e a única forma de descobrir era entrar em "Aprovar semana" no chute.
 *
 * 🔴 O AVISO SOME PELA AÇÃO QUE ELE PEDE, não por um "ok, vi". Ele vale
 * enquanto a semana está em revisão; no momento em que ela aprova, some
 * sozinho. Um "marcar como lido" deixaria o aviso ir embora sem nada ter sido
 * aprovado — e ela ficaria com os posts parados achando que resolveu.
 *
 * 🔴 SEMANA SEM POST NÃO AVISA. A linha de aprovação nasce ANTES dos posts, e
 * geração que falha no meio deixa a carcaça pra trás (`aprovacaoVazia`).
 * Avisar ali mandaria a nutri numa tela vazia.
 */

export type PedidoAtendido = {
  /** Assunto que ela pediu, como ela escreveu. */
  tema: string;
  /** Semana em que o pedido entrou (`semana_alvo` do briefing). */
  semana: string | null;
};

export type AvisoConteudoPronto = {
  titulo: string;
  detalhe: string;
  /** Rótulo do botão. */
  acao: string;
  href: string;
};

export function avisoConteudoPronto(params: {
  aprovacao: AprovacaoCandidata | null;
  /** Pedidos dela já atendidos (briefings com status "usado"). */
  pedidosAtendidos: PedidoAtendido[];
}): AvisoConteudoPronto | null {
  const { aprovacao } = params;
  if (!aprovacao) return null;
  if (aprovacaoVazia(aprovacao)) return null;
  if (!aprovacaoEmRevisao(aprovacao.status)) return null;

  const posts = aprovacao.posts;
  const plural = posts === 1 ? "1 post" : `${posts} posts`;

  // Pedido dela que entrou NESTA semana — é o que ela está esperando.
  const meus = params.pedidosAtendidos.filter((p) => p.semana === aprovacao.semana_ref);
  const temas = meus.map((p) => p.tema.trim()).filter(Boolean);

  const detalhe = temas.length
    ? `${plural} esperando você, incluindo o que você pediu sobre ${listar(temas)}.`
    : `${plural} com arte e legenda esperando a sua aprovação.`;

  return {
    titulo: temas.length
      ? "O conteúdo que você pediu ficou pronto"
      : "Seus conteúdos da semana ficaram prontos",
    detalhe,
    acao: "Aprovar semana",
    href: "/dashboard/aprovar",
  };
}

/** "a", "a e b", "a, b e c" — sem travessão e sem vírgula antes do "e". */
function listar(itens: string[]): string {
  const ate3 = itens.slice(0, 3);
  if (ate3.length === 1) return ate3[0]!;
  const resto = itens.length > 3 ? ` e mais ${itens.length - 3}` : "";
  return `${ate3.slice(0, -1).join(", ")} e ${ate3[ate3.length - 1]}${resto}`;
}
