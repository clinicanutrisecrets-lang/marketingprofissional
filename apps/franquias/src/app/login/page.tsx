"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-muted p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar
        </Link>
        <h1 className="mb-2 text-2xl font-bold text-brand-text">
          Marketing Profissional
        </h1>
        {/* 🔴 Esta tela é o fallback, não a porta principal — e antes ela era um
            beco: dizia "entre pelo menu do Scanner" e deixava a pessoa digitando
            uma senha que nunca existiu ("Invalid login credentials"). Foi o que
            aconteceu com a Juliana em 11/08.
            Agora o botão FAZ o login: bate no /api/sso/marketing-token do
            Scanner, que devolve ela pra cá já logada. Se a sessão do Scanner
            tiver expirado, ele pede o login DE LÁ e volta pra cá sozinho. */}
        <div className="mb-6 rounded-lg bg-brand-muted p-4 text-sm leading-relaxed text-brand-text/70">
          <p className="mb-3">
            Você não tem senha aqui — entra com o{" "}
            <strong>mesmo login do Scanner da Saúde</strong>.
          </p>
          <a
            href="https://scannerdasaude.com/api/sso/marketing-token"
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 font-semibold text-white transition hover:opacity-90"
          >
            Entrar com meu login do Scanner →
          </a>
          <p className="mt-3 text-xs text-brand-text/50">
            No Scanner, esse botão também fica em <strong>Crescimento
            Profissional → Consultório de Precisão</strong>, ao lado de
            &ldquo;Entrar na minha área de membros&rdquo;.
          </p>
        </div>
        <p className="mb-6 text-sm text-brand-text/60">
          Só use o formulário abaixo se você cadastrou uma senha própria aqui.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-text">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-primary px-4 py-2.5 font-medium text-white transition hover:bg-brand-primary/90 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
