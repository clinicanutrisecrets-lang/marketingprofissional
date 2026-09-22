"use client";

import { useState } from "react";
import { gerarSemanaAdmin } from "@/lib/posts/actions";
import { rotuloSemanaCurto } from "@/lib/aprovacao/semana";

/**
 * Remontar o pacote da semana de UMA conta, à mão.
 *
 * 🔴 A ação `gerarSemanaAdmin` existia desde sempre e NENHUMA tela a chamava:
 * quando o cron de domingo deixava uma conta pra trás (ver
 * lib/geracao/fila-semanal.ts), não havia por onde recuperar — a nutri
 * esperava o domingo seguinte. Gate sem porta: quem pode não tinha como.
 */
export function GerarSemanaBlock({
  franqueadaId,
  semanas,
}: {
  franqueadaId: string;
  semanas: { atual: string; proxima: string };
}) {
  const [semana, setSemana] = useState(semanas.atual);
  const [rodando, setRodando] = useState(false);
  const [msg, setMsg] = useState<{ tom: "ok" | "erro" | "info"; texto: string } | null>(
    null,
  );

  async function gerar() {
    setRodando(true);
    setMsg(null);
    try {
      const r = await gerarSemanaAdmin(franqueadaId, semana);
      if (r.ok) {
        setMsg({
          tom: "ok",
          texto: `Pronto: ${r.total ?? 0} post(s) montados para ${rotuloSemanaCurto(semana)}.`,
        });
      } else {
        // "já está montada" não é falha — é o estado que ela queria.
        const jaExiste = !!(r as { jaExiste?: unknown }).jaExiste;
        setMsg({
          tom: jaExiste ? "info" : "erro",
          texto: r.erro ?? "Não deu pra montar a semana.",
        });
      }
    } catch (e) {
      setMsg({ tom: "erro", texto: (e as Error).message });
    } finally {
      setRodando(false);
    }
  }

  const cor =
    msg?.tom === "ok"
      ? "bg-emerald-50 text-emerald-800"
      : msg?.tom === "info"
        ? "bg-amber-50 text-amber-800"
        : "bg-red-50 text-red-800";

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-1 text-sm font-semibold">Pacote da semana</h3>
      <p className="mb-3 text-xs text-brand-text/60">
        Monta os posts desta conta agora, sem esperar o domingo. Se a semana já
        estiver montada, nada é refeito.
      </p>

      <select
        value={semana}
        onChange={(e) => setSemana(e.target.value)}
        disabled={rodando}
        className="mb-2 w-full rounded-lg border border-brand-muted px-3 py-2 text-sm"
      >
        <option value={semanas.atual}>
          Semana atual · {rotuloSemanaCurto(semanas.atual)}
        </option>
        <option value={semanas.proxima}>
          Próxima semana · {rotuloSemanaCurto(semanas.proxima)}
        </option>
      </select>

      <button
        type="button"
        onClick={gerar}
        disabled={rodando}
        className="w-full rounded-lg bg-brand-secondary px-4 py-2 text-sm font-medium text-white hover:bg-brand-secondary/90 disabled:opacity-60"
      >
        {rodando ? "Montando… (pode levar 2 minutos)" : "Montar o pacote desta semana"}
      </button>

      {msg && <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${cor}`}>{msg.texto}</p>}
    </div>
  );
}
