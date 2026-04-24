"use client";

import { CardPicker, Field, FormWrapper, Select, TextArea } from "@/components/ui/Field";
import type { StepFormProps } from "../Wizard";
import { CalculadoraBudget } from "./Step9CalculadoraBudget";

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
  const fazAnuncio = dados.faz_anuncio_pago as boolean;

  function toggleDia(d: number) {
    const novo = dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort();
    atualizar({ dias_post_semana: novo });
  }

  return (
    <FormWrapper
      title="Configurações de automação"
      descricao="Como e quando o sistema posta por você."
    >
      <CardPicker
        label="Como prefere aprovar os posts?"
        value={dados.aprovacao_modo as string}
        onChange={(v) => atualizar({ aprovacao_modo: v })}
        options={[
          {
            value: "semanal_bloco",
            label: "Bloco semanal (recomendado)",
            descricao: "Aprovo 7-10 posts todo domingo de uma vez",
          },
          {
            value: "individual_por_post",
            label: "Individual por post",
            descricao: "Aprovo cada post separadamente antes de postar",
          },
          {
            value: "automatico_total",
            label: "Automático total",
            descricao: "Posta direto, sem aprovação",
          },
        ]}
        required
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Horário preferido pro feed"
          name="horario_preferido_post"
          type="text"
          value={(dados.horario_preferido_post as string) ?? "08:00"}
          onChange={(v) => atualizar({ horario_preferido_post: v })}
          placeholder="08:00"
        />
        <Select
          label="Frequência de stories"
          name="frequencia_stories"
          value={dados.frequencia_stories as string}
          onChange={(v) => atualizar({ frequencia_stories: v })}
          options={[
            { value: "diario", label: "Diário" },
            { value: "dias_uteis", label: "Dias úteis" },
            { value: "3x_semana", label: "3x por semana" },
            { value: "semanal", label: "Semanal" },
          ]}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-text">
          Dias da semana com post no feed
        </label>
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

      {/* CTA dos anúncios — destaque */}
      <div className="rounded-xl border-2 border-brand-primary/30 bg-brand-primary/5 p-5">
        <h3 className="mb-1 text-sm font-semibold text-brand-primary">
          🎯 CTA dos anúncios (pra onde leva o clique)
        </h3>
        <p className="mb-4 text-sm text-brand-text/70">
          Quando alguém clica no seu anúncio, pra onde deve ir? Você pode trocar
          depois a qualquer momento.
        </p>

        <CardPicker
          label="Tipo de CTA"
          value={dados.tipo_cta_anuncio as string}
          onChange={(v) => atualizar({ tipo_cta_anuncio: v })}
          options={[
            { value: "whatsapp_sofia", label: "WhatsApp da Sofia", descricao: "Bot qualifica e agenda" },
            { value: "whatsapp_direto", label: "WhatsApp direto", descricao: "Vai pro seu número" },
            { value: "landing_page", label: "Landing page", descricao: "LP de conversão externa" },
            { value: "agendamento", label: "Agendamento", descricao: "Usa o link que você já cadastrou" },
          ]}
          required
        />

        <div className="mt-4">
          <Field
            label="Link do CTA"
            name="link_cta_anuncio"
            type="url"
            value={dados.link_cta_anuncio as string}
            onChange={(v) => atualizar({ link_cta_anuncio: v })}
            placeholder="https://wa.me/5541999999999"
            required
            hint='Pra WhatsApp use formato wa.me/5541XXXXXXXX'
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Select
            label="Texto do botão"
            name="texto_cta_botao"
            value={dados.texto_cta_botao as string}
            onChange={(v) => atualizar({ texto_cta_botao: v })}
            options={[
              { value: "Falar agora", label: "Falar agora" },
              { value: "Agendar consulta", label: "Agendar consulta" },
              { value: "Saiba mais", label: "Saiba mais" },
              { value: "Quero esse teste", label: "Quero esse teste" },
              { value: "Começar", label: "Começar" },
            ]}
          />
        </div>

        <div className="mt-4">
          <TextArea
            label="Mensagem pré-preenchida no WhatsApp (opcional)"
            name="mensagem_inicial_whatsapp"
            value={dados.mensagem_inicial_whatsapp as string}
            onChange={(v) => atualizar({ mensagem_inicial_whatsapp: v })}
            placeholder="Olá! Vim pelo anúncio da Dra. Fulana"
            rows={2}
          />
        </div>
      </div>

      {/* Anúncios pagos com calculadora */}
      <div className="rounded-xl border border-brand-text/10 p-5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={fazAnuncio || false}
            onChange={(e) => atualizar({ faz_anuncio_pago: e.target.checked })}
            className="h-4 w-4 rounded border-brand-text/20 text-brand-primary focus:ring-brand-primary"
          />
          Quero que a plataforma gerencie anúncios pagos (Meta Ads)
        </label>

        {fazAnuncio && (
          <div className="mt-5 space-y-5">
            <CalculadoraBudget
              budgetAtual={dados.budget_anuncio_mensal as number | null}
              onChangeBudget={(v) => atualizar({ budget_anuncio_mensal: v })}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Objetivo principal"
                name="objetivo_anuncio"
                value={dados.objetivo_anuncio as string}
                onChange={(v) => atualizar({ objetivo_anuncio: v })}
                options={[
                  { value: "receber_mensagens", label: "Receber mensagens" },
                  { value: "agendar_consultas", label: "Agendar consultas" },
                  { value: "ganhar_seguidores", label: "Ganhar seguidores" },
                  { value: "vender_teste_genetico", label: "Vender teste" },
                  { value: "misto", label: "Misto (rodar vários)" },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </FormWrapper>
  );
}
