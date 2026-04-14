"use client";

import { CardPicker, FormWrapper } from "@/components/ui/Field";
import type { StepFormProps } from "../Wizard";

export function Step8ProvaSocial({ dados, atualizar }: StepFormProps) {
  const tem = dados.tem_depoimentos as boolean;
  return (
    <FormWrapper
      title="Depoimentos e prova social"
      descricao="Depoimentos reais elevam muito o engajamento dos posts."
    >
      <CardPicker
        label="Você tem depoimentos de pacientes?"
        value={tem === true ? "sim" : tem === false ? "nao" : ""}
        onChange={(v) => atualizar({ tem_depoimentos: v === "sim" })}
        options={[
          { value: "sim", label: "Sim, tenho" },
          { value: "nao", label: "Ainda não" },
        ]}
      />
      {tem && (
        <CardPicker
          label="Em que formato você tem?"
          value={dados.depoimentos_formato as string}
          onChange={(v) => atualizar({ depoimentos_formato: v })}
          options={[
            { value: "prints_whatsapp", label: "Prints de WhatsApp" },
            { value: "videos", label: "Vídeos" },
            { value: "texto_escrito", label: "Texto escrito" },
            { value: "misto", label: "Vários formatos" },
          ]}
        />
      )}
      <div className="rounded-lg border border-dashed border-brand-text/20 p-4 text-sm text-brand-text/60">
        📎 Upload dos arquivos de depoimento será adicionado na próxima rodada.
        Nossa equipe coleta junto durante o onboarding por WhatsApp.
      </div>
    </FormWrapper>
  );
}
