"use client";

import { Field, FormWrapper, TextArea } from "@/components/ui/Field";
import type { StepFormProps } from "../Wizard";

export function Step4Historia({ dados, atualizar }: StepFormProps) {
  return (
    <FormWrapper
      title="Sua história"
      descricao="Esses textos viram matéria-prima pra IA gerar copy autêntico."
    >
      <TextArea
        label="Por que você escolheu ser nutricionista?"
        name="historia_pessoal"
        value={dados.historia_pessoal as string}
        onChange={(v) => atualizar({ historia_pessoal: v })}
        placeholder="Escreva com suas palavras — motivação, trajetória, o que te move hoje"
        rows={5}
        required
      />
      <TextArea
        label="Qual transformação de paciente te marcou?"
        name="resultado_transformacao"
        value={dados.resultado_transformacao as string}
        onChange={(v) => atualizar({ resultado_transformacao: v })}
        placeholder="Um caso específico que mostra o tipo de resultado que você gera"
        rows={5}
        required
      />
      <Field
        label="Quantos pacientes já atendeu? (aproximado)"
        name="numero_pacientes_atendidos"
        type="number"
        value={dados.numero_pacientes_atendidos as number}
        onChange={(v) =>
          atualizar({ numero_pacientes_atendidos: v ? Number(v) : null })
        }
      />
      <TextArea
        label='Texto "Sobre mim" para a LP'
        name="descricao_longa"
        value={dados.descricao_longa as string}
        onChange={(v) => atualizar({ descricao_longa: v })}
        placeholder="Versão mais longa e cuidada — pode ser em terceira pessoa"
        rows={6}
      />
    </FormWrapper>
  );
}
