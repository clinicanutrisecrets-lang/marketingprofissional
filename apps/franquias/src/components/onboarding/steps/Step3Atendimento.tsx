"use client";

import { CardPicker, Field, FormWrapper, Select } from "@/components/ui/Field";
import { ESTADOS_BR } from "@/lib/onboarding/steps";
import type { StepFormProps } from "../Wizard";

export function Step3Atendimento({ dados, atualizar }: StepFormProps) {
  const modalidade = dados.modalidade_atendimento as string;
  const aceitaPlano = dados.aceita_plano_saude as boolean;

  return (
    <FormWrapper
      title="Atendimento e valores"
      descricao="Como você atende e quanto cobra."
    >
      <CardPicker
        label="Como você atende?"
        value={modalidade}
        onChange={(v) => atualizar({ modalidade_atendimento: v })}
        options={[
          { value: "presencial", label: "Presencial" },
          { value: "online", label: "Online" },
          { value: "hibrido", label: "Híbrido", descricao: "Os dois" },
        ]}
        required
      />

      {(modalidade === "presencial" || modalidade === "hibrido") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Cidade"
            name="cidade"
            value={dados.cidade as string}
            onChange={(v) => atualizar({ cidade: v })}
          />
          <Select
            label="Estado"
            name="estado"
            value={dados.estado as string}
            onChange={(v) => atualizar({ estado: v })}
            options={ESTADOS_BR.map((e) => ({ value: e, label: e }))}
          />
          <Field
            label="Bairro"
            name="bairro"
            value={dados.bairro as string}
            onChange={(v) => atualizar({ bairro: v })}
            hint="Aparece na LP"
          />
          <Field
            label="Endereço da clínica"
            name="endereco_clinica"
            value={dados.endereco_clinica as string}
            onChange={(v) => atualizar({ endereco_clinica: v })}
            hint="Não aparece na LP, só no seu painel"
          />
        </div>
      )}

      <Field
        label="Link para agendamento"
        name="link_agendamento"
        type="url"
        value={dados.link_agendamento as string}
        onChange={(v) => atualizar({ link_agendamento: v })}
        required
        placeholder="https://doctoralia.com.br/..."
      />

      <Field
        label="Plataforma de agendamento"
        name="plataforma_agendamento"
        value={dados.plataforma_agendamento as string}
        onChange={(v) => atualizar({ plataforma_agendamento: v })}
        placeholder="Doctoralia, Cal.com, WhatsApp etc"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Valor consulta inicial (R$)"
          name="valor_consulta_inicial"
          type="number"
          value={dados.valor_consulta_inicial as number}
          onChange={(v) => atualizar({ valor_consulta_inicial: v ? Number(v) : null })}
        />
        <Field
          label="Valor consulta retorno (R$)"
          name="valor_consulta_retorno"
          type="number"
          value={dados.valor_consulta_retorno as number}
          onChange={(v) => atualizar({ valor_consulta_retorno: v ? Number(v) : null })}
        />
      </div>

      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-medium text-brand-text">
          <input
            type="checkbox"
            checked={aceitaPlano || false}
            onChange={(e) => atualizar({ aceita_plano_saude: e.target.checked })}
            className="h-4 w-4 rounded border-brand-text/20 text-brand-primary focus:ring-brand-primary"
          />
          Aceito plano de saúde
        </label>
      </div>
    </FormWrapper>
  );
}
