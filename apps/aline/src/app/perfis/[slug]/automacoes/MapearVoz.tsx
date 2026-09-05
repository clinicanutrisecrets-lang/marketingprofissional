"use client";

import { useFormState, useFormStatus } from "react-dom";
import { mapearVozAction, type EstadoVoz } from "@/lib/automacao/actions";

export function MapearVoz({ slug, cor }: { slug: string; cor: string }) {
  const [estado, formAction] = useFormState<EstadoVoz, FormData>(mapearVozAction.bind(null, slug), null);
  return (
    <div className="rounded-lg border border-dashed border-aline-text/20 p-3">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <Botao cor={cor} />
        <span className="text-xs text-aline-text/60">
          Lê suas legendas e as respostas que você deu em comentários e escreve um retrato do seu jeito de falar no campo acima. Você edita à vontade e salva.
        </span>
      </form>
      {estado?.erro && <p className="mt-2 text-sm text-red-700">{estado.erro}</p>}
      {estado?.voz && (
        <p className="mt-2 text-xs text-green-800">
          Pronto: li {estado.legendas} legenda(s) e {estado.respostas} resposta(s) sua(s). Recarregue a página pra ver o texto no campo e ajustar.
        </p>
      )}
    </div>
  );
}

function Botao({ cor }: { cor: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ background: cor }}>
      {pending ? "Lendo seu Instagram…" : "Mapear minha voz"}
    </button>
  );
}
