/**
 * Quem vê cada post da biblioteca.
 *
 * Post sem `requer_scanner_produto` é de todo mundo (o comportamento de
 * sempre). Post COM a lista só aparece pra quem vende aquele produto na
 * Loja do Scanner Tratamentos — é gate de RELEVÂNCIA, não de segurança:
 * post de venda de um produto que a nutri não tem manda o seguidor dela
 * pra um link que não existe.
 *
 * A fonte é o cache `produtos_scanner` (sincronizado do Hub). Funções
 * puras de propósito: a decisão de quem vê o quê não pode ficar espalhada
 * dentro do JSX.
 */

export type PostBibliotecaRow = {
  id: string;
  titulo: string;
  mes_ref: string;
  colecao: string | null;
  formato: string;
  canva_url: string | null;
  imagem_url: string | null;
  requer_scanner_produto: string[] | null;
  observacao: string | null;
  legenda: string;
  ordem: number;
};

export type ProdutoDaNutri = {
  produto_id: string;
  scanner_produto_id: string | null;
};

/**
 * 🔴 Produto que a nutri COMPRA PRA SI, não revende.
 *
 * A "Experiência Clínica — Teste Nutrigenético" é a compra própria do
 * teste (produto da conta clinica-nutri-secrets, oculto da vitrine e dos
 * pacotes dela). Ele chega no cache com `scanner_produto_id =
 * 'teste_genetico'` igual ao DNA 360 — então, sem esta exceção, quem só
 * comprou o teste pra si passaria a receber post pra VENDER um produto
 * que não está na Loja dela.
 */
export const PRODUTOS_COMPRA_PROPRIA = new Set<string>([
  "d2dc4b72-37e3-44e0-b074-42adf7b0d55b",
]);

/** Os `scanner_produto_id` que a nutri de fato VENDE hoje. */
export function produtosQueVende(produtos: ProdutoDaNutri[]): Set<string> {
  const vendidos = new Set<string>();
  for (const p of produtos) {
    if (!p.scanner_produto_id) continue;
    if (PRODUTOS_COMPRA_PROPRIA.has(p.produto_id)) continue;
    vendidos.add(p.scanner_produto_id);
  }
  return vendidos;
}

/** Post liberado pra essa nutri? Lista vazia/nula = post de todas. */
export function postLiberado(
  post: Pick<PostBibliotecaRow, "requer_scanner_produto">,
  vendidos: Set<string>,
): boolean {
  const exigidos = post.requer_scanner_produto ?? [];
  if (exigidos.length === 0) return true;
  return exigidos.some((id) => vendidos.has(id));
}

/** Título e explicação de cada coleção (posts fora da grade de meses). */
export const COLECOES: Record<string, { titulo: string; descricao: string }> = {
  nutrigenetica: {
    titulo: "🧬 Teste genético — DNA 360 e Consulta Nutrigenética",
    descricao:
      "Stories prontos pra vender o seu teste genético. Baixe a arte, poste e mande o interessado pro seu link de checkout — o mesmo que está na sua Loja do Scanner Tratamentos.",
  },
};
