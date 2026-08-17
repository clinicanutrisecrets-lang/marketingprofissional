"use client";

import { useState, useTransition } from "react";
import { gerarSugestoesAction } from "@/lib/conteudo/actions";

/**
 * `jaTemPacote` vem da página (a semana alvo já tem sugestões no banco).
 *
 * 🔴 Antes o Regerar só aparecia DEPOIS de a action responder "semana já tem
 * sugestões" — e como a action mirava a semana seguinte, essa resposta nunca
 * vinha e o botão nunca existia. Quem recebeu um pacote com defeito não tinha
 * como refazer. Agora a página diz de saída se a semana já está preenchida.
 */
export function GerarSugestoesButton({
  jaTemPacote = false,
  rotuloSemana,
}: {
  jaTemPacote?: boolean;
  rotuloSemana?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const mostrarRegerar = jaTemPacote || !!msg?.includes("já tem sugestões");

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setMsg(null);
              const r = await gerarSugestoesAction();
              setMsg(r.msg);
            })
          }
          className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Gerando (30s a 1min)..." : "✨ Gerar sugestões da semana"}
        </button>
        {mostrarRegerar && (
          <button
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  `Apagar as sugestões da semana de ${rotuloSemana ?? "referência"} e gerar novas?`,
                )
              )
                return;
              startTransition(async () => {
                setMsg(null);
                const r = await gerarSugestoesAction(true);
                setMsg(r.msg);
              });
            }}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-primary shadow-sm ring-1 ring-brand-primary/30 hover:bg-brand-primary/5 disabled:opacity-50"
          >
            🔄 Regerar
          </button>
        )}
      </div>
      <p className="max-w-[19rem] text-right text-xs text-brand-text/60">
        {msg ??
          (rotuloSemana
            ? jaTemPacote
              ? `Semana de ${rotuloSemana} já montada. "Regerar" refaz do zero.`
              : `Vai montar o pacote da semana de ${rotuloSemana}.`
            : null)}
      </p>
    </div>
  );
}
