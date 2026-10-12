"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

const MIN_SENHA = 8;

/**
 * Destino do link de recuperação: o Supabase abre esta página já com a sessão
 * de recuperação criada, e aqui a pessoa define a senha nova.
 *
 * ⚠️ O endereço precisa estar na lista de Redirect URLs do projeto (Supabase,
 * Authentication, URL Configuration). Se o link abrir outro domínio em vez
 * deste, é isso que está faltando: `https://studio.scannerdasaude.com/**`.
 * A senha é a mesma conta nos dois apps, então trocar lá também vale aqui.
 */
export default function NovaSenhaPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // O link traz a sessão no fragmento da URL e o cliente do Supabase troca isso
  // por sessão sozinho. O formulário só abre quando ela existe, senão a pessoa
  // digita uma senha nova e recebe erro no fim.
  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      if (data.session) setPronto(true);
      else setErro("Link inválido ou expirado. Peça um novo em Esqueci minha senha.");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessao) => {
      if (sessao) {
        setPronto(true);
        setErro(null);
      }
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < MIN_SENHA) {
      setErro(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
      return;
    }
    if (senha !== confirma) {
      setErro("As duas senhas não são iguais.");
      return;
    }
    setLoading(true);
    setErro(null);

    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-aline-bg p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-aline-text">Nova senha</h1>

        {!pronto ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              {erro ?? "Validando seu link..."}
            </div>
            {erro && (
              <Link
                href="/recuperar-senha"
                className="inline-block rounded-lg bg-aline-scanner px-4 py-2.5 text-sm font-semibold text-white"
              >
                Pedir um link novo
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-aline-text/60">
              Escolha uma senha de pelo menos {MIN_SENHA} caracteres.
            </p>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-aline-text">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-aline-text/10 px-4 py-2 focus:border-aline-scanner focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-aline-text">
                  Repita a senha
                </label>
                <input
                  type="password"
                  value={confirma}
                  onChange={(e) => setConfirma(e.target.value)}
                  required
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
                {loading ? "Salvando..." : "Salvar e entrar"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
