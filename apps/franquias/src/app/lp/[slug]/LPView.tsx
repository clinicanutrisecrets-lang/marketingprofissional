import type { LPGerada } from "@/lib/claude/generate";

type Props = {
  franqueada: Record<string, unknown>;
  lp: LPGerada | null;
  logoUrl: string | null;
  fotoUrl: string | null;
};

export function LPView({ franqueada, lp, logoUrl, fotoUrl }: Props) {
  const corPrimaria = (franqueada.cor_primaria_hex as string) || "#0BB8A8";
  const corSecundaria = (franqueada.cor_secundaria_hex as string) || "#7C3AED";
  const nome = (franqueada.nome_comercial as string) || (franqueada.nome_completo as string);
  const tagline = (franqueada.tagline as string) || "Nutrição de precisão para resultados reais";
  const linkAgendamento = (franqueada.link_agendamento as string) || "#";

  // Fallback se LP não foi gerada (ex: sem ANTHROPIC_API_KEY)
  const hero = lp?.hero ?? {
    headline: tagline,
    subheadline: (franqueada.descricao_longa as string)?.slice(0, 200) ||
      "Atendimento personalizado com base em ciência e precisão.",
    cta: "Agende sua avaliação",
  };
  const sobre = lp?.sobre ?? {
    titulo: "Sobre mim",
    paragrafos: [
      (franqueada.historia_pessoal as string) ||
        "Nutricionista com foco em diagnóstico de precisão e cuidado individualizado.",
    ],
  };
  const metodo = lp?.metodo ?? {
    titulo: "Meu método",
    pilares: [
      { titulo: "Diagnóstico completo", descricao: "Análise profunda antes de qualquer prescrição." },
      { titulo: "Protocolo personalizado", descricao: "Zero receita de bolo — cada caso é único." },
      { titulo: "Acompanhamento próximo", descricao: "Você não fica sozinho no processo." },
    ],
  };

  return (
    <main
      className="min-h-screen"
      style={
        {
          "--cor-primaria": corPrimaria,
          "--cor-secundaria": corSecundaria,
          background: "#FFFFFF",
        } as React.CSSProperties
      }
    >
      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: corPrimaria }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-16 text-white lg:flex-row lg:py-24">
          <div className="flex-1 text-center lg:text-left">
            {logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt={nome}
                className="mb-6 h-16 w-auto lg:h-20"
              />
            )}
            <h1 className="mb-4 text-3xl font-bold leading-tight lg:text-5xl">
              {hero.headline}
            </h1>
            <p className="mb-8 text-lg opacity-90 lg:text-xl">
              {hero.subheadline}
            </p>
            <a
              href={linkAgendamento}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-full bg-white px-8 py-4 text-base font-semibold shadow-lg transition hover:scale-105"
              style={{ color: corPrimaria }}
            >
              {hero.cta} →
            </a>
          </div>
          {fotoUrl && (
            <div className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoUrl}
                alt={nome}
                className="h-64 w-64 rounded-full object-cover shadow-xl lg:h-80 lg:w-80"
              />
            </div>
          )}
        </div>
      </section>

      {/* SOBRE */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">
          {sobre.titulo}
        </h2>
        <div className="space-y-4 text-lg leading-relaxed text-gray-700">
          {sobre.paragrafos.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {/* MÉTODO */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-12 text-center text-3xl font-bold text-gray-900">
            {metodo.titulo}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {metodo.pilares.map((pilar, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-6 shadow-sm"
                style={{ borderTop: `4px solid ${corPrimaria}` }}
              >
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  {pilar.titulo}
                </h3>
                <p className="text-gray-600">{pilar.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PÚBLICO (se LP IA gerou) */}
      {lp?.publico && (
        <section className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">
            {lp.publico.titulo}
          </h2>
          <ul className="space-y-3">
            {lp.publico.items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-lg text-gray-700">
                <span
                  className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm text-white"
                  style={{ background: corPrimaria }}
                >
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      {lp?.faq && (
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="mb-10 text-center text-3xl font-bold text-gray-900">
              Perguntas frequentes
            </h2>
            <div className="space-y-4">
              {lp.faq.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-xl bg-white p-5 shadow-sm"
                >
                  <summary className="cursor-pointer list-none font-semibold text-gray-900 group-open:mb-3">
                    {item.pergunta}
                  </summary>
                  <p className="text-gray-600">{item.resposta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="py-16" style={{ background: corSecundaria }}>
        <div className="mx-auto max-w-3xl px-6 text-center text-white">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            {lp?.cta_final.titulo ?? "Pronto pra começar?"}
          </h2>
          <p className="mb-8 text-lg opacity-90">
            {lp?.cta_final.subtitulo ??
              "Agende sua avaliação e descubra um jeito diferente de cuidar da sua saúde."}
          </p>
          <a
            href={linkAgendamento}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-full bg-white px-8 py-4 text-base font-semibold shadow-lg transition hover:scale-105"
            style={{ color: corSecundaria }}
          >
            {lp?.cta_final.botao ?? "Agendar agora"} →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
        <div className="mx-auto max-w-6xl px-6">
          <p>
            {nome}
            {franqueada.crn_numero ? ` · CRN ${franqueada.crn_numero}` : ""}
            {franqueada.crn_estado ? `/${franqueada.crn_estado}` : ""}
            {franqueada.cidade ? ` · ${franqueada.cidade}/${franqueada.estado}` : ""}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Powered by Scanner da Saúde
          </p>
        </div>
      </footer>
    </main>
  );
}
