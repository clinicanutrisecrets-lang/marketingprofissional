"use client";

import { useState } from "react";

type Tipo = "feed_imagem" | "feed_carrossel" | "stories";
type Provider = "openai" | "gemini";
type Modo = "sharp_overlay" | "ia_gera";

const PRESETS = {
  consulta: {
    eyebrow: "Nutrição de Precisão",
    headline: "Existe um mapa do seu metabolismo.",
    subtitle: "Quando você o enxerga, a melhor versão da sua saúde aparece.",
    cta: "Falar com a gente",
  },
  teste: {
    eyebrow: "Teste Nutrigenético",
    headline: "Seu DNA tem respostas que nenhuma dieta tem.",
    subtitle: "Análise única. Plano feito pra quem você é por dentro.",
    cta: "Saber mais",
  },
  carrossel: {
    eyebrow: "Você Sabia?",
    headline: "Seu intestino produz 90% da serotonina do corpo.",
    corpo:
      "A comunicação intestino-cérebro via nervo vago acontece 24h. Bactérias patogênicas liberam LPS. Cuidar do microbioma é cuidar da ansiedade.",
  },
};

export function PreviewForm() {
  const [tipo, setTipo] = useState<Tipo>("feed_imagem");
  const [provider, setProvider] = useState<Provider>("openai");
  const [modoTexto, setModoTexto] = useState<Modo>("sharp_overlay");
  const [corPrimaria, setCorPrimaria] = useState("#2F5D50");
  const [nomeMarca, setNomeMarca] = useState("Dra. Ana Lima");
  const [eyebrow, setEyebrow] = useState(PRESETS.consulta.eyebrow);
  const [headline, setHeadline] = useState(PRESETS.consulta.headline);
  const [subtitle, setSubtitle] = useState(PRESETS.consulta.subtitle);
  const [corpo, setCorpo] = useState("");
  const [cta, setCta] = useState(PRESETS.consulta.cta);

  const [loading, setLoading] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ provider: string; tempo: string; custo: string } | null>(null);

  function aplicarPreset(nome: keyof typeof PRESETS) {
    const p = PRESETS[nome];
    setEyebrow(p.eyebrow ?? "");
    setHeadline(p.headline);
    setSubtitle("subtitle" in p ? (p.subtitle as string) : "");
    setCorpo("corpo" in p ? (p.corpo as string) : "");
    setCta("cta" in p ? (p.cta as string) : "");
    if (nome === "carrossel") setTipo("feed_carrossel");
  }

  async function gerar() {
    setLoading(true);
    setErro(null);
    setImagemUrl(null);
    setMeta(null);
    try {
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
            tomVisual: "editorial premium health clinic, sophisticated, calm",
            nicho: "nutrição funcional e nutrigenética",
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
      {/* FORM */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-brand-text">Parâmetros</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className="text-xs text-brand-text/60 self-center">Presets:</span>
          <button
            type="button"
            onClick={() => aplicarPreset("consulta")}
            className="rounded-full border border-brand-text/10 px-3 py-1 text-xs hover:border-brand-primary"
          >
            Consulta
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset("teste")}
            className="rounded-full border border-brand-text/10 px-3 py-1 text-xs hover:border-brand-primary"
          >
            Teste genético
          </button>
          <button
            type="button"
            onClick={() => aplicarPreset("carrossel")}
            className="rounded-full border border-brand-text/10 px-3 py-1 text-xs hover:border-brand-primary"
          >
            Slide carrossel
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-brand-text/70 mb-1">Tipo</span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Tipo)}
                className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
              >
                <option value="feed_imagem">Feed 1:1</option>
                <option value="feed_carrossel">Carrossel 4:5</option>
                <option value="stories">Stories 9:16</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-brand-text/70 mb-1">Provider</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
              >
                <option value="openai">OpenAI GPT-Image-1 (premium)</option>
                <option value="gemini">Google Nano Banana (econômico)</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-brand-text/70 mb-1">Modo de texto</span>
            <select
              value={modoTexto}
              onChange={(e) => setModoTexto(e.target.value as Modo)}
              className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            >
              <option value="sharp_overlay">Modo B — Sharp insere texto (recomendado)</option>
              <option value="ia_gera">Modo A — IA gera texto na imagem (risco em PT-BR)</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-brand-text/70 mb-1">Marca</span>
              <input
                value={nomeMarca}
                onChange={(e) => setNomeMarca(e.target.value)}
                className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-brand-text/70 mb-1">Cor primária</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-brand-text/15"
                />
                <input
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="flex-1 rounded-lg border border-brand-text/15 px-3 py-2 text-sm font-mono"
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-medium text-brand-text/70 mb-1">Eyebrow (tag opcional)</span>
            <input
              value={eyebrow}
              onChange={(e) => setEyebrow(e.target.value)}
              className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-brand-text/70 mb-1">Headline</span>
            <textarea
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-brand-text/70 mb-1">Subtítulo</span>
            <textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-brand-text/70 mb-1">Corpo (usado em slide de carrossel)</span>
            <textarea
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-brand-text/70 mb-1">CTA</span>
            <input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={gerar}
            disabled={loading}
            className="w-full rounded-lg bg-brand-primary px-5 py-3 text-base font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
          >
            {loading ? "Gerando…" : "Gerar preview"}
          </button>
        </div>
      </div>

      {/* PREVIEW */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-brand-text">Resultado</h2>

        {erro && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        {!imagemUrl && !erro && !loading && (
          <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-brand-text/10 text-sm text-brand-text/40">
            Preview aparece aqui
          </div>
        )}

        {loading && (
          <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-brand-primary/30 text-sm text-brand-primary">
            Gerando imagem… pode levar 10-20s
          </div>
        )}

        {imagemUrl && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagemUrl}
              alt="preview"
              className="w-full rounded-lg shadow-md"
            />
            {meta && (
              <div className="grid grid-cols-3 gap-3 text-center text-xs text-brand-text/70">
                <div className="rounded-lg bg-brand-muted p-2">
                  <div className="font-mono font-semibold text-brand-text">{meta.provider}</div>
                  <div>provider</div>
                </div>
                <div className="rounded-lg bg-brand-muted p-2">
                  <div className="font-mono font-semibold text-brand-text">
                    {(parseInt(meta.tempo, 10) / 1000).toFixed(1)}s
                  </div>
                  <div>tempo</div>
                </div>
                <div className="rounded-lg bg-brand-muted p-2">
                  <div className="font-mono font-semibold text-brand-text">
                    ${meta.custo}
                  </div>
                  <div>custo</div>
                </div>
              </div>
            )}
            <a
              href={imagemUrl}
              download="preview.png"
              className="inline-block text-sm text-brand-primary hover:underline"
            >
              ↓ Baixar PNG
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
