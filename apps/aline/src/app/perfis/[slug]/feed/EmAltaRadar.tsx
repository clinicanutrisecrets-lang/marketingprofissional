"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { descartarTemaEmAlta, fazerPostDoTemaEmAlta, procurarTemasAgora } from "@/lib/em-alta/actions";

export type TemaRadar = {
  id: string;
  manchete: string;
  fonte: string | null;
  url: string | null;
  fato: string;
  angulo: string;
  data: string;
};

/**
 * "Em alta agora": o radar acha sozinho todo dia o que está sendo comentado
 * (famoso, série, documentário, viral) e propõe a leitura dela. Um clique faz o post.
 */
export function EmAltaRadar({ perfilSlug, temas, diaPadrao }: { perfilSlug: string; temas: TemaRadar[]; diaPadrao: string }) {
  const router = useRouter();
  const [dia, setDia] = useState(diaPadrao);
  const [indo, setIndo] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ id: string; erro: boolean; texto: string } | null>(null);

  async function fazer(id: string) {
    setIndo(id);
    setMsg(null);
    const r = await fazerPostDoTemaEmAlta(id, dia);
    setIndo(null);
    if (!r.ok) setMsg({ id, erro: true, texto: r.erro });
    else setMsg({ id, erro: !r.arte, texto: r.arte ? "Post pronto no feed, aguardando a sua aprovação." : r.aviso ?? "" });
    router.refresh();
  }

  async function descartar(id: string) {
    setIndo(id);
    await descartarTemaEmAlta(id, perfilSlug);
    setIndo(null);
    router.refresh();
  }

  async function procurar() {
    setIndo("procurar");
    setMsg(null);
    const r = await procurarTemasAgora(perfilSlug);
    setIndo(null);
    setMsg({ id: "procurar", erro: !r.ok, texto: r.ok ? (r.novos > 0 ? `${r.novos} tema(s) novo(s).` : "Nada novo que renda post agora.") : r.erro });
    router.refresh();
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">Em alta agora</p>
          <p className="text-slate-500">O Studio procura todo dia o que está sendo comentado (famosos, séries, documentários, o que viralizou) e propõe a sua leitura.</p>
        </div>
        <button onClick={procurar} disabled={indo !== null} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          {indo === "procurar" ? "Procurando…" : "Procurar agora"}
        </button>
      </div>
      {msg?.id === "procurar" && <p className={`rounded p-2 text-xs ${msg.erro ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{msg.texto}</p>}

      {temas.length === 0 ? (
        <p className="text-slate-500">Nenhum tema em aberto. O radar roda toda manhã.</p>
      ) : (
        <>
          <label className="flex items-center gap-2 text-slate-600">
            Publicar no dia (18h30)
            <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} className="rounded border border-slate-300 p-1" />
          </label>
          <ul className="space-y-3">
            {temas.map((t) => (
              <li key={t.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="font-medium text-slate-900">{t.manchete}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t.fonte ?? "Notícia"} · {t.data}
                  {t.url && <> · <a href={t.url} target="_blank" rel="noreferrer" className="underline">ver a notícia</a></>}
                </p>
                <p className="mt-2 text-slate-700"><span className="font-medium">Sua leitura: </span>{t.angulo}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => fazer(t.id)} disabled={indo !== null} className="rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                    {indo === t.id ? "Montando, leva perto de um minuto…" : "Fazer o post"}
                  </button>
                  <button onClick={() => descartar(t.id)} disabled={indo !== null} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-60">
                    Descartar
                  </button>
                </div>
                {msg?.id === t.id && <p className={`mt-2 rounded p-2 text-xs ${msg.erro ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{msg.texto}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
