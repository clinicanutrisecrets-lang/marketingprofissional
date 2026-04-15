"use client";

import { useState, useTransition } from "react";
import { aceitarConvite } from "@/lib/admin/convites";
import { createClient } from "@/lib/supabase/client";

export default function AceitarConviteForm({
  token,
  email,
  nomeCompleto,
}: {
  token: string;
  email: string;
  nomeCompleto: string;
}) {
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro("Senha precisa ter pelo menos 8 caracteres");
      return;
    }
    if (senha !== senha2) {
      setErro("Senhas não conferem");
      return;
    }

    startTransition(async () => {
      const r = await aceitarConvite({ token, senha });
      if (!r.ok) {
        setErro(r.erro ?? "Erro");
        return;
      }

      // Auto-login
      try {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({ email, password: senha });
      } catch {}

      setSucesso(true);
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 1500);
    });
  }

  if (sucesso) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-5xl">✅</div>
        <h2 className="mb-2 text-xl font-bold text-brand-text">Conta criada!</h2>
        <p className="text-sm text-brand-text/60">
          Te levando pro onboarding...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Nome</label>
        <input
          type="text"
          value={nomeCompleto}
          disabled
          className="w-full rounded-lg border border-brand-text/10 bg-brand-muted/30 px-4 py-2 text-brand-text/60"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-lg border border-brand-text/10 bg-brand-muted/30 px-4 py-2 text-brand-text/60"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Senha (mín 8 caracteres)</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-primary focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Confirme a senha</label>
        <input
          type="password"
          value={senha2}
          onChange={(e) => setSenha2(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-primary focus:outline-none"
        />
      </div>

      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand-primary px-4 py-3 font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
      >
        {isPending ? "Criando conta..." : "Criar conta e começar onboarding →"}
      </button>

      <p className="text-center text-xs text-brand-text/40">
        Ao aceitar, você concorda com os{" "}
        <a href="/termos" className="underline">Termos</a> e{" "}
        <a href="/privacidade" className="underline">Privacidade</a>.
      </p>
    </form>
  );
}
