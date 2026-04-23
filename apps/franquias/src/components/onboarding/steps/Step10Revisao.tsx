"use client";

import { useState } from "react";
import { FormWrapper } from "@/components/ui/Field";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";
import type { StepFormProps } from "../Wizard";

type Props = StepFormProps & {
  onFinalizar: () => Promise<void>;
};

export function Step10Revisao({ dados, onFinalizar }: Props) {
  const [loading, setLoading] = useState(false);

  const resumo = ONBOARDING_STEPS.slice(0, 9).map((step) => {
    const obrigatoriosPreenchidos = step.camposObrigatorios.filter((c) =>
      isPreenchido(dados[c]),
    ).length;
    const totalObrigatorios = step.camposObrigatorios.length;
    const ok = totalObrigatorios === 0 || obrigatoriosPreenchidos === totalObrigatorios;
    return { step, ok, obrigatoriosPreenchidos, totalObrigatorios };
  });

  const tudoOk = resumo.every((r) => r.ok);

  async function handleFinalizar() {
    setLoading(true);
    await onFinalizar();
    setLoading(false);
  }

  return (
    <FormWrapper
      title="Revisão final"
      descricao="Confira o status de cada etapa antes de finalizar."
    >
      <div className="space-y-2">
        {resumo.map((r) => (
          <div
            key={r.step.id}
            className="flex items-center justify-between rounded-lg border border-brand-text/10 p-3"
          >
            <div>
              <div className="font-medium text-brand-text">
                {r.step.id}. {r.step.label}
              </div>
              <div className="text-xs text-brand-text/60">{r.step.descricao}</div>
            </div>
            <div className="text-sm">
              {r.ok ? (
                <span className="text-green-600">✓ Completo</span>
              ) : (
                <span className="text-amber-600">
                  {r.obrigatoriosPreenchidos}/{r.totalObrigatorios} obrigatórios
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!tudoOk && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          Você pode finalizar mesmo com campos faltando — a equipe completa o
          que está pendente durante a reunião de onboarding.
        </div>
      )}

      <button
        type="button"
        onClick={handleFinalizar}
        disabled={loading}
        className="w-full rounded-lg bg-brand-primary px-5 py-3 text-base font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
      >
        {loading ? "Finalizando..." : "Finalizar onboarding →"}
      </button>

      <p className="text-center text-xs text-brand-text/60">
        Sua LP fica pronta em até 24h e os primeiros posts em até 48h.
      </p>
    </FormWrapper>
  );
}

function isPreenchido(valor: unknown): boolean {
  if (valor == null) return false;
  if (typeof valor === "string") return valor.trim().length > 0;
  if (Array.isArray(valor)) return valor.length > 0;
  return true;
}
