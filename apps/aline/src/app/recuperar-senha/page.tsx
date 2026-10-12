"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

/**
 * Recuperação de senha do Studio.
 *
 * 🔴 Até 12/10/2026 esta tela não existia AQUI, e o beco era exatamente o que
 * já tinha acontecido no app das franqueadas em 08/09: a Aline tentou entrar,
 * leu "Invalid login credentials" e não tinha por onde pedir senha nova. O
 * login do Studio é só e-mail e senha, e a conta dela nasceu pelo SSO do
 * Scanner, ou seja, com uma senha que ela nunca escolheu.
 *
 * Login sem recuperação é um beco. Se um dia aparecer outra tela de login na
 * casa, ela nasce com esta ao lado.
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
    // Confirma sempre, mesmo se o e-mail não existir: dizer "essa conta não
    // existe" entrega quem tem acesso pra quem chutar e-mails.
    setEnviado(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-aline-bg p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <Link
          href="/login"
          className="mb-6 inline-block text-sm text-aline-text/60 hover:text-aline-scanner"
        >
          ← Voltar pro login
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-aline-text">Esqueci minha senha</h1>

        {enviado ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm leading-relaxed text-green-800">
              Se existir uma conta com <strong>{email}</strong>, o link de nova senha
              chega em alguns minutos. Ele vale por 1 hora.
            </div>
            <p className="text-sm text-aline-text/60">
              Não chegou? Confira o spam.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-aline-scanner px-4 py-2.5 text-sm font-semibold text-white"
            >
              Voltar pro login
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm leading-relaxed text-aline-text/60">
              Digite seu e-mail e enviamos um link pra você cadastrar uma senha nova.
            </p>

            <form onSubmit={enviar} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-aline-text">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-aline-text/10 px-4 py-2 focus:border-aline-scanner focus:outline-none"
                />
              </div>

              {erro && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-aline-scanner px-4 py-2.5 font-medium text-white transition hover:bg-aline-scanner/90 disabled:opacity-60"
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
