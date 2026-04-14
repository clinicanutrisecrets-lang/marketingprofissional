"use client";

import { useState, useTransition } from "react";
import { atualizarFranqueadaAdmin } from "@/lib/admin/actions";
import { Field, TextArea, Select } from "@/components/ui/Field";

type Props = {
  franqueadaId: string;
  initialData: Record<string, unknown>;
};

export function FichaEditor({ franqueadaId, initialData }: Props) {
  const [dados, setDados] = useState(initialData);
  const [salvando, setSalvando] = useState(false);
  const [, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  function atualizar(campos: Record<string, unknown>) {
    setDados((prev) => ({ ...prev, ...campos }));
    setSalvando(true);
    startTransition(async () => {
      const r = await atualizarFranqueadaAdmin(franqueadaId, campos);
      setSalvando(false);
      setMsg(
        r.ok
          ? { ok: true, texto: "Salvo" }
          : { ok: false, texto: r.erro ?? "Erro" },
      );
      setTimeout(() => setMsg(null), 2500);
    });
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ficha editável</h2>
        {salvando ? (
          <span className="text-xs text-brand-text/50">Salvando...</span>
        ) : msg ? (
          <span
            className={`text-xs ${msg.ok ? "text-green-600" : "text-red-600"}`}
          >
            {msg.texto}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome completo"
          name="nome_completo"
          value={dados.nome_completo as string}
          onChange={(v) => atualizar({ nome_completo: v })}
        />
        <Field
          label="Nome comercial"
          name="nome_comercial"
          value={dados.nome_comercial as string}
          onChange={(v) => atualizar({ nome_comercial: v })}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={dados.email as string}
          onChange={(v) => atualizar({ email: v })}
        />
        <Field
          label="WhatsApp"
          name="whatsapp"
          value={dados.whatsapp as string}
          onChange={(v) => atualizar({ whatsapp: v })}
        />
        <Field
          label="Instagram handle"
          name="instagram_handle"
          value={dados.instagram_handle as string}
          onChange={(v) => atualizar({ instagram_handle: v })}
        />
        <Field
          label="Link agendamento"
          name="link_agendamento"
          value={dados.link_agendamento as string}
          onChange={(v) => atualizar({ link_agendamento: v })}
        />
        <Select
          label="Status"
          name="status"
          value={dados.status as string}
          onChange={(v) => atualizar({ status: v })}
          options={[
            { value: "onboarding", label: "Onboarding" },
            { value: "ativo", label: "Ativo" },
            { value: "pausado", label: "Pausado" },
            { value: "cancelado", label: "Cancelado" },
          ]}
        />
        <Select
          label="Plano"
          name="plano"
          value={dados.plano as string}
          onChange={(v) => atualizar({ plano: v })}
          options={[
            { value: "franquia_basico", label: "Básico" },
            { value: "franquia_avancado", label: "Avançado" },
            { value: "franquia_premium", label: "Premium" },
          ]}
        />
        <Field
          label="Nicho principal"
          name="nicho_principal"
          value={dados.nicho_principal as string}
          onChange={(v) => atualizar({ nicho_principal: v })}
        />
        <Field
          label="Cidade"
          name="cidade"
          value={dados.cidade as string}
          onChange={(v) => atualizar({ cidade: v })}
        />
      </div>

      <div className="mt-4">
        <TextArea
          label="Público-alvo"
          name="publico_alvo_descricao"
          value={dados.publico_alvo_descricao as string}
          onChange={(v) => atualizar({ publico_alvo_descricao: v })}
          rows={2}
        />
      </div>

      <div className="mt-4">
        <TextArea
          label="Diferenciais"
          name="diferenciais"
          value={dados.diferenciais as string}
          onChange={(v) => atualizar({ diferenciais: v })}
          rows={2}
        />
      </div>

      <div className="mt-4">
        <TextArea
          label="História pessoal"
          name="historia_pessoal"
          value={dados.historia_pessoal as string}
          onChange={(v) => atualizar({ historia_pessoal: v })}
          rows={3}
        />
      </div>
    </div>
  );
}
