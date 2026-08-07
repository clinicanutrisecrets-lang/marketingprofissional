"use client";

import { CardPicker, Field, FormWrapper, Select } from "@/components/ui/Field";
import type { StepFormProps } from "../Wizard";

const DIAS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

export function Step9Automacao({ dados, atualizar }: StepFormProps) {
  const dias = (dados.dias_post_semana as number[]) ?? [1, 3, 5];

  function toggleDia(d: number) {
    const novo = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort();
    atualizar({ dias_post_semana: novo });
  }

  return (
    <FormWrapper
      title="Seus posts"
      descricao="Últimas escolhas! Diga como você prefere revisar e quando quer que os posts saiam."
    >
      <CardPicker
        label="Antes de um post ir pro ar, como você quer revisar?"
        value={dados.aprovacao_modo as string}
        onChange={(v) => atualizar({ aprovacao_modo: v })}
        options={[
          {
            value: "semanal_bloco",
            label: "Revisar tudo de uma vez (recomendado)",
            descricao: "Uma vez por semana você olha todos os posts juntos e aprova. Rápido e prático.",
          },
          {
            value: "individual_por_post",
            label: "Revisar um por um",
            descricao: "Você confere cada post separadamente, no seu tempo.",
          },
          {
            value: "automatico_total",
            label: "Não quero revisar",
            descricao: "Confio na equipe — pode publicar direto.",
          },
        ]}
        required
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-text">
          Em quais dias você quer post no feed?
        </label>
        <p className="mb-2 text-xs text-brand-text/50">
          Toque nos dias pra marcar ou desmarcar. Se não tiver certeza, deixe como está — dá pra mudar depois.
        </p>
        <div className="flex flex-wrap gap-2">
          {DIAS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDia(d.value)}
              className={`rounded-lg border-2 px-4 py-2 text-sm font-medium transition ${
                dias.includes(d.value)
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-brand-text/10 hover:border-brand-primary/40"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Que horas o post deve sair?"
          name="horario_preferido_post"
          type="text"
          value={(dados.horario_preferido_post as string) ?? "08:00"}
          onChange={(v) => atualizar({ horario_preferido_post: v })}
          placeholder="08:00"
          hint="Use o formato 08:00. A maioria posta entre 7h e 9h."
        />
        <Select
          label="Com que frequência quer stories?"
          name="frequencia_stories"
          value={dados.frequencia_stories as string}
          onChange={(v) => atualizar({ frequencia_stories: v })}
          options={[
            { value: "diario", label: "Todo dia" },
            { value: "dias_uteis", label: "Segunda a sexta" },
            { value: "3x_semana", label: "3 vezes por semana" },
            { value: "semanal", label: "1 vez por semana" },
          ]}
        />
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm leading-relaxed text-emerald-900">
        <p className="font-semibold">🌱 E é só isso!</p>
        <p className="mt-1">
          Com essas respostas, o sistema já monta seu calendário de conteúdo:
          posts com a sua marca, legendas no seu tom e roteiros de vídeo — tudo
          pra você aprovar com um clique. Qualquer configuração pode ser mudada
          depois, sem stress.
        </p>
      </div>
    </FormWrapper>
  );
}
