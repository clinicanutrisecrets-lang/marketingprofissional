"use client";

import { useMemo, useState } from "react";
import { criarVideoCurtoAction } from "@/lib/corte/actions";
import { ESTILOS_LEGENDA, ESTILO_PADRAO } from "@/lib/corte/opcoes";
import { avaliarFrase, DUR_MAX, DUR_MIN, DUR_PADRAO, FRASE_MAX } from "@/lib/corte/video-curto";

/**
 * Vídeo curto: um clipe da biblioteca com a frase escrita em cima.
 *
 * Pedido da Aline (22/09/2026): "fazer aqueles vídeos curtinhos que é só o
 * vídeo com uma escrita em cima, que está na moda".
 *
 * 🔴 A frase é conferida AQUI e no servidor pela MESMA função. A daqui existe
 * pra ela ver o limite enquanto digita; a de lá é a que vale.
 */
/** Só o que esta tela precisa de um clipe. A URL não entra: o worker a
 *  resolve pelo id, e trazê-la até aqui seria convidar a mandá-la adiante. */
export type ClipeEscolhivel = {
  id: string;
  titulo: string;
  thumbnail_url?: string | null;
};

export function VideoCurtoSection({
  biblioteca,
  acervo,
}: {
  biblioteca: ClipeEscolhivel[];
  acervo: ClipeEscolhivel[];
}) {
  const [clipe, setClipe] = useState<{ id: string; origem: "biblioteca" | "acervo" } | null>(null);
  const [frase, setFrase] = useState("");
  const [segundos, setSegundos] = useState(DUR_PADRAO);
  const [estilo, setEstilo] = useState<string>(ESTILO_PADRAO);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const avaliacao = useMemo(() => avaliarFrase(frase), [frase]);
  const restantes = FRASE_MAX - frase.trim().length;

  const clipes = useMemo(
    () => [
      ...biblioteca.map((v) => ({ v, origem: "biblioteca" as const })),
      ...acervo.map((v) => ({ v, origem: "acervo" as const })),
    ],
    [biblioteca, acervo],
  );

  async function gerar() {
    if (!clipe || !avaliacao.ok || enviando) return;
    setEnviando(true);
    setMsg(null);
    try {
      const r = await criarVideoCurtoAction({
        clipeId: clipe.id,
        origem: clipe.origem,
        frase,
        segundos,
        estiloLegenda: estilo,
      });
      setMsg({ ok: r.ok, texto: r.msg });
      if (r.ok) setFrase("");
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : "falha ao enviar" });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-brand-text">✍️ Vídeo curto com frase</h2>
      <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
        Um clipe da sua biblioteca com uma frase grande escrita em cima. Sem
        você aparecer e sem gravar nada.
      </p>

      {clipes.length === 0 ? (
        <p className="mt-4 rounded-xl bg-brand-muted p-4 text-sm text-brand-text/70">
          Sua biblioteca ainda está vazia. Suba um clipe em{" "}
          <a href="/dashboard/biblioteca-videos" className="font-semibold text-brand-primary">
            Biblioteca de clipes
          </a>{" "}
          e ele aparece aqui.
        </p>
      ) : (
        <>
          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-text/70">
              1. Escolha o clipe
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {clipes.slice(0, 20).map(({ v, origem }) => {
                const ativo = clipe?.id === v.id;
                return (
                  <button
                    key={`${origem}-${v.id}`}
                    type="button"
                    onClick={() => setClipe({ id: v.id, origem })}
                    title={v.titulo}
                    className={`overflow-hidden rounded-xl ring-2 transition ${
                      ativo ? "ring-brand-primary" : "ring-transparent hover:ring-brand-primary/30"
                    }`}
                  >
                    {v.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnail_url}
                        alt={v.titulo}
                        className="aspect-[9/16] w-full object-cover"
                      />
                    ) : (
                      <span className="flex aspect-[9/16] w-full items-center justify-center bg-brand-muted text-2xl">
                        🎞️
                      </span>
                    )}
                    <span className="block truncate px-1 py-1 text-[11px] text-brand-text/70">
                      {v.titulo}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-text/70">
              2. A frase que aparece na tela
            </label>
            <textarea
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
              placeholder="ex.: Você não está sem força de vontade"
            />
            <p
              className={`mt-1 text-[11px] ${
                restantes < 0 ? "font-semibold text-red-600" : "text-brand-text/40"
              }`}
            >
              {restantes < 0
                ? `${-restantes} caracteres além do que cabe na tela`
                : `${restantes} caracteres restantes. Frase curta é o que faz esse formato funcionar.`}
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-text/70">
                3. Duração
              </label>
              <input
                type="range"
                min={DUR_MIN}
                max={DUR_MAX}
                step={1}
                value={segundos}
                onChange={(e) => setSegundos(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[11px] text-brand-text/50">
                {segundos} segundos. Se o clipe for mais curto, vale o clipe.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-text/70">
                4. Estilo da letra
              </label>
              <select
                value={estilo}
                onChange={(e) => setEstilo(e.target.value)}
                className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
              >
                {ESTILOS_LEGENDA.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="mt-4 rounded-lg bg-brand-muted px-3 py-2 text-[12px] text-brand-text/60">
            O vídeo sai sem música: a trilha você escolhe na hora de postar, com
            o som do Instagram. O áudio do clipe, se tiver, é mantido.
          </p>

          <button
            type="button"
            onClick={gerar}
            disabled={!clipe || !avaliacao.ok || enviando}
            className="mt-4 w-full rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 sm:w-auto"
          >
            {enviando ? "Enviando..." : "Gerar vídeo curto"}
          </button>
          {!clipe && (
            <p className="mt-2 text-[11px] text-brand-text/40">Escolha um clipe pra liberar o botão.</p>
          )}
          {msg && (
            <p
              className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                msg.ok
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                  : "bg-red-50 text-red-700 ring-1 ring-red-200"
              }`}
            >
              {msg.texto}
            </p>
          )}
        </>
      )}
    </section>
  );
}
