"use client";

import { Field, FormWrapper, Select } from "@/components/ui/Field";
import type { StepFormProps } from "../Wizard";
import { ESTADOS_BR } from "@/lib/onboarding/steps";

export function Step1Identidade({ dados, atualizar }: StepFormProps) {
  return (
    <FormWrapper
      title="Sobre você"
      descricao="Comece com seus dados básicos — tudo salva automaticamente."
    >
      <Field
        label="Nome completo"
        name="nome_completo"
        value={dados.nome_completo as string}
        onChange={(v) => atualizar({ nome_completo: v })}
        required
      />
      <Field
        label="Email profissional"
        name="email"
        type="email"
        value={dados.email as string}
        onChange={(v) => atualizar({ email: v })}
        required
      />
      <Field
        label="WhatsApp (com DDD)"
        name="whatsapp"
        type="tel"
        value={dados.whatsapp as string}
        onChange={(v) => atualizar({ whatsapp: v })}
        placeholder="(41) 99999-9999"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="CRN (número)"
          name="crn_numero"
          value={dados.crn_numero as string}
          onChange={(v) => atualizar({ crn_numero: v })}
        />
        <Select
          label="CRN (estado)"
          name="crn_estado"
          value={dados.crn_estado as string}
          onChange={(v) => atualizar({ crn_estado: v })}
          options={ESTADOS_BR.map((e) => ({ value: e, label: e }))}
        />
      </div>
      <Field
        label="Nome comercial"
        name="nome_comercial"
        value={dados.nome_comercial as string}
        onChange={(v) => atualizar({ nome_comercial: v })}
        placeholder='Como aparece pros pacientes, ex: "Dra. Fulana"'
        required
      />
      <Field
        label="Tagline / slogan"
        name="tagline"
        value={dados.tagline as string}
        onChange={(v) => atualizar({ tagline: v })}
        placeholder="Frase curta de posicionamento"
        maxLength={100}
      />
    </FormWrapper>
  );
}
