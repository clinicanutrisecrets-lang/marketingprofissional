/**
 * Lógica pura de otimização de campanhas (auto-pausa + realocação de budget).
 * Sem I/O → testável. Baseada nos frameworks Sobral/Pittman/Mandalia já usados
 * no revisor de ads. O cron otimizar-ads executa as decisões.
 */

export type MetricasAnuncio = {
  diasAtivo: number;
  gastoTotal: number;
  leads: number;
  cpl: number | null;
  ctr: number | null; // em %
  frequency: number | null;
  budgetDiario: number;
  /** CPL mediano de mercado pro nicho/objetivo (benchmark) */
  cplBenchmarkMediano: number | null;
  /** quanto ainda resta do orçamento mensal da nutri */
  capMensalRestante: number;
};

export type AcaoAnuncio = "aguardar" | "pausar" | "escalar" | "manter";

export type DecisaoAnuncio = {
  acao: AcaoAnuncio;
  motivo: string;
  /** preenchido quando acao === "escalar" */
  novoBudgetDiario?: number;
  /** sinal pra trocar criativo (saturação), sem pausar */
  alertaSaturacao?: boolean;
};

const DIAS_MINIMOS = 3;
const GASTO_SEM_LEAD = 200; // R$ gastos sem nenhum lead → desperdício
const MULT_CPL_CRITICO = 2.5; // CPL acima de 2.5x o mediano → pausar
const FREQ_SATURACAO = 2.5;
const FATOR_ESCALA = 1.25; // +25% no budget do vencedor

/** Arredonda budget pra 2 casas, nunca abaixo de R$1/dia. */
function arredondarBudget(v: number): number {
  return Math.max(1, Math.round(v * 100) / 100);
}

/**
 * Decide a ação pra um anúncio com base nas métricas vs benchmark.
 * Conservador na auto-pausa: só pausa em desperdício claro.
 */
export function decidirAcaoAnuncio(m: MetricasAnuncio): DecisaoAnuncio {
  // 1. Dados insuficientes → não age
  if (m.diasAtivo < DIAS_MINIMOS) {
    return { acao: "aguardar", motivo: `Só ${m.diasAtivo}d ativo — aguardando dados (mín. ${DIAS_MINIMOS}d).` };
  }

  // 2. Desperdício duro: gastou e não trouxe lead
  if (m.gastoTotal >= GASTO_SEM_LEAD && m.leads === 0) {
    return {
      acao: "pausar",
      motivo: `R$${m.gastoTotal.toFixed(2)} gastos sem nenhum lead — pausar e trocar criativo/segmentação.`,
    };
  }

  // 3. CPL muito acima do mercado
  if (m.cpl && m.cplBenchmarkMediano && m.cpl > MULT_CPL_CRITICO * m.cplBenchmarkMediano) {
    return {
      acao: "pausar",
      motivo: `CPL R$${m.cpl.toFixed(2)} > ${MULT_CPL_CRITICO}x o mercado (R$${m.cplBenchmarkMediano.toFixed(2)}).`,
    };
  }

  const saturado = (m.frequency ?? 0) >= FREQ_SATURACAO;

  // 4. Vencedor → escalar budget (frequência saudável + CPL claramente bom + leads consistentes)
  // "bom" = CPL <= 80% do mediano (faixa boa do benchmark), não apenas na média.
  const cplBom =
    m.cpl != null && m.cplBenchmarkMediano != null && m.cpl <= m.cplBenchmarkMediano * 0.8;
  const freqSaudavel = (m.frequency ?? 0) >= 1.2 && (m.frequency ?? 0) <= 2.0;
  if (cplBom && freqSaudavel && m.leads >= 3 && !saturado) {
    const alvo = arredondarBudget(m.budgetDiario * FATOR_ESCALA);
    // não deixa a escalada de 1 dia ultrapassar o que resta no mês
    const teto = arredondarBudget(m.budgetDiario + Math.max(0, m.capMensalRestante));
    const novoBudgetDiario = Math.min(alvo, teto);
    if (novoBudgetDiario > m.budgetDiario) {
      return {
        acao: "escalar",
        motivo: `Vencedor: CPL R$${m.cpl!.toFixed(2)} <= mercado, freq ${m.frequency}, ${m.leads} leads. Escalar budget.`,
        novoBudgetDiario,
      };
    }
  }

  // 5. Saturação sem ser desperdício → mantém, mas sinaliza troca de criativo
  if (saturado) {
    return {
      acao: "manter",
      motivo: `Frequência ${m.frequency} alta (saturação) — recomendado trocar criativo.`,
      alertaSaturacao: true,
    };
  }

  return { acao: "manter", motivo: "Performance dentro do esperado." };
}
