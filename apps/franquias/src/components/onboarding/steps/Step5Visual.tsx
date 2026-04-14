"use client";

import { CardPicker, Field, FormWrapper } from "@/components/ui/Field";
import { ESTILOS_VISUAIS } from "@/lib/onboarding/steps";
import type { StepFormProps } from "../Wizard";

export function Step5Visual({ dados, atualizar }: StepFormProps) {
  return (
    <FormWrapper
      title="Identidade visual"
      descricao="Cores e estilo — os criativos vão seguir essa paleta. Upload de logo e foto virá na próxima rodada."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Cor primária"
          name="cor_primaria_hex"
          type="color"
          value={dados.cor_primaria_hex as string}
          onChange={(v) => atualizar({ cor_primaria_hex: v })}
          required
        />
        <Field
          label="Cor secundária"
          name="cor_secundaria_hex"
          type="color"
          value={dados.cor_secundaria_hex as string}
          onChange={(v) => atualizar({ cor_secundaria_hex: v })}
        />
        <Field
          label="Cor de acento"
          name="cor_terciaria_hex"
          type="color"
          value={dados.cor_terciaria_hex as string}
          onChange={(v) => atualizar({ cor_terciaria_hex: v })}
        />
      </div>

      <CardPicker
        label="Estilo visual"
        value={dados.estilo_visual as string}
        onChange={(v) => atualizar({ estilo_visual: v })}
        options={ESTILOS_VISUAIS}
        required
      />

      <div className="rounded-lg border border-dashed border-brand-text/20 p-4 text-sm text-brand-text/60">
        📎 Upload de logo, foto profissional e fotos da clínica será adicionado
        na próxima rodada (está em construção). Por enquanto, nossa equipe
        coleta esses arquivos por email/WhatsApp durante o onboarding.
      </div>
    </FormWrapper>
  );
}
