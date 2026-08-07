"use client";

import { CardPicker, FormWrapper, Select } from "@/components/ui/Field";
import type { StepFormProps } from "../Wizard";

/**
 * Etapa 9 — Ritmo de conteúdo.
 *
 * ⚠️ Esta etapa NÃO pergunta mais horário de publicação nem oferece
 * "publicar direto sem revisar". Publicação automática depende da aprovação
 * do app na Meta (ou do Publer configurado) — enquanto isso não existe pra
 * todas, perguntar horário prometia algo que o sistema não entrega.
 *
 * O que ficou é o que a geração de conteúdo de fato usa: em quais dias e com
 * que frequência produzir (planejarSemana), e como a nutri quer revisar.
 */
export function Step9Automacao({ dados, atualizar }: StepFormProps) {
  const dias = (dados.dias_post_semana as number[]) ?? [1, 3, 5];

  const DIAS = [
    { value: 1, label: "Seg" },
    { value: 2, label: "Ter" },
    { value: 3, label: "Qua" },
    { value: 4, label: "Qui" },
    { value: 5, label: "Sex" },
    { value: 6, label: "Sáb" },
    { value: 0, label: "Dom" },
  ];

  function toggleDia(d: number) {
    const novo = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort();
    atualizar({ dias_post_semana: novo });
  }

  return (
    <FormWrapper
      title="Ritmo de conteúdo"
      descricao="Últimas escolhas! Diga quanto conteúdo você quer por semana e como prefere revisar."
    >
      <CardPicker
        label="Como você prefere revisar o conteúdo?"
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
        ]}
        required
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-text">
          Pra quais dias da semana você quer conteúdo de feed pronto?
        </label>
        <p className="mb-2 text-xs text-brand-text/50">
          Isso define quantos posts produzimos por semana pra você. Toque nos dias pra
          marcar ou desmarcar — dá pra mudar depois.
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
        <Select
          label="Com que frequência quer reels?"
          name="frequencia_reels"
          value={dados.frequencia_reels as string}
          onChange={(v) => atualizar({ frequencia_reels: v })}
          options={[
            { value: "semanal", label: "1 por semana" },
            { value: "2x_semana", label: "2 por semana" },
            { value: "nenhum", label: "Não quero reels" },
          ]}
        />
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-sm leading-relaxed text-emerald-900">
        <p className="font-semibold">🌱 E é só isso!</p>
        <p className="mt-1">
          Com essas respostas, o sistema monta sua semana de conteúdo: posts com a sua
          marca, legendas no seu tom e roteiros de vídeo. Você revisa tudo na tela
          <strong> “Aprovar semana”</strong> e publica no seu Instagram quando quiser.
          Qualquer configuração pode ser mudada depois, sem stress.
        </p>
      </div>
    </FormWrapper>
  );
}
