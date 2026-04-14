"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_STEPS, calcularPercentual } from "@/lib/onboarding/steps";
import { salvarCamposFranqueada, finalizarOnboarding } from "@/lib/onboarding/actions";
import { AutoSaveHint } from "@/components/ui/Field";
import { Step1Identidade } from "./steps/Step1Identidade";
import { Step2Especialidade } from "./steps/Step2Especialidade";
import { Step3Atendimento } from "./steps/Step3Atendimento";
import { Step4Historia } from "./steps/Step4Historia";
import { Step5Visual } from "./steps/Step5Visual";
import { Step6Redes } from "./steps/Step6Redes";
import { Step7Voz } from "./steps/Step7Voz";
import { Step8ProvaSocial } from "./steps/Step8ProvaSocial";
import { Step9Automacao } from "./steps/Step9Automacao";
import { Step10Revisao } from "./steps/Step10Revisao";
import { cn } from "@/lib/utils";

type WizardProps = {
  initialData: Record<string, unknown>;
  initialStep?: number;
};

export type StepFormProps = {
  dados: Record<string, unknown>;
  atualizar: (campos: Record<string, unknown>) => void;
};

export function Wizard({ initialData, initialStep = 1 }: WizardProps) {
  const router = useRouter();
  const [stepAtual, setStepAtual] = useState(initialStep);
  const [dados, setDados] = useState(initialData);
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvoEm, setUltimoSalvoEm] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const percentualAtual = useMemo(() => calcularPercentual(dados), [dados]);

  const atualizar = useCallback(
    (campos: Record<string, unknown>) => {
      setDados((prev) => ({ ...prev, ...campos }));
      setSalvando(true);
      setErro(null);
      startTransition(async () => {
        const r = await salvarCamposFranqueada(campos);
        setSalvando(false);
        if (r.ok) {
          setUltimoSalvoEm(new Date());
        } else {
          setErro(r.erro ?? "Erro ao salvar");
        }
      });
    },
    [],
  );

  const step = ONBOARDING_STEPS[stepAtual - 1];

  const renderStep = () => {
    const props: StepFormProps = { dados, atualizar };
    switch (stepAtual) {
      case 1: return <Step1Identidade {...props} />;
      case 2: return <Step2Especialidade {...props} />;
      case 3: return <Step3Atendimento {...props} />;
      case 4: return <Step4Historia {...props} />;
      case 5: return <Step5Visual {...props} />;
      case 6: return <Step6Redes {...props} />;
      case 7: return <Step7Voz {...props} />;
      case 8: return <Step8ProvaSocial {...props} />;
      case 9: return <Step9Automacao {...props} />;
      case 10: return <Step10Revisao {...props} onFinalizar={handleFinalizar} />;
      default: return null;
    }
  };

  async function handleFinalizar() {
    const r = await finalizarOnboarding();
    if (r.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setErro(r.erro ?? "Não foi possível finalizar");
    }
  }

  const jaCompleto = !!initialData.onboarding_completo;

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {jaCompleto && (
          <a
            href="/dashboard"
            className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
          >
            ← Voltar ao dashboard
          </a>
        )}
        {/* Barra de progresso */}
        <div className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-brand-text/60">
                Etapa {stepAtual} de {ONBOARDING_STEPS.length}
              </div>
              <h1 className="mt-1 text-lg font-semibold text-brand-text">
                {step.label}
              </h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-brand-primary">{percentualAtual}%</div>
              <AutoSaveHint salvando={salvando || isPending} ultimoSalvoEm={ultimoSalvoEm} />
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-text/5">
            <div
              className="h-full bg-brand-primary transition-all duration-500"
              style={{ width: `${percentualAtual}%` }}
            />
          </div>
        </div>

        {/* Conteúdo da etapa */}
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          {erro && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {erro}
            </div>
          )}
          {renderStep()}
        </div>

        {/* Navegação */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStepAtual((s) => Math.max(1, s - 1))}
            disabled={stepAtual === 1}
            className={cn(
              "rounded-lg border border-brand-text/10 bg-white px-4 py-2.5 text-sm font-medium",
              "hover:border-brand-primary hover:text-brand-primary",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            ← Voltar
          </button>

          <div className="flex gap-1">
            {ONBOARDING_STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => setStepAtual(s.id)}
                title={s.label}
                className={cn(
                  "h-2 w-6 rounded-full transition",
                  s.id === stepAtual
                    ? "bg-brand-primary"
                    : s.id < stepAtual
                      ? "bg-brand-primary/40"
                      : "bg-brand-text/10",
                )}
              />
            ))}
          </div>

          {stepAtual < ONBOARDING_STEPS.length ? (
            <button
              type="button"
              onClick={() => setStepAtual((s) => Math.min(ONBOARDING_STEPS.length, s + 1))}
              className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary/90"
            >
              Próximo →
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
