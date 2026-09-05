"use client";

import { useFormState, useFormStatus } from "react-dom";
import { simularRobo, type EstadoSimulacao } from "@/lib/automacao/actions";

const GATILHOS: Record<string, string> = {
  comentario: "Comentário em post",
  dm: "Mensagem no direct",
  story_reply: "Resposta a story",
  story_mention: "Menção em story",
};

export function SimuladorRobo({ slug, cor }: { slug: string; cor: string }) {
  const action = simularRobo.bind(null, slug);
  const [estado, formAction] = useFormState<EstadoSimulacao, FormData>(action, null);

  return (
    <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-aline-text/60">Testar o robô</h2>
      <p className="mb-4 text-xs text-aline-text/60">
        Finge um comentário ou uma DM e veja o que o robô faria. Nada é enviado a ninguém; as regras, as chaves e a
        base do Scanner são as mesmas do ar.
      </p>
      <form action={formAction} className="grid gap-3 md:grid-cols-[180px_1fr]">
        <select name="gatilho" className="rounded-lg border border-aline-text/15 bg-white px-3 py-2 text-sm">
          {Object.entries(GATILHOS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          name="texto"
          placeholder='Ex.: "quero o ebook" ou "posso tomar ômega 3 com anticoncepcional?"'
          className="rounded-lg border border-aline-text/15 bg-white px-3 py-2 text-sm"
          required
        />
        <input
          name="media_id"
          placeholder="ID do post (opcional, só comentário)"
          className="rounded-lg border border-aline-text/15 bg-white px-3 py-2 text-sm"
        />
        <Botao cor={cor} />
      </form>

      {estado?.erro && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{estado.erro}</p>}
      {estado?.resultado && (
        <div className="mt-4 rounded-lg bg-aline-muted p-4 text-sm">
          <p className="mb-2">
            <strong>Regra:</strong> {estado.resultado.regra ?? "nenhuma (caiu nas chaves gerais)"}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {estado.resultado.acoes.map((a, i) => (
              <li key={i} className="whitespace-pre-wrap">{a}</li>
            ))}
          </ul>
          {estado.resultado.avisos.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-aline-text/60">
              {estado.resultado.avisos.map((a, i) => (
                <li key={i}>⚠ {a}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Botao({ cor }: { cor: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      style={{ background: cor }}
    >
      {pending ? "Simulando…" : "Simular"}
    </button>
  );
}
