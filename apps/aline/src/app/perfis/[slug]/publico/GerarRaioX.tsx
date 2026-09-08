"use client";

import { useFormState, useFormStatus } from "react-dom";
import { gerarRaioXAction, type EstadoRaioX } from "@/lib/automacao/actions";

export function GerarRaioX({ slug, cor }: { slug: string; cor: string }) {
  const [estado, formAction] = useFormState<EstadoRaioX, FormData>(gerarRaioXAction.bind(null, slug), null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <Botao cor={cor} />
      <span className="text-xs text-aline-text/60">Lê até 60 posts, as métricas de cada um, os comentários dos mais comentados e as conversas recentes do direct. Leva de 1 a 3 minutos.</span>
      {estado?.erro && <span className="w-full text-sm text-red-700">{estado.erro}</span>}
      {estado?.id && <span className="w-full text-sm text-green-800">Pronto. Recarregue a página pra ver o raio-x novo.</span>}
    </form>
  );
}

function Botao({ cor }: { cor: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ background: cor }}>
      {pending ? "Lendo o Instagram…" : "Gerar raio-x agora"}
    </button>
  );
}
