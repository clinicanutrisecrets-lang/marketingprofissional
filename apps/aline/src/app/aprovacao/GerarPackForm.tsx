"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarPackAction } from "@/lib/posts/aprovacao-actions";

type Perfil = { slug: string; nome: string };

type Resultado =
  | { tipo: "ok"; slug: string; qtd: number; semanaRef: string; custoUsd?: number }
  | { tipo: "erro"; slug: string; mensagem: string };

export function GerarPackForm({ perfis }: { perfis: Perfil[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slug, setSlug] = useState(perfis[0]?.slug ?? "");
  const [qtd, setQtd] = useState(5);
  const [semanaRef, setSemanaRef] = useState(proximaSegundaISO());
  const [resultados, setResultados] = useState<Resultado[]>([]);

  function gerar() {
    if (!slug) return;
    startTransition(async () => {
      const r = await gerarPackAction({
        slug,
        qtd,
        semanaRef: semanaRef || undefined,
      });
      const novoResultado: Resultado = r.ok
        ? {
            tipo: "ok",
            slug,
            qtd: r.qtd ?? 0,
            semanaRef: r.semanaRef ?? semanaRef,
            custoUsd: r.custoUsd,
          }
        : { tipo: "erro", slug, mensagem: r.erro ?? "erro desconhecido" };
      setResultados((cur) => [novoResultado, ...cur]);
      if (r.ok) router.refresh();
    });
  }

  return (
    <section className="mb-8 rounded-2xl border border-aline-scanner/20 bg-aline-scanner/5 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-aline-scanner">
        Gerar pack agora
      </h2>
      <p className="mt-1 text-xs text-aline-text/60">
        Use pra criar pacote fora do dia padrao (quinta 9h). Util pra lancamentos,
        datas comemorativas ou semanas extras.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-aline-text/70">Perfil</span>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-lg border border-aline-text/10 bg-white px-3 py-2 text-sm focus:border-aline-scanner focus:outline-none"
          >
            {perfis.map((p) => (
              <option key={p.slug} value={p.slug}>
                @{p.slug} — {p.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-aline-text/70">
            Qtd de posts
          </span>
          <input
            type="number"
            min={1}
            max={20}
            value={qtd}
            onChange={(e) => setQtd(parseInt(e.target.value || "5", 10))}
            className="w-full rounded-lg border border-aline-text/10 bg-white px-3 py-2 text-sm focus:border-aline-scanner focus:outline-none"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-aline-text/70">
            Semana de referencia (segunda-feira)
          </span>
          <input
            type="date"
            value={semanaRef}
            onChange={(e) => setSemanaRef(e.target.value)}
            className="w-full rounded-lg border border-aline-text/10 bg-white px-3 py-2 text-sm focus:border-aline-scanner focus:outline-none"
          />
        </label>
      </div>

      <button
        onClick={gerar}
        disabled={isPending || !slug}
        className="mt-4 rounded-lg bg-aline-scanner px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Gerando…" : "Gerar pack"}
      </button>
      <p className="mt-2 text-xs text-aline-text/50">
        Pode levar 30s a 1min. Os posts entram com status &quot;Aguardando&quot; pra
        voce revisar e aprovar abaixo.
      </p>

      {resultados.length > 0 && (
        <ul className="mt-4 space-y-2">
          {resultados.map((r, i) => (
            <li
              key={i}
              className={`rounded-lg p-3 text-sm ${
                r.tipo === "ok"
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {r.tipo === "ok" ? (
                <>
                  ✓ @{r.slug}: {r.qtd} posts gerados pra semana {r.semanaRef}
                  {typeof r.custoUsd === "number" && (
                    <span className="ml-2 text-xs opacity-70">
                      (custo IA: ${r.custoUsd.toFixed(4)})
                    </span>
                  )}
                </>
              ) : (
                <>
                  ✗ @{r.slug}: {r.mensagem}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function proximaSegundaISO(): string {
  const hoje = new Date();
  const dow = hoje.getUTCDay();
  const diasAteSegunda = dow === 1 ? 7 : (8 - dow) % 7 || 7;
  const seg = new Date(hoje);
  seg.setUTCDate(hoje.getUTCDate() + diasAteSegunda);
  return seg.toISOString().slice(0, 10);
}
