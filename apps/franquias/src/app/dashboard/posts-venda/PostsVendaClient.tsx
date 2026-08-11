"use client";

import { useState, useTransition } from "react";
import type { TipoPost } from "@/lib/claude/prompts";
import {
  atualizarProdutosScanner,
  gerarPostVendaAction,
  type ProdutoScannerLista,
} from "@/lib/produtos/actions";
import { criarPostManual } from "@/lib/posts/manual";

type PostGerado = {
  headline: string;
  subtitle?: string;
  copy_legenda: string;
  copy_cta: string;
  hashtags: string[];
  slides?: string[];
};

const TIPOS: Array<{ valor: TipoPost; label: string }> = [
  { valor: "feed_imagem", label: "Post de feed" },
  { valor: "feed_carrossel", label: "Carrossel" },
];

export function PostsVendaClient(props: {
  produtosIniciais: ProdutoScannerLista[];
  temVinculo: boolean;
}) {
  const [produtos, setProdutos] = useState(props.produtosIniciais);
  const [sincronizando, setSincronizando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [produtoAtivo, setProdutoAtivo] = useState<ProdutoScannerLista | null>(null);
  const [tipo, setTipo] = useState<TipoPost>("feed_imagem");
  const [incluirPreco, setIncluirPreco] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [post, setPost] = useState<PostGerado | null>(null);

  const [urlImagem, setUrlImagem] = useState("");
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
  function salvar() {
    if (!post) return;
    setErro(null);
    const imagem = urlImagem.trim();
    startAgendar(async () => {
      const r = await criarPostManual({
        tipo,
        copy_legenda: montarLegendaFinal(post),
        copy_cta: post.copy_cta,
        hashtags: post.hashtags,
        briefing_nutri: `Post de venda: ${produtoAtivo?.nome ?? ""}`,
        url_imagem: imagem || undefined,
        legenda_gerada_ia: true,
      });
      if (r.ok) {
        setAgendado(true);
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
                  URL da imagem (da sua galeria — opcional)
                  <input
                    type="url"
                    placeholder="https://…"
                    value={urlImagem}
                    onChange={(e) => setUrlImagem(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-brand-text/15 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <button
                  onClick={salvar}
                  disabled={agendando || agendado}
                  className="rounded-full bg-brand-text px-5 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {agendado ? "✓ Salvo" : agendando ? "Salvando…" : "Salvar post"}
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
