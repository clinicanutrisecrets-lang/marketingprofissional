"use client";

import { useState } from "react";

type Cenario = "validacao" | "crescimento" | "escala" | "custom";

const CENARIOS: Record<
  Exclude<Cenario, "custom">,
  {
    label: string;
    emoji: string;
    budget: number;
    diario: number;
    pacientesMin: number;
    pacientesMax: number;
    descricao: string;
    indicadoPara: string;
  }
> = {
  validacao: {
    label: "Validação",
    emoji: "🌱",
    budget: 1500,
    diario: 50,
    pacientesMin: 3,
    pacientesMax: 4,
    descricao:
      "Mês 1 enxuto pra validar se anúncio funciona pra você sem comprometer caixa",
    indicadoPara:
      "Quem está começando, tem caixa apertado, ou prefere risco controlado",
  },
  crescimento: {
    label: "Crescimento",
    emoji: "📈",
    budget: 3000,
    diario: 100,
    pacientesMin: 6,
    pacientesMax: 8,
    descricao:
      "Equilíbrio entre risco e retorno. Algoritmo do Meta tem volume pra otimizar bem",
    indicadoPara:
      "Quem já tem fluxo orgânico ativo e quer escalar sem queimar reserva",
  },
  escala: {
    label: "Escala",
    emoji: "🚀",
    budget: 7000,
    diario: 230,
    pacientesMin: 10,
    pacientesMax: 15,
    descricao:
      "Investimento pesado pra crescer rápido. Receita potencial maior, mas risco maior nos primeiros 60 dias",
    indicadoPara:
      "Quem tem 6+ meses de reserva, agenda livre e Sofia já configurada com excelência",
  },
};

const LTV_MEDIO_POR_CONSULTA = 2000;

type Props = {
  budgetAtual: number | null;
  onChangeBudget: (v: number | null) => void;
};

export function CalculadoraBudget({ budgetAtual, onChangeBudget }: Props) {
  const [cenario, setCenario] = useState<Cenario>(() => {
    if (budgetAtual === 1500) return "validacao";
    if (budgetAtual === 3000) return "crescimento";
    if (budgetAtual === 7000) return "escala";
    if (budgetAtual && budgetAtual > 0) return "custom";
    return "validacao";
  });

  const [budgetCustom, setBudgetCustom] = useState(budgetAtual ?? 1500);

  function selecionarCenario(c: Cenario) {
    setCenario(c);
    if (c !== "custom") {
      const valor = CENARIOS[c].budget;
      setBudgetCustom(valor);
      onChangeBudget(valor);
    } else {
      onChangeBudget(budgetCustom);
    }
  }

  function ajustarCustom(v: number) {
    setBudgetCustom(v);
    setCenario("custom");
    onChangeBudget(v);
  }

  // Calcula projeção pra qualquer budget custom
  const budgetEfetivo = cenario === "custom" ? budgetCustom : CENARIOS[cenario as Exclude<Cenario, "custom">].budget;
  const pacientesEstimados = Math.max(1, Math.round((budgetEfetivo / 1500) * 3.5));
  const receitaMes1 = pacientesEstimados * 1500;
  const ltv12meses = pacientesEstimados * LTV_MEDIO_POR_CONSULTA;
  const roasMes1 = (receitaMes1 / budgetEfetivo).toFixed(1);
  const roasLtv = (ltv12meses / budgetEfetivo).toFixed(1);

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-brand-text">
          Quanto você quer investir por mês?
        </label>
        <p className="mb-3 text-xs text-brand-text/60">
          Escolha uma faixa baseada no seu momento. Você pode mudar a qualquer momento.
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(CENARIOS) as Array<Exclude<Cenario, "custom">>).map((c) => {
            const opt = CENARIOS[c];
            const ativo = cenario === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => selecionarCenario(c)}
                className={`text-left rounded-xl border-2 p-4 transition ${
                  ativo
                    ? "border-brand-primary bg-brand-primary/5"
                    : "border-brand-text/10 bg-white hover:border-brand-primary/40"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-lg">{opt.emoji}</span>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      ativo ? "text-brand-primary" : "text-brand-text/60"
                    }`}
                  >
                    {opt.label}
                  </span>
                </div>
                <div className="mt-2 text-2xl font-bold text-brand-text">
                  R$ {opt.budget.toLocaleString("pt-BR")}
                  <span className="text-xs font-normal text-brand-text/60">/mês</span>
                </div>
                <div className="text-xs text-brand-text/60">
                  ≈ R$ {opt.diario}/dia
                </div>
                <div className="mt-3 text-xs text-brand-text/70 leading-relaxed">
                  {opt.descricao}
                </div>
                <div className="mt-2 text-[11px] font-medium text-brand-text/50">
                  Meta: {opt.pacientesMin}-{opt.pacientesMax} pacientes/mês
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom slider */}
        <div className="mt-4 rounded-lg border border-brand-text/10 bg-brand-muted/30 p-4">
          <label className="mb-2 flex items-center justify-between text-xs font-medium text-brand-text/70">
            <span>Ou ajuste o valor manual:</span>
            <span className="text-base font-bold text-brand-text">
              R$ {budgetCustom.toLocaleString("pt-BR")}/mês
            </span>
          </label>
          <input
            type="range"
            min={500}
            max={15000}
            step={500}
            value={budgetCustom}
            onChange={(e) => ajustarCustom(Number(e.target.value))}
            className="w-full accent-brand-primary"
          />
          <div className="mt-1 flex justify-between text-[10px] text-brand-text/50">
            <span>R$ 500</span>
            <span>R$ 15.000</span>
          </div>
          {budgetCustom < 1500 && (
            <p className="mt-2 text-xs text-amber-700">
              ⚠ Abaixo de R$ 1.500/mês o algoritmo do Meta tem dificuldade de aprender
              quem é seu paciente ideal. Considere o cenário "Validação".
            </p>
          )}
        </div>
      </div>

      {/* Disclaimer crítico: pra onde vai o dinheiro */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900">
        <div className="font-semibold mb-2">💡 Esse valor é pago direto ao Facebook</div>
        <p className="leading-relaxed">
          O budget que você escolher acima vai <strong>100% pro Meta (Facebook/Instagram)</strong>{" "}
          como pagamento de mídia. <strong>Scanner não cobra comissão sobre ad spend</strong> —
          nosso plano de assinatura já cobre o gerenciamento. Você paga só o que o Meta
          consumir.
        </p>
        <p className="mt-2 leading-relaxed">
          O piso de R$ 1.500-3.000/mês não é nosso interesse — é uma{" "}
          <strong>limitação técnica do algoritmo do Meta</strong>: abaixo desse volume ele
          não consegue otimizar entrega e custo por conversão fica artificialmente alto.
          Se você prefere começar sem ads, perfeitamente possível —{" "}
          <strong>desmarque a opção acima</strong> e o sistema foca 100% em orgânico.
        </p>
      </div>

      {/* Projeção em tempo real */}
      <div className="rounded-xl border border-brand-text/10 bg-white p-5">
        <h4 className="mb-3 text-sm font-semibold text-brand-text">
          Projeção com R$ {budgetEfetivo.toLocaleString("pt-BR")}/mês
        </h4>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Metric
            label="Pacientes estimados"
            value={`${pacientesEstimados}/mês`}
            cor="default"
          />
          <Metric
            label="Receita mês 1"
            value={`R$ ${receitaMes1.toLocaleString("pt-BR")}`}
            cor="default"
          />
          <Metric
            label="ROAS mês 1"
            value={`${roasMes1}x`}
            cor={Number(roasMes1) >= 2 ? "green" : "amber"}
          />
          <Metric
            label="LTV 12 meses"
            value={`R$ ${ltv12meses.toLocaleString("pt-BR")}`}
            cor="green"
            subtitle={`ROAS LTV: ${roasLtv}x`}
          />
        </div>
        <p className="mt-3 text-xs text-brand-text/60">
          Premissa: cada paciente gera ~R$ 1.500 (Diagnóstico Inicial) no mês 1 e ~R$
          2.000 de LTV em 12 meses (consultas, tratamento, comissões). Estimativas
          baseadas em conversão média do nicho saúde premium BR.
        </p>
      </div>

      {/* Disclaimer LTV completo */}
      <details className="rounded-xl border border-brand-text/10 bg-amber-50/30 p-4">
        <summary className="cursor-pointer text-sm font-medium text-brand-text">
          📊 Como calcular o retorno de verdade (Lifetime Value)
        </summary>
        <div className="mt-4 space-y-3 text-sm text-brand-text/80 leading-relaxed">
          <p>
            <strong>O valor real de uma paciente não é só a primeira consulta.</strong> Em
            12 meses de acompanhamento, cada paciente que entra rende em média:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>R$ 650</strong> — primeira consulta (100%)
            </li>
            <li>
              <strong>R$ 400</strong> — comissão do teste nutrigenético (~30% dos casos)
            </li>
            <li>
              <strong>R$ 1.950</strong> — tratamento nutrigenético (3 meses × R$ 650, ~50%
              das pacientes retornam)
            </li>
            <li>
              <strong>R$ 650</strong> — checkup anual (~40% das pacientes)
            </li>
          </ul>
          <p className="font-semibold">LTV médio: ~R$ 2.000 por paciente em 12 meses.</p>
          <p className="text-xs italic text-brand-text/60">
            💡 Em breve: teste epigenético — novo produto que liberamos no próximo
            trimestre, com comissão estimada de R$ 600 por paciente. Vai somar ao seu LTV
            quando disponível.
          </p>
        </div>
      </details>

      {/* Disclaimer 2 meses de aprendizado */}
      <details className="rounded-xl border border-brand-text/10 bg-blue-50/30 p-4">
        <summary className="cursor-pointer text-sm font-medium text-brand-text">
          ⏱ Como funcionam os primeiros 60 dias
        </summary>
        <div className="mt-4 space-y-3 text-sm text-brand-text/80 leading-relaxed">
          <p>
            <strong>Primeiros 30-45 dias:</strong> o algoritmo do Meta precisa de dados de
            conversão reais (agendamentos confirmados, vendas) pra aprender quem é seu
            paciente ideal. Nesse período, o custo por paciente pode ser{" "}
            <strong>1,5-2x maior</strong> que a média estável.
          </p>
          <p>
            <strong>Isso não significa que os ads não funcionam</strong> — significa que
            você está pagando o "treinamento" do algoritmo. Pacientes vêm sim, só são mais
            caros nessa fase.
          </p>
          <p>
            <strong>A partir do 2º mês:</strong> com Conversions API alimentando o Meta
            (eventos de venda do teste, agendamentos), o custo cai e a qualidade do lead
            sobe.
          </p>
          <p>
            <strong>Recomendação prática:</strong> pense em compromisso mínimo de 90 dias
            pra leitura correta. Quem desiste no mês 1 paga só o custo de aprendizado,
            sem colher resultado. Os primeiros 60 dias são investimento; a partir do 3º
            mês é escala.
          </p>
        </div>
      </details>
    </div>
  );
}

function Metric({
  label,
  value,
  subtitle,
  cor = "default",
}: {
  label: string;
  value: string;
  subtitle?: string;
  cor?: "default" | "green" | "amber" | "red";
}) {
  const corMap = {
    default: "text-brand-text",
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };
  return (
    <div className="rounded-lg bg-brand-muted/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-brand-text/60">{label}</div>
      <div className={`mt-1 text-lg font-bold ${corMap[cor]}`}>{value}</div>
      {subtitle && (
        <div className="mt-0.5 text-[10px] text-brand-text/60">{subtitle}</div>
      )}
    </div>
  );
}
