"use client";

import { Field, FormWrapper, Select, TextArea } from "@/components/ui/Field";
import { NICHOS_OPCOES } from "@/lib/onboarding/steps";
import type { StepFormProps } from "../Wizard";

export function Step2Especialidade({ dados, atualizar }: StepFormProps) {
  return (
    <FormWrapper
      title="Sua especialidade"
      descricao="Isso guia a IA na hora de gerar conteúdo com o tom e ângulo certos."
    >
      <Select
        label="Nicho principal"
        name="nicho_principal"
        value={dados.nicho_principal as string}
        onChange={(v) => atualizar({ nicho_principal: v })}
        options={NICHOS_OPCOES}
        required
        hint="O que você mais atende"
      />
      <Select
        label="Nicho secundário (opcional)"
        name="nicho_secundario"
        value={dados.nicho_secundario as string}
        onChange={(v) => atualizar({ nicho_secundario: v })}
        options={NICHOS_OPCOES}
      />
      <Field
        label="Anos de experiência"
        name="anos_experiencia"
        type="number"
        value={dados.anos_experiencia as number}
        onChange={(v) => atualizar({ anos_experiencia: v ? Number(v) : null })}
      />
      <TextArea
        label="Quem é seu paciente ideal?"
        name="publico_alvo_descricao"
        value={dados.publico_alvo_descricao as string}
        onChange={(v) => atualizar({ publico_alvo_descricao: v })}
        placeholder="Ex: mulheres 30-50 com fadiga crônica, resistentes a dieta, que já tentaram várias abordagens..."
        required
        rows={3}
      />
      <TextArea
        label="O que você faz diferente?"
        name="diferenciais"
        value={dados.diferenciais as string}
        onChange={(v) => atualizar({ diferenciais: v })}
        placeholder="Seu método, sua abordagem, o que te distingue"
        rows={3}
      />
    </FormWrapper>
  );
}
