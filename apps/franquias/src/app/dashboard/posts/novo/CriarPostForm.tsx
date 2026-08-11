"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CardPicker, Field, TextArea } from "@/components/ui/Field";
import { uploadArquivo } from "@/lib/arquivos/actions";
import { gerarLegendaManual, criarPostManual } from "@/lib/posts/manual";

type TipoPost = "feed_imagem" | "feed_carrossel" | "reels" | "stories";

export function CriarPostForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tipo, setTipo] = useState<TipoPost>("feed_imagem");
  const [briefing, setBriefing] = useState("");

  // Preenche briefing via query string (vindo do TendenciasCard)
  useEffect(() => {
    const tema = searchParams.get("tema");
    const angulo = searchParams.get("angulo");
    if (tema) {
      const extras: string[] = [];
      extras.push(`Tema sugerido: ${tema}`);
      if (angulo) extras.push(`Ângulo: ${angulo.replace(/_/g, " ")}`);
      setBriefing(extras.join(" — "));
    }
  }, [searchParams]);
  const [legenda, setLegenda] = useState("");
  const [cta, setCta] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [urlMidia, setUrlMidia] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleUpload() {
    if (!arquivo) return;
    setUploading(true);
    setErro(null);
    const fd = new FormData();
    fd.append("file", arquivo);
    fd.append("tipo", "outro");
    const r = await uploadArquivo(fd);
    setUploading(false);
    if (r.ok && r.url) {
      setUrlMidia(r.url);
      setMsg("Mídia enviada!");
    } else {
      setErro(r.erro ?? "Erro no upload");
    }
  }

  async function handleGerarIA() {
    if (!briefing.trim()) {
      setErro("Escreva um briefing curto antes de pedir IA");
      return;
    }
    setGerandoIA(true);
    setErro(null);
    const r = await gerarLegendaManual(briefing, tipo);
    setGerandoIA(false);
    if (r.ok) {
      setLegenda(r.legenda ?? "");
      setCta(r.cta ?? "");
      setHashtags(r.hashtags ?? []);
      setMsg("IA gerou a legenda! Revise e ajuste se quiser.");
    } else {
      setErro(r.erro ?? "Erro ao gerar");
    }
  }

  // Sem data e sem "agendar": a publicação automática depende da aprovação
  // do app na Meta, que ainda não saiu. O post fica salvo aqui e a nutri
  // publica no Instagram dela quando quiser.
  async function handleSalvar() {
    if (!legenda) {
      setErro("Escreva a legenda antes de salvar");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const r = await criarPostManual({
        tipo,
        copy_legenda: legenda,
        copy_cta: cta,
        hashtags,
        briefing_nutri: briefing,
        url_imagem: tipo === "reels" ? undefined : urlMidia ?? undefined,
        url_video: tipo === "reels" ? urlMidia ?? undefined : undefined,
        legenda_gerada_ia: gerandoIA,
      });
      if (r.ok) {
        setMsg("Post salvo! Ele fica na sua biblioteca — é só copiar a legenda e publicar no seu Instagram.");
        setTimeout(() => router.push("/dashboard/aprovar"), 1500);
      } else {
        setErro(r.erro ?? "Erro");
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm space-y-5">
      <CardPicker
        label="Tipo de post"
        value={tipo}
        onChange={(v) => setTipo(v as TipoPost)}
        required
        options={[
          { value: "feed_imagem", label: "Feed imagem" },
          { value: "feed_carrossel", label: "Carrossel" },
          { value: "reels", label: "Reels" },
          { value: "stories", label: "Stories" },
        ]}
      />

      <div>
        <label className="mb-2 block text-sm font-medium">
          Mídia ({tipo === "reels" ? "vídeo MP4" : "imagem PNG/JPG"})
        </label>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept={tipo === "reels" ? "video/mp4,video/quicktime" : "image/*"}
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="flex-1 text-sm"
          />
          <button
            type="button"
            onClick={handleUpload}
            disabled={!arquivo || uploading}
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-60"
          >
            {uploading ? "Subindo..." : "Subir"}
          </button>
        </div>
        {urlMidia && (
          <div className="mt-2 text-xs text-green-600">✓ Mídia pronta</div>
        )}
      </div>

      <TextArea
        label="Briefing pra IA (1-2 linhas)"
        name="briefing"
        value={briefing}
        onChange={setBriefing}
        placeholder="Ex: quero falar sobre vitamina D e K2 juntas — explicando a sinergia de forma acessível"
        rows={2}
        hint="Preencha só se for usar a IA. Se for escrever manualmente, pule."
      />
      <button
        type="button"
        onClick={handleGerarIA}
        disabled={!briefing || gerandoIA}
        className="w-full rounded-lg border border-brand-primary bg-brand-primary/5 px-4 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary/10 disabled:opacity-60"
      >
        {gerandoIA ? "Gerando..." : "✨ Gerar legenda com IA"}
      </button>

      <TextArea
        label="Legenda"
        name="copy_legenda"
        value={legenda}
        onChange={setLegenda}
        rows={6}
        required
      />

      <Field
        label="Call to action"
        name="copy_cta"
        value={cta}
        onChange={setCta}
        placeholder="Agende sua avaliação →"
      />

      <TextArea
        label="Hashtags (separe por espaço)"
        name="hashtags"
        value={hashtags.join(" ")}
        onChange={(v) =>
          setHashtags(
            v
              .split(/\s+/)
              .map((s) => s.replace(/^#/, "").trim())
              .filter(Boolean),
          )
        }
        rows={2}
      />

      {msg && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{msg}</div>}
      {erro && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</div>}

      <button
        type="button"
        onClick={handleSalvar}
        disabled={isPending}
        className="w-full rounded-lg bg-brand-primary px-5 py-3 text-base font-semibold text-white hover:bg-brand-primary/90 disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar post"}
      </button>
      <p className="text-center text-xs leading-relaxed text-brand-text/50">
        O post fica salvo na sua biblioteca. A publicação no Instagram é feita
        por você — publicar automático depende de uma liberação da Meta que
        ainda não saiu.
      </p>
    </div>
  );
}
