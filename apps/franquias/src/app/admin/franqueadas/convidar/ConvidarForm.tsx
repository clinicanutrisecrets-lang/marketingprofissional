"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enviarConviteFranqueada } from "@/lib/admin/convites";

export default function ConvidarForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [plano, setPlano] = useState("franquia_basico");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErro(null);

    startTransition(async () => {
      const r = await enviarConviteFranqueada({
        email,
        nome_completo: nome,
        plano,
      });
      if (r.ok) {
        setMsg(`Convite enviado! Token: ${r.token}`);
        setEmail("");
        setNome("");
        setTimeout(() => router.refresh(), 1200);
      } else {
        setErro(r.erro ?? "Erro");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Nome completo</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-primary focus:outline-none"
          placeholder="Dra. Fulana da Silva"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-primary focus:outline-none"
          placeholder="fulana@email.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Plano</label>
        <select
          value={plano}
          onChange={(e) => setPlano(e.target.value)}
          className="w-full rounded-lg border border-brand-text/10 px-4 py-2 focus:border-brand-primary focus:outline-none"
        >
          <option value="franquia_basico">Franquia Básico</option>
          <option value="franquia_avancado">Franquia Avançado</option>
          <option value="franquia_premium">Franquia Premium</option>
        </select>
      </div>

      {msg && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{msg}</div>}
      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand-primary px-4 py-3 font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
      >
        {isPending ? "Enviando..." : "📧 Enviar convite"}
      </button>
    </form>
  );
}
