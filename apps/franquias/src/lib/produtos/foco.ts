/**
 * Quais produtos do catálogo espelhado (produtos_scanner) podem aparecer em
 * post. Função pura: roda no teste e no navegador.
 *
 * 🔴 O catálogo que vem do Tratamentos traz ofertas que NÃO são de venda pra
 * paciente. Medido em 02/10/2026, nas 6 contas: a "Experiência Clínica —
 * Teste Nutrigenético" e o "Teste Epigenético" de compra própria (o teste que
 * a profissional compra pra si, a preço de custo, escondido da vitrine; slug
 * `compra-propria-*`), uma oferta de teste interno do split e a peça do combo
 * do Lótus. Em 5 das 6 contas o ÚNICO epigenético do espelho era o de compra
 * própria: o pacote da semana podia pôr o link de custo num post de venda.
 *
 * A régua é o SLUG do checkout, que é o que o Tratamentos escreve de propósito
 * (`compra-propria-<id>`), e o nome da Experiência como rede. Nada disso
 * depende de o modelo entender a diferença.
 */

/** Oferta que não se vende pra paciente, por slug do checkout ou nome. */
export function ehOfertaNaoVendavel(p: { checkout_url?: string | null; nome?: string | null }): boolean {
  const url = (p.checkout_url ?? "").toLowerCase();
  const slug = url.replace(/\/checkout\/?$/, "").split("/").pop() ?? "";
  if (/^compra-propria-/.test(slug)) return true;
  if (/(^|-)teste-interno(-|$)/.test(slug)) return true;
  if (/sandbox/.test(slug)) return true;
  // A peça do combo do Lótus só existe dentro do combo, com preço do combo.
  if (/^lotus-/.test(slug)) return true;
  const nome = (p.nome ?? "").toLowerCase();
  if (nome.startsWith("experiência clínica") || nome.startsWith("experiencia clinica")) return true;
  if (nome.includes("não vender") || nome.includes("nao vender")) return true;
  return false;
}

/**
 * Os produtos que a ESTRATÉGIA DA SEMANA divulga (Aline, 02/10/2026, para
 * todas as contas): só o teste nutrigenético e o epigenético. Os outros
 * produtos dela continuam no catálogo e ela cria o post à mão em "Posts de
 * venda".
 */
export const PRODUTOS_FOCO_ESTRATEGIA = ["teste_genetico", "teste_epigenetico"] as const;

export function produtosDaEstrategia<
  T extends { scanner_produto_id?: string | null; checkout_url?: string | null; nome?: string | null },
>(produtos: T[]): T[] {
  return produtos.filter(
    (p) =>
      !!p.scanner_produto_id &&
      (PRODUTOS_FOCO_ESTRATEGIA as readonly string[]).includes(p.scanner_produto_id) &&
      !ehOfertaNaoVendavel(p),
  );
}
