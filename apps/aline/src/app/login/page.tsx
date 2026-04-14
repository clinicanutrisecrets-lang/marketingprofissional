"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forbidden = searchParams.get("forbidden") === "1";
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErro(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-aline-bg p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6">
          <div className="text-xs font-medium uppercase tracking-wider text-aline-text/50">
            Sistema interno
          </div>
          <h1 className="mt-1 text-2xl font-bold text-aline-text">Studio Aline</h1>
        </div>

        {forbidden && (
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Acesso restrito — esse painel é pra super-admins.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-aline-text/10 px-4 py-2 focus:border-aline-scanner focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-aline-text/10 px-4 py-2 focus:border-aline-scanner focus:outline-none"
            />
          </div>
          {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-aline-scanner px-4 py-2.5 font-medium text-white hover:bg-aline-scanner/90 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
