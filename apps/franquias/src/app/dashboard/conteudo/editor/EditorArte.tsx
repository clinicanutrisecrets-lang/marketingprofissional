"use client";

import { useRef, useState } from "react";

const ESQUEMAS = [
  { valor: 0, nome: "Profundo", desc: "fundo na cor da marca" },
  { valor: 1, nome: "Creme", desc: "fundo claro, título na marca" },
  { valor: 2, nome: "Suave", desc: "pastel da marca" },
];

const FORMATOS = [
  { valor: "feed", nome: "Feed 1:1" },
  { valor: "retrato", nome: "Retrato 4:5" },
  { valor: "stories", nome: "Stories 9:16" },
];

export function EditorArte() {
  const [eyebrow, setEyebrow] = useState("nutrição de precisão");
  const [headline, setHeadline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [cta, setCta] = useState("");
  const [esquema, setEsquema] = useState(0);
  const [formato, setFormato] = useState("feed");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoNome, setFotoNome] = useState<string>("");

  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function gerar() {
    if (!headline.trim()) {
      setErro("Escreva pelo menos o título da arte.");
      return;
    }
    setGerando(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.set("headline", headline);
      fd.set("eyebrow", eyebrow);
      fd.set("subtitle", subtitle);
      fd.set("cta", cta);
      fd.set("esquema", String(esquema));
      fd.set("formato", formato);
      if (foto) fd.set("foto", foto);

      const res = await fetch("/api/conteudo/render-card", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { erro?: string } | null;
        throw new Error(j?.erro ?? `erro ${res.status}`);
      }
      const blob = await res.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "falha ao gerar");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulário */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <Campo label="Categoria (pill do topo)">
          <input
            value={eyebrow}
            onChange={(e) => setEyebrow(e.target.value)}
            maxLength={40}
            className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            placeholder="ex.: nutrição de precisão"
          />
        </Campo>

        <Campo label="Título (o texto grande) *">
          <textarea
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={140}
            rows={2}
            className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            placeholder="ex.: Seu intestino interfere mais no seu peso do que você imagina"
          />
        </Campo>

        <Campo label="Texto de apoio (opcional)">
          <textarea
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={220}
            rows={3}
            className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            placeholder="1-2 frases complementando o título"
          />
        </Campo>

        <Campo label="Frase manuscrita (opcional)">
          <input
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            maxLength={60}
            className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            placeholder='ex.: "salva esse post"'
          />
        </Campo>

        <Campo label="Sua foto (opcional — entra no topo do card)">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20"
            >
              📷 {fotoNome ? "Trocar foto" : "Subir foto"}
            </button>
            {fotoNome && (
              <span className="flex items-center gap-2 text-xs text-brand-text/60">
                {fotoNome}
                <button
                  type="button"
                  onClick={() => {
                    setFoto(null);
                    setFotoNome("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-red-500"
                >
                  ✕
                </button>
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFoto(f);
                setFotoNome(f?.name ?? "");
              }}
            />
          </div>
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Estilo de cor">
            <div className="flex flex-col gap-1.5">
              {ESQUEMAS.map((e) => (
                <label key={e.valor} className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="radio"
                    checked={esquema === e.valor}
                    onChange={() => setEsquema(e.valor)}
                  />
                  <span className="font-semibold">{e.nome}</span>
                  <span className="text-brand-text/50">{e.desc}</span>
                </label>
              ))}
            </div>
          </Campo>

          <Campo label="Formato">
            <div className="flex flex-col gap-1.5">
              {FORMATOS.map((f) => (
                <label key={f.valor} className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="radio"
                    checked={formato === f.valor}
                    onChange={() => setFormato(f.valor)}
                  />
                  <span className="font-semibold">{f.nome}</span>
                </label>
              ))}
            </div>
          </Campo>
        </div>

        {erro && <p className="text-xs text-red-600">{erro}</p>}

        <button
          onClick={gerar}
          disabled={gerando}
          className="w-full rounded-xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {gerando ? "Gerando..." : "✨ Gerar preview"}
        </button>
      </div>

      {/* Preview */}
      <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview da arte"
              className="max-h-[560px] w-auto rounded-xl ring-1 ring-black/10"
            />
            <a
              href={previewUrl}
              download={`arte-${Date.now()}.png`}
              className="mt-4 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              ⬇️ Baixar PNG
            </a>
          </>
        ) : (
          <p className="text-sm text-brand-text/40">
            O preview da sua arte aparece aqui.
          </p>
        )}
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-text/60">
        {label}
      </label>
      {children}
    </div>
  );
}
