"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
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

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-muted p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-brand-text/60 hover:text-brand-secondary"
        >
          ← Voltar
        </Link>
        <h1 className="mb-2 text-2xl font-bold text-brand-text">
          Acesso Interno
        </h1>
        <p className="mb-6 text-sm text-brand-text/60">
          Equipe Scanner da Saúde
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
              className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-secondary focus:outline-none focus:ring-1 focus:ring-brand-secondary"
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
              className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-secondary focus:outline-none focus:ring-1 focus:ring-brand-secondary"
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
            className="w-full rounded-lg bg-brand-secondary px-4 py-2.5 font-medium text-white transition hover:bg-brand-secondary/90 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
