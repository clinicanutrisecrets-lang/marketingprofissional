"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  aprovarSemanaToda,
  atualizarCopyPost,
  cancelarPost,
  gerarSemanaManual,
  gerarPostSubstituto,
} from "@/lib/posts/actions";
import { formatDate } from "@/lib/utils";
import { baixarArquivo } from "@/lib/download-arquivo";
import {
  legendaParaCopiar,
  nomeArquivoDaArte,
  rotuloSemanaCurto,
} from "@/lib/aprovacao/semana";

type SemanaChip = {
  id: string;
  semana_ref: string;
  status: string | null;
  posts: number;
  fechada: boolean;
};

type Props = {
  franqueadaId: string;
  aprovacao: Record<string, unknown> | null;
  posts: Array<Record<string, unknown>>;
  /** true = a nutri já aprovou: sem edição, só baixar e postar. */
  fechada: boolean;
  historico: SemanaChip[];
  /** Instagram ligado (token ou Publer). Hoje: nenhuma conta tem. */
  publicacaoAutomatica: boolean;
};

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TIPO_LABEL: Record<string, string> = {
  feed_imagem: "Feed",
  feed_carrossel: "Carrossel",
  reels: "Reels",
  stories: "Stories",
};

export function AprovacaoView({
  aprovacao,
  posts,
  fechada,
  historico,
  publicacaoAutomatica,
}: Props) {
  const router = useRouter();
  const [postsState, setPostsState] = useState(posts);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [aprovadaAgora, setAprovadaAgora] = useState(false);
  const [baixandoTudo, setBaixandoTudo] = useState<string | null>(null);

  const estaFechada = fechada || aprovadaAgora;

  if (!aprovacao || postsState.length === 0) {
    return (
      <>
        <HistoricoSemanas historico={historico} atual={null} />
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-5xl">📭</div>
          <h2 className="mb-2 text-xl font-semibold">
            Nenhuma semana pra revisar agora
          </h2>
          <p className="mb-6 text-sm text-brand-text/60">
            Todo domingo de manhã o Scanner monta o pacote da semana e ele
            aparece aqui. Se quiser antecipar, monte agora.
          </p>
          <button
            type="button"
            disabled={gerando}
            onClick={async () => {
              setGerando(true);
              setErro(null);
              setMsg(null);
              const r = await gerarSemanaManual();
              setGerando(false);
              if (r.ok) {
                setMsg(`${r.total} posts gerados! Carregando...`);
                setTimeout(() => window.location.reload(), 500);
              } else if (r.jaExiste) {
                // Semana já montada não é erro: é a semana dela, em outro
                // lugar da tela. Manda ela pra lá em vez de acusar falha.
                setErro(null);
                setMsg(r.erro ?? null);
                setTimeout(() => window.location.reload(), 2500);
              } else {
                setErro(r.erro ?? "Não deu pra montar a semana agora.");
              }
            }}
            className="rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
          >
            {gerando ? "Montando a semana (1 a 3 min)..." : "📅 Montar a semana agora"}
          </button>
          {msg && <div className="mt-3 text-sm text-brand-text/70">{msg}</div>}
          {erro && <div className="mt-3 text-sm text-red-600">{erro}</div>}
        </div>
      </>
    );
  }

  const pendentes = postsState.filter(
    (p) => (p.status as string) === "aguardando_aprovacao",
  );
  const aprovados = postsState.filter((p) => (p.status as string) === "aprovado");
  const cancelados = postsState.filter((p) => (p.status as string) === "cancelado");
  const paraBaixar = postsState.filter(
    (p) => (p.status as string) !== "cancelado" && !!p.url_imagem_final,
  );

  async function handleAprovarTudo() {
    setErro(null);
    setConfirmando(false);
    startTransition(async () => {
      const r = await aprovarSemanaToda(aprovacao!.id as string);
      if (r.ok) {
        // Nada de redirecionar pro dashboard: a semana aprovada FICA aqui,
        // é daqui que ela baixa. Era o redirect que dava a impressão de
        // que os posts tinham sumido ao aprovar.
        setAprovadaAgora(true);
        setPostsState((prev) =>
          prev.map((p) =>
            (p.status as string) === "aguardando_aprovacao"
              ? { ...p, status: "aprovado" }
              : p,
          ),
        );
        setMsg(null);
        router.refresh();
      } else {
        setErro(r.erro ?? "Não deu pra aprovar agora. Tente de novo.");
      }
    });
  }

  async function baixarTudo() {
    if (paraBaixar.length === 0) return;
    setErro(null);
    let falhou = 0;
    // Um a um: o navegador engasga com vários downloads simultâneos.
    for (let i = 0; i < paraBaixar.length; i++) {
      const p = paraBaixar[i]!;
      setBaixandoTudo(`${i + 1} de ${paraBaixar.length}`);
      const url = p.url_imagem_final as string;
      const ok = await baixarArquivo(url, nomeArquivoDaArte(p, url));
      if (!ok) falhou++;
    }
    setBaixandoTudo(null);
    if (falhou > 0) {
      setErro(
        `${falhou} ${falhou === 1 ? "arte não baixou" : "artes não baixaram"}. Abra o post e use o botão "Baixar arte" dele.`,
      );
    }
  }

  return (
    <>
      <HistoricoSemanas historico={historico} atual={aprovacao.id as string} />

      {estaFechada && (
        <div className="mb-4 rounded-2xl border-2 border-green-300 bg-green-50 p-4">
          <div className="text-base font-semibold text-green-800">
            ✓ Semana aprovada
          </div>
          <p className="mt-1 text-sm text-green-900/80">
            Aprovada quer dizer que você não vai mais mudar nada aqui. Agora é
            baixar as artes, copiar as legendas e postar no seu Instagram.
            Está tudo nos botões de cada post.
            {publicacaoAutomatica
              ? " Como o seu Instagram está conectado, o Scanner também publica no horário agendado."
              : ""}
          </p>
          {aprovacao.aprovada_em && (
            <p className="mt-1 text-xs text-green-900/60">
              Aprovada em{" "}
              {new Date(aprovacao.aprovada_em as string).toLocaleString("pt-BR")}.
            </p>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-brand-text/60">
            Semana de {formatDate(aprovacao.semana_ref as string)}
          </div>
          <div className="mt-1 text-lg font-semibold text-brand-text">
            {postsState.length} {postsState.length === 1 ? "post" : "posts"} ·{" "}
            {pendentes.length} pendentes · {aprovados.length} aprovados
            {cancelados.length > 0 &&
              ` · ${cancelados.length} ${cancelados.length === 1 ? "cancelado" : "cancelados"}`}
          </div>
          {!estaFechada && aprovacao.deadline && (
            <div className="mt-0.5 text-xs text-amber-600">
              Revise até{" "}
              {new Date(aprovacao.deadline as string).toLocaleString("pt-BR")}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {paraBaixar.length > 0 && (
            <button
              type="button"
              onClick={baixarTudo}
              disabled={!!baixandoTudo}
              className="rounded-lg border border-brand-primary bg-white px-4 py-2.5 text-sm font-semibold text-brand-primary hover:bg-brand-primary/5 disabled:opacity-60"
            >
              {baixandoTudo
                ? `Baixando ${baixandoTudo}...`
                : `⬇ Baixar as ${paraBaixar.length} artes`}
            </button>
          )}
          {!estaFechada && (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              disabled={isPending || pendentes.length === 0}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {isPending ? "Aprovando..." : "✓ Aprovar tudo de uma vez"}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {msg}
        </div>
      )}
      {erro && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {postsState.map((post) => (
          <PostCard
            key={post.id as string}
            post={post}
            onUpdate={(updated) =>
              setPostsState((prev) =>
                prev.map((p) => (p.id === updated.id ? updated : p)),
              )
            }
          />
        ))}
      </div>

      {confirmando && (
        <ModalConfirmarAprovacao
          quantos={pendentes.length}
          publicacaoAutomatica={publicacaoAutomatica}
          onCancelar={() => setConfirmando(false)}
          onConfirmar={handleAprovarTudo}
        />
      )}
    </>
  );
}

/**
 * Os chips das semanas anteriores. Existem porque, sem eles, só a semana mais
 * recente é alcançável — e "sumiu a semana passada" foi exatamente o relato
 * que trouxe esta tela pra revisão (13/09/2026).
 */
function HistoricoSemanas({
  historico,
  atual,
}: {
  historico: SemanaChip[];
  atual: string | null;
}) {
  if (historico.length < 2) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-brand-text/50">
        Suas semanas
      </span>
      {historico.map((s) => {
        const ativo = s.id === atual;
        return (
          <Link
            key={s.id}
            href={`/dashboard/aprovar?semana=${s.id}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
              ativo
                ? "bg-brand-primary text-white ring-brand-primary"
                : "bg-white text-brand-text/70 ring-brand-text/10 hover:ring-brand-primary/40"
            }`}
          >
            {s.fechada ? "✓ " : ""}
            {rotuloSemanaCurto(s.semana_ref)} · {s.posts}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * O popup que a Aline pediu (13/09/2026): aprovar é uma decisão, não um passo
 * burocrático. Ela definiu o significado — "aprovado quer dizer que você não
 * quer mais fazer alterações e está pronto pra baixar e postar" — e é isso
 * que o texto diz, antes de a nutri clicar.
 */
export function ModalConfirmarAprovacao({
  quantos,
  publicacaoAutomatica,
  onCancelar,
  onConfirmar,
}: {
  quantos: number;
  publicacaoAutomatica: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-brand-text">
          Aprovar {quantos} {quantos === 1 ? "post" : "posts"} desta semana?
        </h3>
        <p className="mt-3 text-sm text-brand-text/80">
          Aprovar quer dizer que você <strong>não quer mais fazer
          alterações</strong> nesses posts.
        </p>
        <p className="mt-2 text-sm text-brand-text/80">
          Depois de aprovar, a semana continua aqui nesta tela, pronta pra você
          baixar as artes, copiar as legendas e postar no seu Instagram.
          {publicacaoAutomatica
            ? " Como o seu Instagram está conectado, o Scanner também publica no horário agendado."
            : ""}
        </p>
        <p className="mt-2 text-xs text-brand-text/60">
          Quer mudar alguma coisa antes? Volte e use o ✎ Editar do post.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg border border-brand-text/15 px-4 py-2 text-sm font-medium text-brand-text/70 hover:border-brand-text/30"
          >
            Ainda quero editar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            Sim, está aprovado
          </button>
        </div>
      </div>
    </div>
  );
}

function SubstituirButton({
  postId,
  onSubstituido,
}: {
  postId: string;
  onSubstituido: () => void;
}) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handle() {
    setGerando(true);
    setErro(null);
    const r = await gerarPostSubstituto(postId);
    setGerando(false);
    if (r.ok) {
      onSubstituido();
    } else {
      setErro(r.erro ?? "Erro");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={gerando}
        className="rounded-md border border-brand-primary bg-brand-primary/5 px-2 py-1 text-xs font-medium text-brand-primary hover:bg-brand-primary/10 disabled:opacity-60"
      >
        {gerando ? "Gerando..." : "🔄 Gerar outro post"}
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </>
  );
}

function PostCard({
  post,
  onUpdate,
}: {
  post: Record<string, unknown>;
  onUpdate: (p: Record<string, unknown>) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [copy, setCopy] = useState((post.copy_legenda as string) ?? "");
  const [cta, setCta] = useState((post.copy_cta as string) ?? "");
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [avisoDownload, setAvisoDownload] = useState(false);

  const data = post.data_hora_agendada
    ? new Date(post.data_hora_agendada as string)
    : null;
  const diaLabel = data ? `${DIAS_SEMANA[data.getDay()]} · ${data.toLocaleDateString("pt-BR")}` : "—";
  const horaLabel = data ? data.toTimeString().slice(0, 5) : "";
  const status = (post.status as string) ?? "aguardando_aprovacao";
  const imgUrl = post.url_imagem_final as string | null;

  async function salvarEdicao() {
    setSalvando(true);
    const r = await atualizarCopyPost(post.id as string, {
      copy_legenda: copy,
      copy_cta: cta,
    });
    setSalvando(false);
    if (r.ok) {
      onUpdate({ ...post, copy_legenda: copy, copy_cta: cta, editado_pela_nutri: true });
      setEditando(false);
    }
  }

  async function handleCancelar() {
    if (!confirm("Cancelar esse post?")) return;
    const r = await cancelarPost(post.id as string);
    if (r.ok) onUpdate({ ...post, status: "cancelado" });
  }

  async function copiarLegenda() {
    const texto = legendaParaCopiar({
      copy_legenda: copy,
      copy_cta: cta,
      hashtags: (post.hashtags as string[] | null) ?? null,
    });
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // clipboard bloqueado — a legenda está na tela pra selecionar à mão
    }
  }

  async function baixarArte() {
    if (!imgUrl || baixando) return;
    setBaixando(true);
    setAvisoDownload(false);
    const ok = await baixarArquivo(imgUrl, nomeArquivoDaArte(post, imgUrl));
    setBaixando(false);
    if (!ok) {
      // Última cartada: abre a arte pra ela salvar com o botão direito.
      setAvisoDownload(true);
      window.open(imgUrl, "_blank", "noopener");
    }
  }

  const cardClasses =
    status === "aprovado"
      ? "border-green-300 bg-green-50/30"
      : status === "cancelado"
        ? "border-gray-200 bg-gray-50 opacity-60"
        : "border-brand-text/10 bg-white";

  return (
    <div className={`overflow-hidden rounded-2xl border-2 shadow-sm ${cardClasses}`}>
      {imgUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={imgUrl} alt="Criativo" className="aspect-square w-full object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-brand-muted text-4xl">
          🎨
        </div>
      )}

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wider text-brand-primary">
            {TIPO_LABEL[post.tipo_post as string] ?? post.tipo_post as string}
          </span>
          <span className="text-brand-text/50">
            {diaLabel} {horaLabel}
          </span>
        </div>

        {post.origem === "briefing_antecipado" && post.briefing_nutri && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <div className="font-semibold">📝 Você pediu este tema</div>
            <div className="mt-0.5 line-clamp-2 text-amber-800/80">
              {post.briefing_nutri as string}
            </div>
          </div>
        )}

        {editando ? (
          <div className="space-y-2">
            <textarea
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-brand-text/10 p-2 text-xs"
            />
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="CTA"
              className="w-full rounded-lg border border-brand-text/10 p-2 text-xs"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={salvarEdicao}
                disabled={salvando}
                className="flex-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(false);
                  setCopy((post.copy_legenda as string) ?? "");
                  setCta((post.copy_cta as string) ?? "");
                }}
                className="rounded-lg border border-brand-text/10 px-3 py-1.5 text-xs hover:border-brand-text/30"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-2 line-clamp-4 text-sm text-brand-text whitespace-pre-wrap">
              {copy}
            </p>
            {cta && (
              <p className="mb-2 text-xs font-semibold text-brand-primary">{cta}</p>
            )}
            {Array.isArray(post.hashtags) && (post.hashtags as string[]).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {(post.hashtags as string[]).slice(0, 4).map((h, i) => (
                  <span key={i} className="text-[10px] text-brand-primary">
                    #{h}
                  </span>
                ))}
                {(post.hashtags as string[]).length > 4 && (
                  <span className="text-[10px] text-brand-text/50">
                    +{(post.hashtags as string[]).length - 4}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {status !== "cancelado" && (
                <>
                  {imgUrl && (
                    <button
                      type="button"
                      onClick={baixarArte}
                      disabled={baixando}
                      className="rounded-md border border-brand-primary bg-brand-primary/5 px-2 py-1 text-xs font-medium text-brand-primary hover:bg-brand-primary/10 disabled:opacity-60"
                    >
                      {baixando ? "Baixando..." : "⬇ Baixar arte"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={copiarLegenda}
                    className="rounded-md border border-brand-text/10 px-2 py-1 text-xs hover:border-brand-primary"
                  >
                    {copiado ? "✓ Copiada" : "📋 Copiar legenda"}
                  </button>
                </>
              )}
              {status === "aguardando_aprovacao" && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditando(true)}
                    className="rounded-md border border-brand-text/10 px-2 py-1 text-xs hover:border-brand-primary"
                  >
                    ✎ Editar
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelar}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    🗑 Cancelar
                  </button>
                </>
              )}
              {status === "aprovado" && (
                <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                  ✓ Aprovado
                </span>
              )}
              {status === "cancelado" && (
                <>
                  <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    Cancelado
                  </span>
                  <SubstituirButton
                    postId={post.id as string}
                    onSubstituido={() => window.location.reload()}
                  />
                </>
              )}
              {post.editado_pela_nutri && status !== "cancelado" && (
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700">
                  ✎ editado
                </span>
              )}
            </div>
            {avisoDownload && (
              <p className="mt-2 text-xs text-amber-700">
                O download automático foi bloqueado pelo navegador. Abri a arte
                numa aba: salve com o botão direito.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
