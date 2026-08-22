"use client";

import { useState } from "react";
import Link from "next/link";
import { marcarStatusSugestao } from "@/lib/conteudo/actions";

export type Sugestao = {
  id: string;
  semana_ref: string;
  ordem: number;
  tipo: "feed_imagem" | "feed_carrossel" | "reel" | "story";
  tema: string;
  gatilho_pauta: string | null;
  copy_legenda: string;
  hashtags: string[] | null;
  roteiro: {
    hook: string;
    blocos: string[];
    cta: string;
    duracao_s?: number;
    dicas?: string[];
    teleprompter?: string;
  } | null;
  artes: Array<{ url: string; slide: number }> | null;
  status: string;
};

const LABEL_TIPO: Record<Sugestao["tipo"], { label: string; cor: string }> = {
  feed_imagem: { label: "POST", cor: "bg-emerald-600" },
  feed_carrossel: { label: "CARROSSEL", cor: "bg-indigo-600" },
  reel: { label: "REEL", cor: "bg-rose-600" },
  story: { label: "STORIES", cor: "bg-amber-500" },
};

/**
 * Baixa de verdade — o atributo `download` do <a> só funciona same-origin, e
 * as artes moram no Storage do Supabase (outro domínio). O navegador ignorava
 * o `download` e, com target="_blank", ou abria a imagem numa aba ou era
 * barrado como popup: pra Juliana o botão simplesmente "não fazia nada"
 * (12/08). Buscando o arquivo e criando um blob local, o download acontece.
 */
async function baixarArquivo(url: string, nome: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoga depois pra não cancelar o download em curso no Safari.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch {
    return false;
  }
}

export function SugestaoCard({ sugestao: s }: { sugestao: Sugestao }) {
  const [copiado, setCopiado] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [erroDownload, setErroDownload] = useState(false);
  const artes = s.artes ?? [];
  const t = LABEL_TIPO[s.tipo];

  async function baixarArtes() {
    if (baixando || artes.length === 0) return;
    setBaixando(true);
    setErroDownload(false);
    let algumFalhou = false;
    // Um a um: o navegador engasga com vários downloads simultâneos.
    for (const a of artes) {
      const ok = await baixarArquivo(a.url, `${s.tipo}-${s.ordem}-slide${a.slide}.png`);
      if (!ok) algumFalhou = true;
    }
    if (algumFalhou) {
      setErroDownload(true);
      // Última cartada: abre a primeira arte pra ela salvar com o botão direito.
      window.open(artes[0]!.url, "_blank", "noopener");
    } else {
      void marcarStatusSugestao(s.id, "baixado");
    }
    setBaixando(false);
  }

  const legendaCompleta = [
    s.copy_legenda,
    (s.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" "),
  ]
    .filter(Boolean)
    .join("\n\n");

  async function copiarLegenda() {
    try {
      await navigator.clipboard.writeText(legendaCompleta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard bloqueado — usuário pode selecionar manualmente
    }
  }

  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-white ${t.cor}`}>
          {t.label}
        </span>
        <h3 className="flex-1 text-sm font-semibold text-brand-text">{s.tema}</h3>
        {s.status !== "sugerido" && (
          <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] text-brand-text/60">
            {s.status}
          </span>
        )}
      </div>

      {s.gatilho_pauta && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          🔥 <strong>Por que agora:</strong> {s.gatilho_pauta}
        </p>
      )}

      {artes.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {artes.map((a) => (
            <a
              key={a.slide}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              title={`Abrir slide ${a.slide} em tamanho real`}
              className="shrink-0"
            >
              {/* object-CONTAIN, não cover: a miniatura mostra a arte INTEIRA.
                  Com cover, o card 1080x1350 aparecia cortado no meio e dava a
                  impressão de arte sem texto — foi o que a Juliana viu. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={`Arte ${a.slide}`}
                className="h-36 w-36 rounded-lg bg-brand-muted object-contain ring-1 ring-black/5 transition hover:ring-brand-primary"
              />
            </a>
          ))}
        </div>
      )}

      {s.tipo === "story" && (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-semibold">📱 Roteiro de telas — grave/poste uma tela por vez</p>
          <p className="mt-1 text-amber-900/70">
            A última tela é o convite de interação (enquete, caixa de pergunta ou link).
          </p>
        </div>
      )}

      {s.tipo === "reel" && s.roteiro && (
        <div className="mb-3 rounded-lg bg-brand-muted/60 px-3 py-2 text-xs text-brand-text/80">
          <p className="font-semibold">🎬 Hook: “{s.roteiro.hook}”</p>
          <p className="mt-1 text-brand-text/60">
            {s.roteiro.blocos.length} blocos · ~{s.roteiro.duracao_s ?? 45}s
          </p>
        </div>
      )}

      <p className="mb-4 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-brand-text/70">
        {s.copy_legenda}
      </p>

      <div className="mt-auto flex flex-wrap gap-2">
        <button
          onClick={copiarLegenda}
          className="rounded-lg bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20"
        >
          {copiado ? "✓ Copiado!" : "📋 Copiar legenda"}
        </button>

        {artes.length > 0 && (
          <button
            onClick={() => void baixarArtes()}
            disabled={baixando}
            className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {baixando
              ? "Baixando…"
              : `⬇️ Baixar arte${artes.length > 1 ? `s (${artes.length})` : ""}`}
          </button>
        )}

        {s.tipo === "reel" && (
          <Link
            href={`/dashboard/conteudo/reel/${s.id}`}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            🎥 Gravar com teleprompter
          </Link>
        )}

        <button
          onClick={() => void marcarStatusSugestao(s.id, "descartado")}
          className="ml-auto rounded-lg px-2 py-1.5 text-xs text-brand-text/40 hover:text-red-600"
          title="Descartar sugestão"
        >
          ✕
        </button>
      </div>

      {erroDownload && (
        <p className="mt-2 text-[11px] text-amber-700">
          O download automático foi bloqueado pelo navegador. Abri a arte numa
          aba — clique com o botão direito e escolha “Salvar imagem como”.
        </p>
      )}
    </article>
  );
}
