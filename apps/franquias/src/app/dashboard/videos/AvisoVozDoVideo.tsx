import { estadoVozDoVideo } from "@/lib/narracao/pronta";
import { AvisoFaltaVoz } from "./AvisoFaltaVoz";

/**
 * No lugar do AvisoFaltaVoz fixo: com a narração dela pronta, o cartão mostra
 * o vídeo com a voz para baixar (e um jeito de gravar de novo); sem ela, o
 * aviso de sempre.
 */
export function AvisoVozDoVideo({
  refVideo,
  prontas,
  compacto = false,
}: {
  refVideo: string;
  prontas: Record<string, string> | null | undefined;
  compacto?: boolean;
}) {
  const href = `/dashboard/narrar?origem=marca&ref=${refVideo}`;
  const e = estadoVozDoVideo(refVideo, prontas);
  if (e.tipo === "falta-voz") return <AvisoFaltaVoz href={href} compacto={compacto} />;
  return (
    <div className={`rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 ${compacto ? "p-2 text-xs" : "p-3 text-sm"}`}>
      <p className="font-semibold">✓ Pronto com a sua voz.</p>
      <a
        href={e.url}
        download
        target="_blank"
        rel="noreferrer"
        className={`mt-2 inline-block rounded-md bg-emerald-600 font-semibold text-white hover:opacity-90 ${compacto ? "px-2.5 py-1" : "px-3 py-2"}`}
      >
        ⬇ Baixar vídeo com a sua voz
      </a>
      <a href={href} className="ml-3 inline-block font-semibold underline">
        Gravar de novo
      </a>
    </div>
  );
}
