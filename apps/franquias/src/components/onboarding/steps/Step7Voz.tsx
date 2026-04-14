"use client";

import { CardPicker, FormWrapper, TextArea } from "@/components/ui/Field";
import { TONS_COMUNICACAO } from "@/lib/onboarding/steps";
import type { StepFormProps } from "../Wizard";

export function Step7Voz({ dados, atualizar }: StepFormProps) {
  return (
    <FormWrapper
      title="Voz e comunicação"
      descricao="Define como a IA escreve no seu tom."
    >
      <CardPicker
        label="Tom de comunicação"
        value={dados.tom_comunicacao as string}
        onChange={(v) => atualizar({ tom_comunicacao: v })}
        options={TONS_COMUNICACAO}
        required
      />
      <TextArea
        label="Palavras ou abordagens que NÃO quero no conteúdo"
        name="palavras_evitar"
        value={dados.palavras_evitar as string}
        onChange={(v) => atualizar({ palavras_evitar: v })}
        placeholder='Ex: "dieta", "proibido", promessas milagrosas...'
        rows={2}
      />
      <TextArea
        label="Palavras-chave que sempre quero incluir"
        name="palavras_chave_usar"
        value={((dados.palavras_chave_usar as string[]) ?? []).join(", ")}
        onChange={(v) =>
          atualizar({
            palavras_chave_usar: v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        placeholder="Separe por vírgulas: nutrição de precisão, genética, microbiota..."
        rows={2}
      />
      <TextArea
        label="Hashtags favoritas"
        name="hashtags_favoritas"
        value={((dados.hashtags_favoritas as string[]) ?? []).join(" ")}
        onChange={(v) =>
          atualizar({
            hashtags_favoritas: v
              .split(/\s+/)
              .map((s) => s.replace(/^#/, "").trim())
              .filter(Boolean),
          })
        }
        placeholder="Separe por espaços: #nutricaofuncional #saudeintegrativa"
        rows={2}
      />
      <TextArea
        label="Concorrentes que NÃO quero citar"
        name="concorrentes_nao_citar"
        value={dados.concorrentes_nao_citar as string}
        onChange={(v) => atualizar({ concorrentes_nao_citar: v })}
        rows={2}
      />
    </FormWrapper>
  );
}
