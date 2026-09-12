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

const LAYOUTS = [
  { valor: "auto", nome: "Clássico", desc: "Título grande (+ sua foto se subir)", thumb: "/editor-thumbs/classico.png" },
  { valor: "editorial", nome: "Editorial", desc: "Título em dois tons, alinhado à esquerda (+ sua foto ao lado)", thumb: "/editor-thumbs/editorial.png" },
  { valor: "citacao", nome: "Citação", desc: "Frase de impacto com aspas", thumb: "/editor-thumbs/citacao.png" },
  { valor: "lista", nome: "Lista", desc: "Título + itens com marcadores", thumb: "/editor-thumbs/lista.png" },
  { valor: "carrossel", nome: "Carrossel", desc: "Vários slides pra deslizar", thumb: "/editor-thumbs/carrossel.png" },
];

/**
 * Onde a foto entra e que tamanho tem — escolha da nutri (Aline, 12/09/2026:
 * "ela pode mover a posição da foto que ela subiu e não ficar só no topo —
 * às vezes ficou só uma frase em cima e ela quer colocar a fotinho menor
 * embaixo"). Os desenhos em traço saíram por completo no mesmo pedido.
 */
const FOTO_LUGARES = [
  { v: "topo", label: "No topo", desc: "acima do texto" },
  { v: "base", label: "Embaixo", desc: "abaixo do texto" },
  { v: "direita", label: "Ao lado", desc: "coluna à direita" },
] as const;

const FOTO_TAMANHOS = [
  { v: "pequena", label: "Pequena" },
  { v: "media", label: "Média" },
  { v: "grande", label: "Grande" },
] as const;

/** Citação e Lista são pilhas: a foto entra em cima ou embaixo, nunca ao lado. */
const LAYOUTS_SEM_FOTO_AO_LADO = new Set(["citacao", "lista"]);


export function EditorArte(props: {
  headlineInicial?: string;
  eyebrowInicial?: string;
  subtitleInicial?: string;
  /**
   * Cor da marca da nutri (franqueadas.cor_primaria_hex), preenchida no
   * onboarding. Antes o seletor "Cor personalizada" abria num verde fixo do
   * código (#2F5D50) e ignorava a cor que ela já tinha informado — parecia
   * que o cadastro não havia salvado.
   */
  corMarca?: string | null;
}) {
  const [eyebrow, setEyebrow] = useState(props.eyebrowInicial || "nutrição de precisão");
  const [headline, setHeadline] = useState(props.headlineInicial ?? "");
  const [subtitle, setSubtitle] = useState(props.subtitleInicial ?? "");
  const [cta, setCta] = useState("");
  const [esquema, setEsquema] = useState(0);
  const [formato, setFormato] = useState("feed");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoNome, setFotoNome] = useState<string>("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoNome, setLogoNome] = useState<string>("");
  const [usarCorCustom, setUsarCorCustom] = useState(false);
  const [corFundo, setCorFundo] = useState(normalizarHex(props.corMarca) ?? "#2F5D50");
  const [layout, setLayout] = useState("auto");
  const [fotoPos, setFotoPos] = useState("centro");
  const [itens, setItens] = useState("");
  const [fotoLugar, setFotoLugar] = useState("topo");
  const [fotoTamanho, setFotoTamanho] = useState("media");
  // Motivo pelo qual a foto encolheu, não coube ou não entrou — vem do render
  const [avisoFoto, setAvisoFoto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvoMsg, setSalvoMsg] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSlides, setPreviewSlides] = useState<string[]>([]);
  const [slidesTexto, setSlidesTexto] = useState("");
  // Onde a sua foto entra no carrossel — repetir nos 8 slides pesa demais
  const [fotoCarrossel, setFotoCarrossel] = useState("sem");
  const fileRef = useRef<HTMLInputElement>(null);

  function montarForm(): FormData {
    const fd = new FormData();
    fd.set("headline", headline);
    fd.set("eyebrow", eyebrow);
    fd.set("subtitle", subtitle);
    fd.set("cta", cta);
    fd.set("esquema", String(esquema));
    fd.set("formato", formato);
    fd.set("layout", layout);
    fd.set("fotoPos", fotoPos);
    fd.set("itens", itens);
    fd.set("fotoLugar", fotoLugar);
    fd.set("fotoTamanho", fotoTamanho);
    fd.set("slides", slidesTexto);
    fd.set("fotoCarrossel", fotoCarrossel);
    if (usarCorCustom) fd.set("corFundo", corFundo);
    if (foto) fd.set("foto", foto);
    if (logo) fd.set("logo", logo);
    return fd;
  }

  async function gerar() {
    if (!headline.trim()) {
      setErro("Escreva pelo menos o título da arte.");
      return;
    }
    setGerando(true);
    setErro(null);
    setSalvoMsg(null);
    setAvisoFoto(null);
    try {
      const res = await fetch("/api/conteudo/render-card", { method: "POST", body: montarForm() });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { erro?: string } | null;
        throw new Error(j?.erro ?? `erro ${res.status}`);
      }
      if (layout === "carrossel") {
        const j = (await res.json()) as { slides?: string[]; avisoFoto?: string | null };
        setPreviewSlides(j.slides ?? []);
        setPreviewUrl(null);
        setAvisoFoto(j.avisoFoto ?? null);
      } else {
        // O PNG vem no corpo; o motivo de a foto não ter saído como pedido vem
        // no header — a tela nunca fica sem saber.
        const avisoHeader = res.headers.get("x-aviso-foto");
        setAvisoFoto(avisoHeader ? decodeURIComponent(avisoHeader) : null);
        const blob = await res.blob();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
        setPreviewSlides([]);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "falha ao gerar");
    } finally {
      setGerando(false);
    }
  }

  async function salvarNaGaleria() {
    setSalvando(true);
    setSalvoMsg(null);
    try {
      const fd = montarForm();
      fd.set("salvar", "1");
      const res = await fetch("/api/conteudo/render-card", { method: "POST", body: fd });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
      if (!res.ok || !j?.ok) throw new Error(j?.erro ?? `erro ${res.status}`);
      setSalvoMsg("✓ Salva na galeria!");
    } catch (e) {
      setSalvoMsg(e instanceof Error ? e.message : "falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Formulário */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <Campo label="Tipo de arte">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {LAYOUTS.map((l) => (
              <button
                key={l.valor}
                type="button"
                onClick={() => setLayout(l.valor)}
                title={l.desc}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-1.5 ring-2 transition ${
                  layout === l.valor
                    ? "ring-brand-primary"
                    : "ring-transparent hover:ring-brand-primary/30"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.thumb}
                  alt={l.nome}
                  className="w-full rounded-lg ring-1 ring-black/5"
                />
                <span
                  className={`text-[11px] font-semibold ${layout === l.valor ? "text-brand-primary" : "text-brand-text/60"}`}
                >
                  {l.nome}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-brand-text/40">{LAYOUTS.find((l) => l.valor === layout)?.desc}</p>
        </Campo>

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

        {layout === "carrossel" && (
          <Campo label="Slides internos (separe cada slide com uma linha contendo só ---)">
            <textarea
              value={slidesTexto}
              onChange={(e) => setSlidesTexto(e.target.value)}
              rows={8}
              maxLength={2400}
              className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
              placeholder={"Título do slide 2\nTexto do slide 2 em 1-3 parágrafos.\n---\nTítulo do slide 3\nTexto do slide 3."}
            />
            <p className="mt-1 text-[11px] text-brand-text/40">
              O título lá de cima vira a CAPA. A primeira linha de cada bloco é o título
              do slide; o resto é o texto. A frase manuscrita vira o slide final de CTA.
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-text/70">
                Sua foto no carrossel
              </label>
              <div className="flex flex-wrap gap-3 text-sm">
                {[
                  { v: "sem", label: "Sem foto", desc: "só tipografia" },
                  { v: "inicio", label: "Na capa", desc: "abre com você" },
                  { v: "fim", label: "No slide final", desc: "junto do convite" },
                ].map((o) => (
                  <label key={o.v} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="fotoCarrossel"
                      checked={fotoCarrossel === o.v}
                      onChange={() => setFotoCarrossel(o.v)}
                    />
                    <span className="font-semibold">{o.label}</span>
                    <span className="text-brand-text/45">{o.desc}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-brand-text/40">
                Suba a foto no campo &ldquo;Sua foto&rdquo; abaixo. Ela entra só no slide
                escolhido — nos demais o carrossel segue tipográfico.
              </p>
            </div>
          </Campo>
        )}

        {layout === "lista" && (
          <Campo label="Itens da lista (um por linha)">
            <textarea
              value={itens}
              onChange={(e) => setItens(e.target.value)}
              rows={5}
              maxLength={600}
              className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
              placeholder={"Sono de qualidade\nIntestino regulado\nAlimentação anti-inflamatória\nGestão do estresse"}
            />
          </Campo>
        )}

        <Campo label="Frase manuscrita (opcional)">
          <input
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            maxLength={60}
            className="w-full rounded-lg border border-brand-text/15 px-3 py-2 text-sm"
            placeholder='ex.: "salva esse post"'
          />
        </Campo>

        <Campo label="Sua foto (opcional)">
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

        <Campo label="Sua logo (opcional — topo do card)">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              className="rounded-lg bg-brand-primary/10 px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20"
            >
              🏷️ {logoNome ? "Trocar logo" : "Subir logo"}
            </button>
            {logoNome && (
              <span className="flex items-center gap-2 text-xs text-brand-text/60">
                {logoNome}
                <button
                  type="button"
                  onClick={() => {
                    setLogo(null);
                    setLogoNome("");
                    if (logoRef.current) logoRef.current.value = "";
                  }}
                  className="text-red-500"
                >
                  ✕
                </button>
              </span>
            )}
            <input
              ref={logoRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setLogo(f);
                setLogoNome(f?.name ?? "");
              }}
            />
          </div>
          <p className="mt-1 text-[11px] text-brand-text/40">
            Dica: PNG com fundo transparente fica melhor. Sem upload, usamos a
            logo do seu onboarding automaticamente.
          </p>
        </Campo>

        {foto && (
          <div className="space-y-3 rounded-xl bg-brand-primary/5 p-3">
            <Campo label="Onde a foto entra">
              <div className="flex flex-wrap gap-3">
                {FOTO_LUGARES.map((o) => {
                  const indisponivel = o.v === "direita" && LAYOUTS_SEM_FOTO_AO_LADO.has(layout);
                  return (
                    <label
                      key={o.v}
                      className={`flex items-center gap-1.5 text-xs ${indisponivel ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                      title={indisponivel ? "Neste tipo de arte a foto entra no topo ou embaixo" : o.desc}
                    >
                      <input
                        type="radio"
                        name="fotoLugar"
                        disabled={indisponivel}
                        checked={fotoLugar === o.v}
                        onChange={() => setFotoLugar(o.v)}
                      />
                      <span className="font-semibold">{o.label}</span>
                      <span className="text-brand-text/45">{o.desc}</span>
                    </label>
                  );
                })}
              </div>
              {layout === "carrossel" && (
                <p className="mt-1 text-[11px] text-brand-text/40">
                  Vale pro slide escolhido em &ldquo;Sua foto no carrossel&rdquo;.
                </p>
              )}
            </Campo>

            <Campo label="Tamanho da foto">
              <div className="flex flex-wrap gap-3">
                {FOTO_TAMANHOS.map((o) => (
                  <label key={o.v} className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="radio"
                      name="fotoTamanho"
                      checked={fotoTamanho === o.v}
                      onChange={() => setFotoTamanho(o.v)}
                    />
                    <span className="font-semibold">{o.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-brand-text/40">
                A foto nunca cobre o texto: se não couber, ela encolhe — e se nem
                assim couber, a arte sai sem ela e a gente avisa aqui.
              </p>
            </Campo>

            <Campo label="Enquadramento da foto">
              <div className="flex gap-3">
                {(["topo", "centro", "base"] as const).map((p) => (
                  <label key={p} className="flex cursor-pointer items-center gap-1.5 text-xs capitalize">
                    <input type="radio" name="fotoPos" checked={fotoPos === p} onChange={() => setFotoPos(p)} />
                    {p}
                  </label>
                ))}
              </div>
            </Campo>

            {avisoFoto && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                📷 {avisoFoto}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Estilo de cor">
            <div className="flex flex-col gap-1.5">
              {ESQUEMAS.map((e) => (
                <label key={e.valor} className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="radio"
                    checked={esquema === e.valor && !usarCorCustom}
                    onChange={() => {
                      setEsquema(e.valor);
                      setUsarCorCustom(false);
                    }}
                  />
                  <span className="font-semibold">{e.nome}</span>
                  <span className="text-brand-text/50">{e.desc}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="radio"
                  checked={usarCorCustom}
                  onChange={() => setUsarCorCustom(true)}
                />
                <span className="font-semibold">Cor personalizada</span>
                <input
                  type="color"
                  value={corFundo}
                  onChange={(e) => {
                    setCorFundo(e.target.value);
                    setUsarCorCustom(true);
                  }}
                  className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </label>
              {usarCorCustom && (
                <p className="text-[11px] text-brand-text/40">
                  As cores do texto se ajustam sozinhas pra manter a leitura.
                </p>
              )}
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
        {previewSlides.length > 0 ? (
          <>
            <div className="grid max-h-[560px] grid-cols-2 gap-3 overflow-y-auto">
              {previewSlides.map((s2, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={s2} alt={`Slide ${i + 1}`} className="w-full rounded-lg ring-1 ring-black/10" />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {previewSlides.map((s2, i) => (
                <a
                  key={i}
                  href={s2}
                  download={`slide-${i + 1}.png`}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                >
                  ⬇️ Slide {i + 1}
                </a>
              ))}
              <button
                onClick={salvarNaGaleria}
                disabled={salvando}
                className="rounded-lg bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "💾 Salvar tudo na galeria"}
              </button>
            </div>
            {avisoFoto && <p className="mt-2 text-xs text-amber-700">📷 {avisoFoto}</p>}
            {salvoMsg && <p className="mt-2 text-xs text-brand-text/60">{salvoMsg}</p>}
          </>
        ) : previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview da arte"
              className="max-h-[560px] w-auto rounded-xl ring-1 ring-black/10"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={previewUrl}
                download={`arte-${Date.now()}.png`}
                className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white hover:opacity-90"
              >
                ⬇️ Baixar PNG
              </a>
              <button
                onClick={salvarNaGaleria}
                disabled={salvando}
                className="rounded-xl bg-brand-primary/10 px-5 py-2.5 text-sm font-semibold text-brand-primary hover:bg-brand-primary/20 disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "💾 Salvar na galeria"}
              </button>
            </div>
            {avisoFoto && <p className="mt-2 text-xs text-amber-700">📷 {avisoFoto}</p>}
            {salvoMsg && <p className="mt-2 text-xs text-brand-text/60">{salvoMsg}</p>}
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

/** Aceita "#RRGGBB" ou "RRGGBB"; devolve null se não for hex válido. */
function normalizarHex(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const m = valor.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toLowerCase()}` : null;
}
