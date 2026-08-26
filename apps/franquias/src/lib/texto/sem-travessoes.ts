/**
 * Remoção determinística de travessões do conteúdo gerado.
 *
 * Pedido da Aline (26/08/2026): NENHUM conteúdo de marketing sai com
 * travessão ("—") nem meia-risca ("–"). A regra também está nos prompts,
 * mas prompt é pedido, não garantia — este sanitizador é a trava que vale
 * mesmo quando o modelo ignora a instrução. Aplicar em TODO ponto que
 * transforma resposta do Claude em conteúdo (legenda, slide, roteiro,
 * LP, spec de reel).
 *
 * Hífen comum ("anti-inflamatório", "low-carb", "70-150") não é tocado.
 * Cópia idêntica em apps/aline/src/lib/texto/sem-travessoes.ts — mudou
 * aqui, mude lá.
 */

export function semTravessoes(texto: string): string {
  if (!texto || !/[—–]/.test(texto)) return texto;
  return (
    texto
      // faixa numérica ("70—150", "40 – 60") vira hífen simples
      .replace(/(\d)\s*[—–]\s*(\d)/g, "$1-$2")
      // travessão abrindo linha (item de lista) vira hífen de lista
      .replace(/^[—–]\s*/gm, "- ")
      // logo após pontuação final o travessão é só ruído: cai fora
      .replace(/([.!?…:;])\s*[—–]\s*/g, "$1 ")
      // seguido de maiúscula é quebra de pensamento: vira frase nova
      .replace(/\s*[—–]\s*(?=[A-ZÁÉÍÓÚÂÊÔÃÕÀÇ])/g, ". ")
      // o resto é aposto/continuação: vira vírgula
      .replace(/\s*[—–]\s*/g, ", ")
      // vírgula dupla que a troca possa ter criado
      .replace(/,\s*,/g, ", ")
  );
}

/** Aplica semTravessoes em TODAS as strings de um valor, fundo (arrays e objetos). */
export function semTravessoesFundo<T>(valor: T): T {
  if (typeof valor === "string") return semTravessoes(valor) as unknown as T;
  if (Array.isArray(valor)) {
    return valor.map((v) => semTravessoesFundo(v)) as unknown as T;
  }
  if (valor && typeof valor === "object") {
    const saida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      saida[k] = semTravessoesFundo(v);
    }
    return saida as unknown as T;
  }
  return valor;
}
