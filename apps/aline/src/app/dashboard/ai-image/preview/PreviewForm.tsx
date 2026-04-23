"use client";

import { useState } from "react";

type Tipo = "feed_imagem" | "feed_carrossel" | "stories";
type Provider = "openai" | "gemini";
type Modo = "sharp_overlay" | "ia_gera";

type Perfil = { slug: string; nome: string; instagram_handle: string };

const PRESETS_CONTEUDO = {
  intestino_cerebro: {
    eyebrow: "Você Sabia?",
    headline: "Seu intestino produz 90% da serotonina do corpo.",
    subtitle: "A saúde mental começa no prato.",
    corpo:
      "O nervo vago conecta intestino e cérebro 24h por dia. Bactérias da microbiota fabricam serotonina, dopamina e GABA. Cuidar do microbioma é cuidar da ansiedade.",
    cta: "Salvar guia completo",
  },
  teste_genetico: {
    eyebrow: "Teste Nutrigenético",
    headline: "Seu DNA tem respostas que nenhuma dieta tem.",
    subtitle: "Análise única que orienta um plano feito pra quem você é por dentro.",
    corpo: "",
    cta: "Saber mais",
  },
  ansiedade_prato: {
    eyebrow: "Saúde Integrativa",
    headline: "A causa raiz da sua ansiedade pode estar no seu prato.",
    subtitle: "Como Detetive da Saúde, correlaciono genética, microbiota e alimentação.",
    corpo: "",
    cta: "Marque quem precisa ver",
  },
};

const PRESETS_MARCA: Record<string, { cor: string; tom: string }> = {
  scannerdasaude: {
    cor: "#0F2D4A",
    tom: "editorial premium, fundo escuro sofisticado, iluminação neon sutil, feeling científico e elegante",
  },
  nutrisecrets: {
    cor: "#8B1E3F",
    tom: "editorial caloroso premium, paleta vinho/bordô com tons quentes, feeling boutique clínico",
  },
};

export function PreviewForm({ perfis }: { perfis: Perfil[] }) {
  const [tipo, setTipo] = useState<Tipo>("feed_imagem");
  const [provider, setProvider] = useState<Provider>("openai");
  const [modoTexto, setModoTexto] = useState<Modo>("sharp_overlay");
  const [perfilSlug, setPerfilSlug] = useState(perfis[0]?.slug ?? "nutrisecrets");

  const marcaBase =
    PRESETS_MARCA[perfilSlug] ?? { cor: "#2F5D50", tom: "editorial premium" };
  const perfilInfo = perfis.find((p) => p.slug === perfilSlug);

  const [corPrimaria, setCorPrimaria] = useState(marcaBase.cor);
  const [nomeMarca, setNomeMarca] = useState(perfilInfo?.nome ?? "Nutri Secrets");
  const [eyebrow, setEyebrow] = useState(PRESETS_CONTEUDO.intestino_cerebro.eyebrow);
  const [headline, setHeadline] = useState(PRESETS_CONTEUDO.intestino_cerebro.headline);
  const [subtitle, setSubtitle] = useState(PRESETS_CONTEUDO.intestino_cerebro.subtitle);
  const [corpo, setCorpo] = useState("");
  const [cta, setCta] = useState(PRESETS_CONTEUDO.intestino_cerebro.cta);

  const [loading, setLoading] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ provider: string; tempo: string; custo: string } | null>(null);

  function aplicarPresetMarca(slug: string) {
    setPerfilSlug(slug);
    const m = PRESETS_MARCA[slug];
    const p = perfis.find((x) => x.slug === slug);
    if (m) setCorPrimaria(m.cor);
    if (p) setNomeMarca(p.nome);
  }

  function aplicarPresetConteudo(nome: keyof typeof PRESETS_CONTEUDO) {
    const p = PRESETS_CONTEUDO[nome];
    setEyebrow(p.eyebrow);
    setHeadline(p.headline);
    setSubtitle(p.subtitle);
    setCorpo(p.corpo);
    setCta(p.cta);
    if (nome === "intestino_cerebro") setTipo("feed_carrossel");
  }

  async function gerar() {
    setLoading(true);
    setErro(null);
    setImagemUrl(null);
    setMeta(null);
    try {
      const m = PRESETS_MARCA[perfilSlug];
      const resp = await fetch("/api/ai-image/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          provider,
          modoTexto,
          brand: {
            nomeMarca,
            corPrimariaHex: corPrimaria,
            tomVisual: m?.tom ?? "editorial premium",
            nicho: "nutrição funcional, nutrigenética, saúde integrativa",
          },
          conteudo: {
            eyebrow: eyebrow || undefined,
            headline,
            subtitle: subtitle || undefined,
            corpo: corpo || undefined,
            cta: cta || undefined,
          },
        }),
      });

      if (!resp.ok) {
        const j = await resp.json().catch(() => ({ erro: "Erro desconhecido" }));
        throw new Error(j.erro || `HTTP ${resp.status}`);
      }

      const blob = await resp.blob();
      setImagemUrl(URL.createObjectURL(blob));
      setMeta({
        provider: resp.headers.get("X-AI-Image-Provider") ?? "-",
        tempo: resp.headers.get("X-AI-Image-Tempo-Ms") ?? "-",
        custo: resp.headers.get("X-AI-Image-Custo-Usd") ?? "-",
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Parâmetros</h2>

        <div className="mb-4">
          <span className="mr-2 text-xs font-medium text-zinc-500">Perfil:</span>
          {perfis.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => aplicarPresetMarca(p.slug)}
              className={`mr-2 rounded-full border px-3 py-1 text-xs ${
                perfilSlug === p.slug
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              @{p.instagram_handle}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className="self-center text-xs text-zinc-500">Presets:</span>
          <button
            type="button"
            onClick={() => aplicarPresetConteudo("intestino_cerebro")}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs hover:border-zinc-400"
          >
            Intestino-cérebro (carrossel)
          </button>
          <button
            type="button"
            onClick={() => aplicarPresetConteudo("teste_genetico")}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs hover:border-zinc-400"
          >
            Teste genético
          </button>
          <button
            type="button"
            onClick={() => aplicarPresetConteudo("ansiedade_prato")}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs hover:border-zinc-400"
          >
            Ansiedade no prato
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600">Tipo</span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Tipo)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="feed_imagem">Feed 1:1</option>
                <option value="feed_carrossel">Carrossel 4:5</option>
                <option value="stories">Stories 9:16</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600">Provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="openai">OpenAI GPT-Image-1 (premium)</option>
                <option value="gemini">Nano Banana (econômico)</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">Modo de texto</span>
            <select
              value={modoTexto}
              onChange={(e) => setModoTexto(e.target.value as Modo)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            >
              <option value="sharp_overlay">Modo B — Sharp overlay (recomendado)</option>
              <option value="ia_gera">Modo A — IA gera texto</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600">Marca</span>
              <input
                value={nomeMarca}
                onChange={(e) => setNomeMarca(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-600">Cor primária</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-zinc-200"
                />
                <input
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm"
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">Eyebrow</span>
            <input
              value={eyebrow}
              onChange={(e) => setEyebrow(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">Headline</span>
            <textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">Subtítulo</span>
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">
              Corpo (slide de carrossel)
            </span>
            <textarea
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-600">CTA</span>
            <input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={gerar}
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-5 py-3 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Gerando…" : "Gerar preview"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Resultado</h2>

        {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

        {!imagemUrl && !erro && !loading && (
          <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 text-sm text-zinc-400">
            Preview aparece aqui
          </div>
        )}

        {loading && (
          <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 text-sm text-zinc-600">
            Gerando imagem… pode levar 10-20s
          </div>
        )}

        {imagemUrl && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagemUrl} alt="preview" className="w-full rounded-lg shadow-md" />
            {meta && (
              <div className="grid grid-cols-3 gap-3 text-center text-xs text-zinc-600">
                <div className="rounded-lg bg-zinc-100 p-2">
                  <div className="font-mono font-semibold text-zinc-900">{meta.provider}</div>
                  <div>provider</div>
                </div>
                <div className="rounded-lg bg-zinc-100 p-2">
                  <div className="font-mono font-semibold text-zinc-900">
                    {(parseInt(meta.tempo, 10) / 1000).toFixed(1)}s
                  </div>
                  <div>tempo</div>
                </div>
                <div className="rounded-lg bg-zinc-100 p-2">
                  <div className="font-mono font-semibold text-zinc-900">${meta.custo}</div>
                  <div>custo</div>
                </div>
              </div>
            )}
            <a
              href={imagemUrl}
              download="preview.png"
              className="inline-block text-sm text-zinc-700 underline"
            >
              ↓ Baixar PNG
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
