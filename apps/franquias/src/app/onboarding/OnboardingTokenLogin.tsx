"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Props = {
  email: string;
  nome: string;
  token: string;
};

export function OnboardingTokenLogin({ email, nome, token }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviarLink() {
    setEnviando(true);
    setErro(null);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const redirectTo = `${window.location.origin}/onboarding?token=${token}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
          data: { nome, onboarding_token: token },
        },
      });

      if (error) throw error;
      setEnviado(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-brand-muted flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm">
        <div className="text-xs uppercase tracking-[0.2em] text-brand-primary mb-3">
          Bem-vinda
        </div>
        <h1 className="text-2xl font-bold text-brand-text">Olá, {nome.split(" ")[0]}!</h1>
        <p className="mt-3 text-sm text-brand-text/70 leading-relaxed">
          A equipe Scanner enviou esse link pra você começar o onboarding da franquia.
          Pra confirmar que é você, vamos te enviar um link de acesso seguro pra{" "}
          <strong>{email}</strong>.
        </p>

        {erro && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>
        )}

        {enviado ? (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
            <div className="font-medium">✓ Link enviado!</div>
            <p className="mt-1">
              Confere a caixa de entrada de <strong>{email}</strong> e clica no link pra
              continuar. Pode demorar até 1 minuto pra chegar.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={enviarLink}
            disabled={enviando}
            className="mt-6 w-full rounded-lg bg-brand-primary px-5 py-3 text-base font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "Receber link de acesso"}
          </button>
        )}

        <p className="mt-6 text-center text-xs text-brand-text/50">
          Esse link é válido por 1 hora. Se não funcionar, peça um novo pra equipe Scanner.
        </p>
      </div>
    </main>
  );
}
