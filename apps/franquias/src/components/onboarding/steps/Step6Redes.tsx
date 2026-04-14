"use client";

import { Field, FormWrapper } from "@/components/ui/Field";
import type { StepFormProps } from "../Wizard";

export function Step6Redes({ dados, atualizar }: StepFormProps) {
  const conectado = !!dados.instagram_access_token;

  return (
    <FormWrapper
      title="Redes sociais"
      descricao="Informe seus @ e conecte o Instagram no final (autorização Meta)."
    >
      <Field
        label="Instagram (@handle)"
        name="instagram_handle"
        value={dados.instagram_handle as string}
        onChange={(v) => atualizar({ instagram_handle: v.replace("@", "") })}
        placeholder="scannerdasaude"
        required
        hint="Sem o @. Precisa ser conta profissional (Criador ou Empresarial)."
      />
      <Field
        label="TikTok (opcional)"
        name="tiktok_handle"
        value={dados.tiktok_handle as string}
        onChange={(v) => atualizar({ tiktok_handle: v.replace("@", "") })}
      />
      <Field
        label="YouTube (URL do canal)"
        name="youtube_canal"
        type="url"
        value={dados.youtube_canal as string}
        onChange={(v) => atualizar({ youtube_canal: v })}
      />
      <Field
        label="Site próprio"
        name="site_proprio"
        type="url"
        value={dados.site_proprio as string}
        onChange={(v) => atualizar({ site_proprio: v })}
      />
      <Field
        label="Linktree / bio.link"
        name="linktree_ou_similar"
        type="url"
        value={dados.linktree_ou_similar as string}
        onChange={(v) => atualizar({ linktree_ou_similar: v })}
      />

      <div className="rounded-xl border-2 border-dashed border-brand-primary/30 bg-brand-primary/5 p-5">
        <div className="mb-2 text-sm font-semibold text-brand-primary">
          📲 Conectar Instagram {conectado ? "✅" : ""}
        </div>
        <p className="mb-3 text-sm text-brand-text/70">
          {conectado
            ? "Sua conta está conectada. Pra reconectar, clique abaixo."
            : "Autorize a plataforma a publicar posts e ler insights do seu perfil."}
        </p>
        <a
          href="/api/auth/meta/start"
          className="inline-block rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
        >
          {conectado ? "Reconectar Instagram" : "Conectar Instagram"}
        </a>
      </div>
    </FormWrapper>
  );
}
