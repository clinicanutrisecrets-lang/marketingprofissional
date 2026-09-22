"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { excluirCorteAction, type CorteIa } from "@/lib/corte/actions";
import { FILTROS } from "@/lib/corte/opcoes";
import { EnviarDoCelular } from "./EnviarDoCelular";

/**
 * Lista das gravações enviadas pra edição automática (teste fechado — só
 * aparece pra quem está em CORTE_IA_EMAILS). Enquanto houver corte em
 * andamento, a página se atualiza sozinha a cada 20 s.
 *
 * 🔴 Nada de "IA" nem estrelinha nos rótulos (regra 1 do projeto): na
 * interface é "algoritmo Scanner" ou simplesmente o que a coisa faz.
 */

/**
 * Worker passou muito do prazo: mostrar como falha, não como espera eterna.
 * Com filtro de imagem o processamento é bem mais longo (cada quadro passa
 * pelo motor), então o prazo acompanha a escolha — senão um corte que está
 * indo bem apareceria como "não ficou pronto".
 */
const LIMITE_MS = 25 * 60 * 1000;
const LIMITE_FILTRO_MS = 95 * 60 * 1000;
function travou(c: CorteIa): boolean {
  if (c.status !== "enviado" && c.status !== "processando") return false;
  const t = new Date(c.criado_em).getTime();
  const teto = c.filtro && c.filtro !== "nenhum" ? LIMITE_FILTRO_MS : LIMITE_MS;
  return Number.isFinite(t) && Date.now() - t > teto;
}

const ETAPA: Record<string, string> = {
  transcrevendo: "🎧 ouvindo o que você falou",
  limpando: "✂️ tirando as pausas",
  planejando: "🧠 escolhendo cortes e legendas",
  filtrando: "💄 aplicando o filtro (esta é a parte demorada)",
  renderizando: "🎞️ montando o vídeo",
};

/** Uma linha dizendo o que a edição tirou. Sem número ela não sabe o que houve. */
function resumoLimpeza(c: CorteIa): string | null {
  const l = c.limpeza;
  if (!l) return null;
  const partes: string[] = [];
  if (l.aviso) partes.push(l.aviso);
  else if (l.removidos?.length) {
    const tipos = [...new Set(l.removidos.map((r) => r.motivo))].join(", ");
    partes.push(
      `cortei ${Math.round(l.seg_removidos ?? 0)}s em ${l.removidos.length} ponto${
        l.removidos.length > 1 ? "s" : ""
      } (${tipos})`,
    );
  }
  if (l.aviso_filtro) partes.push(l.aviso_filtro);
  return partes.length ? partes.join(" · ") : null;
}

export function CortesIaSection({ cortes }: { cortes: CorteIa[] }) {
  const router = useRouter();
  const [apagando, setApagando] = useState<string | null>(null);
  const [erroApagar, setErroApagar] = useState<string | null>(null);

  async function apagar(c: CorteIa) {
    // Confirmação é obrigatória: a lista some da tela e não volta.
    if (!window.confirm(`Apagar "${c.tema}"? Some da lista e não dá pra desfazer.`)) return;
    setErroApagar(null);
    setApagando(c.id);
    const r = await excluirCorteAction(c.id);
    setApagando(null);
    // 🔴 Recusa vira texto na tela, nunca botão que não faz nada: a gravação
    // em andamento não pode ser apagada, e a nutri precisa saber por quê.
    if (!r.ok) setErroApagar(r.erro ?? "Não consegui apagar.");
    else router.refresh();
  }

  const emAndamento = cortes.some(
    (c) => (c.status === "enviado" || c.status === "processando") && !travou(c),
  );

  useEffect(() => {
    if (!emAndamento) return;
    const id = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [emAndamento, router]);

  return (
    <section id="cortes-ia" className="mb-10 rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">
            🎬 Edição automática{" "}
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              teste
            </span>
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
            Grave no teleprompter (ou mande um vídeo do celular) e clique em
            &quot;Editar automaticamente&quot;: o Scanner tira as pausas e os
            recomeços, devolve em 9:16 com legenda, palavra-chave por trecho e
            imagens de apoio. Você escolhe o filtro e o estilo da legenda antes
            de mandar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/biblioteca-videos"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-brand-text ring-1 ring-brand-text/10 hover:ring-brand-primary/40"
          >
            📚 Biblioteca de clipes
          </Link>
          <Link
            href="/dashboard/teleprompter"
            className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            🎥 Gravar agora
          </Link>
        </div>
      </div>

      <EnviarDoCelular />

      {erroApagar && (
        <p className="mt-3 text-sm text-red-700">{erroApagar}</p>
      )}

      {cortes.length === 0 ? (
        <p className="mt-4 text-sm text-brand-text/50">Nenhuma gravação enviada ainda.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {cortes.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-muted/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-brand-text">{c.tema}</p>
                <p className="text-xs text-brand-text/50">
                  {c.duracao_seg ? `${Math.round(Number(c.duracao_seg))}s · ` : ""}
                  {new Date(c.criado_em).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {c.filtro && c.filtro !== "nenhum"
                    ? ` · filtro ${FILTROS.find((f) => f.id === c.filtro)?.rotulo ?? c.filtro}`
                    : ""}
                  {c.origem_tipo === "upload" ? " · do celular" : ""}
                </p>
                {resumoLimpeza(c) && (
                  <p className="mt-0.5 text-xs text-brand-text/45">{resumoLimpeza(c)}</p>
                )}
              </div>
              {c.status === "pronto" && c.url ? (
                <div className="flex items-center gap-2">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-text ring-1 ring-brand-text/10"
                  >
                    ▶️ Ver
                  </a>
                  <a
                    href={c.url}
                    download
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white"
                  >
                    ⬇️ Baixar MP4
                  </a>
                  <BotaoApagar corte={c} apagando={apagando === c.id} onApagar={apagar} />
                </div>
              ) : c.status === "erro" ? (
                <div className="flex items-center gap-2">
                  <span
                    title={c.erro_msg ?? undefined}
                    className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
                  >
                    erro — grave de novo{c.erro_msg ? ` (${c.erro_msg.slice(0, 60)})` : ""}
                  </span>
                  <BotaoApagar corte={c} apagando={apagando === c.id} onApagar={apagar} />
                </div>
              ) : travou(c) ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    não ficou pronto — grave de novo
                  </span>
                  <BotaoApagar corte={c} apagando={apagando === c.id} onApagar={apagar} />
                </div>
              ) : (
                <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  {ETAPA[c.etapa ?? ""] ?? "⏳ na fila"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Lixeira. Some durante a exclusão pra não aceitar dois cliques. */
function BotaoApagar({
  corte,
  apagando,
  onApagar,
}: {
  corte: CorteIa;
  apagando: boolean;
  onApagar: (c: CorteIa) => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onApagar(corte)}
      disabled={apagando}
      title="Apagar esta gravação"
      aria-label={`Apagar ${corte.tema}`}
      className="rounded-lg bg-white px-2.5 py-1.5 text-xs text-brand-text/60 ring-1 ring-brand-text/10 hover:text-red-700 hover:ring-red-200 disabled:opacity-50"
    >
      {apagando ? "…" : "🗑"}
    </button>
  );
}
