"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { criarCorteAction, prepararUploadCorteAction } from "@/lib/corte/actions";
import {
  ESTILOS_LEGENDA,
  ESTILO_PADRAO,
  FILTROS,
  FILTRO_PADRAO,
  UPLOAD_MAX_MB,
  UPLOAD_MAX_SEG,
  estimativaMinutos,
  type EstiloLegendaId,
  type FiltroId,
} from "@/lib/corte/opcoes";

/**
 * Manda pra edição um vídeo que a nutri JÁ gravou no celular.
 *
 * Pedido da Aline (21/09/2026): "a parte de editar os vídeos que a pessoa sobe
 * do celular dela". Até aqui o corte só aceitava o que fosse gravado dentro do
 * navegador, pelo teleprompter — vídeo do app de câmera não tinha por onde
 * entrar.
 *
 * O caminho é o MESMO do teleprompter (URL assinada → bucket → worker); o que
 * muda é a origem e o teto de duração. Nada de rota nova: dois caminhos pro
 * mesmo destino divergem calados.
 */
export function EnviarDoCelular() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [duracao, setDuracao] = useState<number | null>(null);
  const [tema, setTema] = useState("");
  const [filtro, setFiltro] = useState<FiltroId>(FILTRO_PADRAO);
  const [estilo, setEstilo] = useState<EstiloLegendaId>(ESTILO_PADRAO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  /** Lê a duração no próprio navegador. Sem ela, o servidor recusaria todo
   *  upload por não saber o tamanho — e a nutri não saberia por quê. */
  function medirDuracao(f: File): Promise<number | null> {
    return new Promise((resolve) => {
      const el = document.createElement("video");
      el.preload = "metadata";
      const limpar = () => URL.revokeObjectURL(el.src);
      el.onloadedmetadata = () => {
        limpar();
        resolve(Number.isFinite(el.duration) ? el.duration : null);
      };
      el.onerror = () => {
        limpar();
        resolve(null);
      };
      el.src = URL.createObjectURL(f);
    });
  }

  async function escolher(f: File | null) {
    setErro(null);
    setPronto(false);
    setArquivo(null);
    setDuracao(null);
    if (!f) return;

    if (!f.type.startsWith("video/")) {
      setErro("Esse arquivo não é um vídeo. Mande o MP4 ou MOV que saiu do celular.");
      return;
    }
    if (f.size > UPLOAD_MAX_MB * 1024 * 1024) {
      setErro(
        `O arquivo tem ${(f.size / 1024 / 1024).toFixed(0)} MB e o limite é ${UPLOAD_MAX_MB} MB. ` +
          "No iPhone dá pra reenviar em qualidade menor pelo próprio compartilhamento.",
      );
      return;
    }
    const d = await medirDuracao(f);
    if (d !== null && d > UPLOAD_MAX_SEG + 2) {
      setErro(
        `O vídeo tem ${Math.round(d)}s e aqui o limite é ${Math.floor(UPLOAD_MAX_SEG / 60)} minutos. ` +
          "Corte o trecho que você quer antes de mandar.",
      );
      return;
    }
    // 🔴 Sem duração legível não dá pra seguir: o servidor precisa dela pra
    // decidir o teto, e chutar um valor mandaria vídeo longo demais pro worker.
    if (d === null) {
      setErro("Não consegui ler a duração desse arquivo. Tente exportar como MP4.");
      return;
    }
    setArquivo(f);
    setDuracao(d);
    if (!tema) setTema(f.name.replace(/\.[^.]+$/, "").slice(0, 60));
  }

  async function enviar() {
    if (!arquivo || duracao === null || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const mime = arquivo.type || "video/mp4";
      const prep = await prepararUploadCorteAction({ mime, tamanhoBytes: arquivo.size });
      if (!prep.ok) throw new Error(prep.msg);
      const { error: upErr } = await createClient()
        .storage.from("videos-biblioteca")
        .uploadToSignedUrl(prep.path, prep.token, arquivo, { contentType: mime });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      const r = await criarCorteAction({
        path: prep.path,
        mime,
        duracaoSeg: Math.round(duracao),
        tema,
        filtro,
        estiloLegenda: estilo,
        origemTipo: "upload",
      });
      if (!r.ok) throw new Error(r.msg);
      setPronto(true);
      setArquivo(null);
      setDuracao(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "falha ao enviar o vídeo");
    } finally {
      setEnviando(false);
    }
  }

  const [minMin, maxMin] = estimativaMinutos(duracao ?? 60, filtro);

  return (
    <div className="mt-5 rounded-xl bg-brand-muted/60 p-4">
      <h3 className="text-sm font-bold text-brand-text">
        📱 Já gravei no celular
      </h3>
      <p className="mt-1 text-sm text-brand-text/60">
        Mande o arquivo e ele passa pela mesma edição: corta as pausas, põe
        legenda e entra com as imagens de apoio. Até{" "}
        {Math.floor(UPLOAD_MAX_SEG / 60)} minutos e {UPLOAD_MAX_MB} MB.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={(e) => void escolher(e.target.files?.[0] ?? null)}
        className="mt-3 block w-full text-sm text-brand-text/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-text file:ring-1 file:ring-brand-text/10"
      />

      {arquivo && duracao !== null && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-brand-text/60">
            {arquivo.name} · {Math.round(duracao)}s ·{" "}
            {(arquivo.size / 1024 / 1024).toFixed(1)} MB
          </p>

          <label className="block">
            <span className="text-xs font-semibold text-brand-text/70">
              Sobre o que é o vídeo
            </span>
            <input
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ex.: por que a fibra muda o intestino"
              className="mt-1 w-full rounded-lg border border-brand-text/10 px-3 py-2 text-sm"
            />
          </label>

          <div>
            <span className="text-xs font-semibold text-brand-text/70">Filtro</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {FILTROS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  title={f.ajuda}
                  aria-pressed={filtro === f.id}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    filtro === f.id
                      ? "bg-brand-primary text-white"
                      : "bg-white text-brand-text ring-1 ring-brand-text/10"
                  }`}
                >
                  {f.rotulo}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-brand-text/70">Legenda</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {ESTILOS_LEGENDA.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEstilo(e.id)}
                  title={e.ajuda}
                  aria-pressed={estilo === e.id}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    estilo === e.id
                      ? "bg-brand-primary text-white"
                      : "bg-white text-brand-text ring-1 ring-brand-text/10"
                  }`}
                >
                  {e.rotulo}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-brand-text/50">
            Fica pronto em uns {minMin} a {maxMin} minutos.
          </p>

          <button
            onClick={() => void enviar()}
            disabled={enviando}
            className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black disabled:opacity-60"
          >
            {enviando ? "⏫ Enviando..." : "🎬 Mandar pra edição"}
          </button>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-red-700">{erro}</p>}
      {pronto && (
        <p className="mt-3 text-sm font-semibold text-emerald-700">
          Enviado! Acompanhe na lista aqui embaixo.
        </p>
      )}
    </div>
  );
}
