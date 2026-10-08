"use client";

/**
 * "Corrigir o texto da arte" no card do post (pedido da Juliana, 08/10/2026).
 *
 * Mostra o texto desenhado em cada peça (capa e slides, ou o card único),
 * deixa corrigir e redesenha a arte com o mesmo desenhador da geração.
 * Nenhum modelo é chamado: corrigir custa zero.
 */
import { useState } from "react";
import { redesenharArteComTexto } from "@/lib/posts/actions";
import { lerTextoArte, podeRedesenhar, type PecaArte } from "@/lib/criativo/texto-arte-edicao";

export function TextoDaArte({
  post,
  onUpdate,
}: {
  post: Record<string, unknown>;
  onUpdate: (p: Record<string, unknown>) => void;
}) {
  const original = lerTextoArte(post.texto_arte);
  const [aberto, setAberto] = useState(false);
  const [pecas, setPecas] = useState<PecaArte[]>(original ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!original || !podeRedesenhar(post)) return null;
  const ehCarrossel = original.length > 1;

  function editar(i: number, campo: keyof PecaArte, valor: string) {
    setPecas((ps) => ps.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));
  }

  async function redesenhar() {
    setSalvando(true);
    setErro(null);
    const r = await redesenharArteComTexto(post.id as string, pecas);
    setSalvando(false);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    onUpdate({
      ...post,
      url_imagem_final: r.url_imagem_final,
      ...(r.urls_slides ? { urls_slides: r.urls_slides } : {}),
      texto_arte: r.texto_arte,
      editado_pela_nutri: true,
    });
    setAberto(false);
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => {
          setPecas(original);
          setAberto(true);
        }}
        className="rounded-md border border-brand-text/10 px-2 py-1 text-xs hover:border-brand-primary"
      >
        🖋 Corrigir o texto da arte
      </button>
    );
  }

  return (
    <div className="mt-3 w-full space-y-3 rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-3">
      <div>
        <div className="text-xs font-semibold text-brand-text">Texto que vai na arte</div>
        <p className="text-[11px] text-brand-text/60">
          Corrija o que quiser e redesenhe. A arte é refeita na hora, sem gerar o post de novo.
        </p>
      </div>
      {pecas.map((p, i) => (
        <div key={i} className="space-y-1.5">
          {ehCarrossel && (
            <div className="text-[11px] font-semibold uppercase text-brand-text/50">
              {i === 0 ? "Capa" : `Slide ${i + 1}`}
            </div>
          )}
          <textarea
            value={p.headline}
            onChange={(e) => editar(i, "headline", e.target.value)}
            rows={2}
            placeholder="Título"
            className="w-full rounded-lg border border-brand-text/10 bg-white p-2 text-xs"
          />
          {(original[i]?.subtitle !== undefined || (!ehCarrossel && i === 0)) && (
            <input
              type="text"
              value={p.subtitle ?? ""}
              onChange={(e) => editar(i, "subtitle", e.target.value)}
              placeholder="Subtítulo (opcional)"
              className="w-full rounded-lg border border-brand-text/10 bg-white p-2 text-xs"
            />
          )}
          {original[i]?.corpo !== undefined && (
            <textarea
              value={p.corpo ?? ""}
              onChange={(e) => editar(i, "corpo", e.target.value)}
              rows={3}
              placeholder="Texto do slide"
              className="w-full rounded-lg border border-brand-text/10 bg-white p-2 text-xs"
            />
          )}
        </div>
      ))}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={redesenhar}
          disabled={salvando}
          className="flex-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
        >
          {salvando ? "Redesenhando a arte..." : "Redesenhar a arte"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
          className="rounded-lg border border-brand-text/10 px-3 py-1.5 text-xs hover:border-brand-text/30"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
