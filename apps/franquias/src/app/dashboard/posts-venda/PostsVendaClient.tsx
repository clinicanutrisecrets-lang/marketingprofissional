"use client";

import { useRef, useState, useTransition } from "react";
import type { TipoPost } from "@/lib/claude/prompts";
import {
  NIVEIS_CONSCIENCIA,
  ROTULO_CONSCIENCIA,
  type NivelConsciencia,
} from "@/lib/claude/consciencia";
import {
  atualizarProdutosScanner,
  gerarPostVendaAction,
  type ProdutoScannerLista,
} from "@/lib/produtos/actions";
import { criarPostManual } from "@/lib/posts/manual";
import { uploadArquivo } from "@/lib/arquivos/actions";
import { avaliarImagem } from "@/lib/criativo/imagem-upload";

type PostGerado = {
  headline: string;
  subtitle?: string;
  copy_legenda: string;
  copy_cta: string;
  hashtags: string[];
  slides?: string[];
  roteiro?: string;
  stories?: string[];
};

// Reels e stories entraram em 22/09/2026 (Aline): o nível de consciência
// muda o que se fala do MESMO produto, e vídeo é onde a nutri mais vende —
// não fazia sentido a esteira parar em feed e carrossel.
const TIPOS: Array<{ valor: TipoPost; label: string }> = [
  { valor: "feed_imagem", label: "Post de feed" },
  { valor: "feed_carrossel", label: "Carrossel" },
  { valor: "reels", label: "Roteiro de reels" },
  { valor: "stories", label: "Roteiro de stories" },
];

/** Reels e stories saem como roteiro falado, não como arte. */
function ehRoteiro(t: TipoPost): boolean {
  return t === "reels" || t === "stories";
}

export function PostsVendaClient(props: {
  produtosIniciais: ProdutoScannerLista[];
  temVinculo: boolean;
  /** scanner_produto_id vindo da Esteira do Scanner — pré-seleciona o primeiro produto que casa. */
  produtoInicialScannerId?: string | null;
}) {
  const [produtos, setProdutos] = useState(props.produtosIniciais);
  const [sincronizando, setSincronizando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoScannerLista | null>(() =>
    props.produtoInicialScannerId
      ? props.produtosIniciais.find((p) => p.scanner_produto_id === props.produtoInicialScannerId) ?? null
      : null,
  );
  const [tipo, setTipo] = useState<TipoPost>("feed_imagem");
  const [incluirPreco, setIncluirPreco] = useState(true);
  // O MESMO produto muda de copy conforme quem lê. "Consciente do produto" é
  // o padrão porque é onde o post de venda costuma nascer: quem já conhece o
  // trabalho dela e está pesando.
  const [consciencia, setConsciencia] = useState<NivelConsciencia>("consciente_produto");
  const [gerando, setGerando] = useState(false);
  const [post, setPost] = useState<PostGerado | null>(null);

  // 🔴 ANEXO, não URL (Aline, 22/09/2026): "ninguém nunca põe um URL, é
  // sempre subir o arquivo do computador". O campo de link era o mesmo erro
  // da logo no Tratamentos (09/09) — quem tem a imagem tem o ARQUIVO.
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [subindo, setSubindo] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const [agendando, startAgendar] = useTransition();
  const [agendado, setAgendado] = useState(false); // "salvo"
  const [copiado, setCopiado] = useState<string | null>(null);

  async function sincronizar() {
    setSincronizando(true);
    setErro(null);
    setAviso(null);
    const r = await atualizarProdutosScanner();
    if (r.ok) {
      setAviso(
        r.total > 0
          ? `${r.total} produto${r.total > 1 ? "s" : ""} sincronizado${r.total > 1 ? "s" : ""} do Scanner Tratamentos.`
          : "Nenhum produto ativo encontrado no Scanner Tratamentos. Confere se seus produtos estão ativos no painel de lá.",
      );
      // recarrega a lista da fonte (server) — evita estado divergente
      window.location.reload();
    } else {
      setErro(r.erro);
      setSincronizando(false);
    }
  }

  async function gerar() {
    if (!produtoAtivo) return;
    setGerando(true);
    setErro(null);
    setPost(null);
    setAgendado(false);
    const r = await gerarPostVendaAction({
      produtoId: produtoAtivo.id,
      tipo,
      incluirPreco,
      consciencia,
    });
    if (r.ok) {
      setPost(r.post);
    } else {
      setErro(r.erro);
    }
    setGerando(false);
  }

  // Salva sem data: publicação automática depende da aprovação do app na
  // Meta, que ainda não saiu. Pedir data e dizer "agendar" prometeria o que
  // o sistema não faz — a nutri copia a legenda e publica no Instagram dela.
  function escolher(f: File | null) {
    setErroArquivo(null);
    setArquivo(null);
    if (!f) return;
    const v = avaliarImagem({ name: f.name, type: f.type, size: f.size });
    if (!v.ok) {
      setErroArquivo(v.erro);
      return;
    }
    setArquivo(f);
  }

  function salvar() {
    if (!post) return;
    setErro(null);
    startAgendar(async () => {
      let imagem: string | undefined;
      if (arquivo) {
        setSubindo(true);
        const fd = new FormData();
        fd.set("file", arquivo);
        fd.set("tipo", "outro");
        const up = await uploadArquivo(fd);
        setSubindo(false);
        // 🔴 Falha do upload NÃO segue calada salvando o post sem imagem: a
        // nutri anexou justamente porque quer a imagem junto.
        if (!up.ok || !up.url) {
          setErro(up.erro ?? "Não consegui subir a imagem. Tente de novo.");
          return;
        }
        imagem = up.url;
      }
      const r = await criarPostManual({
        tipo,
        copy_legenda: montarLegendaFinal(post),
        copy_cta: post.copy_cta,
        hashtags: post.hashtags,
        briefing_nutri: `Post de venda: ${produtoAtivo?.nome ?? ""}`,
        url_imagem: imagem,
        legenda_gerada_ia: true,
        angulo_copy: "divulgacao_produto",
        nivel_consciencia: consciencia,
      });
      if (r.ok) {
        setAgendado(true);
        setArquivo(null);
        if (inputArquivo.current) inputArquivo.current.value = "";
      } else {
        setErro(r.erro ?? "Não foi possível salvar.");
      }
    });
  }

  async function copiar(texto: string, chave: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setErro("Não consegui copiar — seleciona o texto e copia manualmente.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-brand-text/50">
          {produtos.length > 0
            ? `${produtos.length} produto${produtos.length > 1 ? "s" : ""} do seu catálogo`
            : "Nenhum produto sincronizado ainda"}
        </p>
        <button
          onClick={sincronizar}
          disabled={sincronizando}
          className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-brand-text shadow-sm ring-1 ring-brand-text/10 hover:bg-brand-muted disabled:opacity-60"
        >
          {sincronizando ? "Sincronizando…" : "⟳ Atualizar produtos"}
        </button>
      </div>

      {aviso && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {aviso}
        </div>
      )}
      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {produtos.length === 0 && (
        <div className="rounded-2xl border border-brand-text/10 bg-white p-6 text-sm text-brand-text/70">
          {props.temVinculo ? (
            <>
              Seus produtos do Scanner Tratamentos aparecem aqui. Clica em{" "}
              <strong>“Atualizar produtos”</strong> pra buscar seu catálogo — se
              continuar vazio, confere no painel do Tratamentos se os produtos estão
              ativos.
            </>
          ) : (
            <>
              Sua conta ainda não está vinculada ao Scanner da Saúde. Entra uma vez pelo
              menu <strong>Marketing Profissional</strong> dentro do Scanner que o vínculo
              é feito automaticamente.
            </>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {produtos.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setProdutoAtivo(p);
              setPost(null);
              setAgendado(false);
              setErro(null);
            }}
            className={`rounded-2xl border p-4 text-left transition ${
              produtoAtivo?.id === p.id
                ? "border-brand-primary bg-white shadow-md"
                : "border-brand-text/10 bg-white hover:shadow-sm"
            }`}
          >
            <p className="text-sm font-bold text-brand-text">{p.nome}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-brand-text/40">
              {(p.tipo ?? "produto").replace(/_/g, " ")}
              {p.preco_texto ? ` · ${p.preco_texto}` : ""}
            </p>
            {p.descricao && (
              <p className="mt-2 line-clamp-2 text-xs text-brand-text/60">{p.descricao}</p>
            )}
          </button>
        ))}
      </div>

      {produtoAtivo && (
        <div className="rounded-2xl border border-brand-text/10 bg-white p-5">
          <p className="text-sm font-bold text-brand-text">
            Gerar post de venda — {produtoAtivo.nome}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {TIPOS.map((t) => (
                <button
                  key={t.valor}
                  onClick={() => setTipo(t.valor)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    tipo === t.valor
                      ? "bg-brand-primary text-white"
                      : "bg-brand-muted text-brand-text/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-brand-text/70">
              <input
                type="checkbox"
                checked={incluirPreco}
                onChange={(e) => setIncluirPreco(e.target.checked)}
                disabled={!produtoAtivo.preco_texto}
              />
              Citar o preço {produtoAtivo.preco_texto ? `(${produtoAtivo.preco_texto})` : "(sem preço cadastrado)"}
            </label>
            <label className="flex items-center gap-2 text-xs text-brand-text/70">
              <span className="whitespace-nowrap">Quem vai ler</span>
              <select
                value={consciencia}
                onChange={(e) => setConsciencia(e.target.value as NivelConsciencia)}
                className="rounded-full border border-brand-text/15 bg-white px-3 py-1.5 text-xs"
              >
                {NIVEIS_CONSCIENCIA.map((n) => (
                  <option key={n} value={n}>
                    {ROTULO_CONSCIENCIA[n]}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={gerar}
              disabled={gerando}
              className="ml-auto rounded-full bg-brand-primary px-5 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
            >
              {gerando ? "Gerando…" : post ? "Gerar outra versão" : "✨ Gerar post"}
            </button>
          </div>

          {post && (
            <div className="mt-5 space-y-4 border-t border-brand-text/10 pt-5">
              <CampoCopiavel
                rotulo="Headline (texto do criativo)"
                valor={post.subtitle ? `${post.headline}\n${post.subtitle}` : post.headline}
                copiado={copiado === "headline"}
                onCopiar={(v) => copiar(v, "headline")}
              />
              {post.slides && post.slides.length > 0 && (
                <CampoCopiavel
                  rotulo={`Slides do carrossel (${post.slides.length})`}
                  valor={post.slides.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}
                  copiado={copiado === "slides"}
                  onCopiar={(v) => copiar(v, "slides")}
                />
              )}
              {post.roteiro && (
                <CampoCopiavel
                  rotulo="Roteiro do reels (o que você fala)"
                  valor={post.roteiro}
                  copiado={copiado === "roteiro"}
                  onCopiar={(v) => copiar(v, "roteiro")}
                />
              )}
              {post.stories && post.stories.length > 0 && (
                <CampoCopiavel
                  rotulo={`Sequência de stories (${post.stories.length})`}
                  valor={post.stories.map((t, i) => `${i + 1}. ${t}`).join("\n\n")}
                  copiado={copiado === "stories"}
                  onCopiar={(v) => copiar(v, "stories")}
                />
              )}
              {/* "Abrir já a câmera com o prompt" (Aline, 22/09/2026): o
                  roteiro vai pro teleprompter pela URL, então ela sai daqui
                  direto pra gravar, sem copiar e colar no meio. */}
              {textoParaGravar(post) && (
                <a
                  href={`/dashboard/teleprompter?texto=${encodeURIComponent(textoParaGravar(post))}`}
                  className="inline-block rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
                >
                  🎥 Abrir a câmera com este roteiro
                </a>
              )}
              <CampoCopiavel
                rotulo="Legenda + hashtags"
                valor={montarLegendaFinal(post)}
                copiado={copiado === "legenda"}
                onCopiar={(v) => copiar(v, "legenda")}
              />
              <CampoCopiavel
                rotulo="CTA com link do checkout"
                valor={post.copy_cta}
                copiado={copiado === "cta"}
                onCopiar={(v) => copiar(v, "cta")}
              />

              <div className="flex flex-wrap items-end gap-3 rounded-xl bg-brand-muted p-4">
                <label className="min-w-[240px] flex-1 text-xs text-brand-text/70">
                  Imagem do post (opcional)
                  <input
                    ref={inputArquivo}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => escolher(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-sm text-brand-text/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-text file:ring-1 file:ring-brand-text/10"
                  />
                  {arquivo && (
                    <span className="mt-1 block text-[11px] text-brand-text/50">
                      {arquivo.name} · {(arquivo.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                  {erroArquivo && (
                    <span className="mt-1 block text-[11px] text-red-700">{erroArquivo}</span>
                  )}
                </label>
                <button
                  onClick={salvar}
                  disabled={agendando || agendado}
                  className="rounded-full bg-brand-text px-5 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {agendado
                    ? "✓ Salvo"
                    : subindo
                      ? "⏫ Subindo a imagem…"
                      : agendando
                        ? "Salvando…"
                        : "Salvar post"}
                </button>
                <p className="basis-full text-[11px] text-brand-text/50">
                  O post fica salvo na sua biblioteca pra você copiar e publicar no seu
                  Instagram quando quiser. Publicar automático depende de uma liberação da
                  Meta que ainda não saiu.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * O que o teleprompter vai rolar. Reels é o roteiro corrido; stories é a
 * sequência, uma tela por linha. Post de imagem e carrossel não têm fala —
 * devolve "" e o botão nem aparece.
 */
function textoParaGravar(post: PostGerado): string {
  if (post.roteiro?.trim()) return post.roteiro.trim();
  if (post.stories?.length) return post.stories.join("\n\n");
  return "";
}

function montarLegendaFinal(post: PostGerado): string {
  const hashtags = post.hashtags?.length
    ? `\n\n${post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}`
    : "";
  return `${post.copy_legenda}${hashtags}`;
}

function CampoCopiavel(props: {
  rotulo: string;
  valor: string;
  copiado: boolean;
  onCopiar: (valor: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text/50">
          {props.rotulo}
        </p>
        <button
          onClick={() => props.onCopiar(props.valor)}
          className="text-[11px] font-semibold text-brand-primary hover:underline"
        >
          {props.copiado ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-xl bg-brand-muted p-3 font-sans text-sm text-brand-text">
        {props.valor}
      </pre>
    </div>
  );
}
