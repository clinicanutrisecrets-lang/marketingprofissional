/**
 * Recado no vídeo animado que vem sem voz (Aline, 16/10/2026): sem ele, quem
 * abre o vídeo e não ouve nada acha que é erro. Diz o que falta, o que fazer
 * e como é a gravação, num clique.
 */
export function AvisoFaltaVoz({ href, compacto = false }: { href: string; compacto?: boolean }) {
  return (
    <div className={`rounded-lg border border-amber-300 bg-amber-50 text-amber-900 ${compacto ? "p-2 text-xs" : "p-3 text-sm"}`}>
      <p className="font-semibold">Este vídeo ainda não está pronto: falta a sua voz.</p>
      <p className="mt-1">
        Ele vem sem som de propósito, pra você narrar. Ao tocar em gravar, o texto aparece estilo karaokê,
        acendendo no ritmo do vídeo: vá falando junto e a sua voz casa com o tempo de cada cena.
      </p>
      <a
        href={href}
        className={`mt-2 inline-block rounded-md bg-red-600 font-semibold text-white hover:opacity-90 ${compacto ? "px-2.5 py-1" : "px-3 py-2"}`}
      >
        🎙️ Gravar a minha narração
      </a>
      <p className="mt-1.5 opacity-80">Se preferir, poste só com música: no próprio Instagram, ao publicar, escolha uma música que esteja em alta entre as sugestões dele.</p>
    </div>
  );
}
