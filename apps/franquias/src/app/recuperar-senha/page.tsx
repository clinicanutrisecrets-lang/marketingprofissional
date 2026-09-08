"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

/**
 * Recuperação de senha.
 *
 * 🔴 Até 08/09/2026 esta tela não existia: quem tinha senha própria aqui e
 * esquecia ficava sem saída, porque o formulário de login só dizia
 * "Invalid login credentials" e o botão do Scanner exige estar logada LÁ.
 * Foi o que aconteceu com a Aline. Login sem recuperação é um beco.
 */
export default function RecuperarSenhaPage() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/nova-senha`,
    });

    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    // Sempre confirma, mesmo se o e-mail não existir: dizer "essa conta não
    // existe" entrega quem é cliente da plataforma pra quem chutar e-mails.
    setEnviado(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-muted p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <Link
          href="/login"
          className="mb-6 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro login
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-brand-text">Esqueci minha senha</h1>

        {enviado ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm leading-relaxed text-green-800">
              Se existir uma conta com <strong>{email}</strong>, o link de nova senha
              chega em alguns minutos. Ele vale por 1 hora.
            </div>
            <p className="text-sm text-brand-text/60">
              Não chegou? Confira o spam. Você também pode entrar sem senha, pelo
              botão do Scanner da Saúde na tela de login.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              Voltar pro login
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm leading-relaxed text-brand-text/60">
              Digite seu e-mail e enviamos um link pra você cadastrar uma senha
              nova.
            </p>

            <form onSubmit={enviar} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-text">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
              </div>

              {erro && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-primary px-4 py-2.5 font-medium text-white transition hover:bg-brand-primary/90 disabled:opacity-60"
              >
                {loading ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
