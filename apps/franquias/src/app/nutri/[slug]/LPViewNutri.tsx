import { WhatsAppLink } from "./WhatsAppLink";

type Props = {
  franqueada: Record<string, unknown>;
  logoUrl: string | null;
  fotoUrl: string | null;
  sofiaSlug?: string | null;
  sofiaBaseUrl?: string;
};

const SERIF = `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif`;
const SANS = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

const CREAM = "#F7F3ED";
const SAND = "#EDE4D6";
const INK = "#1F1D1A";
const GRAPHITE = "#4A4843";
const MUTED = "#8A857D";
const WA = "#25D366";

const WhatsappIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M20.5 3.5A11.8 11.8 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.7.9 3.7 1.4 5.7 1.4h.1c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.3z" />
  </svg>
);

export function LPViewNutri({
  franqueada,
  logoUrl,
  fotoUrl,
  sofiaSlug,
  sofiaBaseUrl = "https://scannerdasaude.com/sofia",
}: Props) {
  const franqueadaId = franqueada.id as string;
  const nomeComercial =
    (franqueada.nome_comercial as string) || (franqueada.nome_completo as string);
  const primeiroNome = nomeComercial.split(" ").slice(0, 2).join(" ");
  const inicial = (nomeComercial?.[0] ?? "A").toUpperCase();
  const cidade = (franqueada.cidade as string) ?? "";
  const estado = (franqueada.estado as string) ?? "";
  const cidadeUF = [cidade, estado].filter(Boolean).join(", ");
  const crn = (franqueada.crn as string) ?? "";
  const nicho = (franqueada.nicho_principal as string) ?? "nutrição";
  const historia =
    (franqueada.historia_pessoal as string) ??
    `Nutricionista com atuação focada em ${nicho}. Atendimento personalizado com base em ciência, escuta clínica e o mapa único do seu corpo.`;
  const fraseEscuta =
    (franqueada.frase_pessoal as string) ??
    "Eu escuto primeiro. Antes de qualquer plano, antes de qualquer exame, eu quero entender a sua história. Porque nutrição que funciona é a que cabe na sua vida, não a que cabe no livro.";
  const instaHandle = (franqueada.instagram_handle as string) ?? "";
  const email = (franqueada.email_publico as string) ?? (franqueada.email as string) ?? "";
  const endereco = (franqueada.endereco_consultorio as string) ?? cidadeUF;

  // CTA primário: Sofia URL (se sofia_slug configurado), fallback WhatsApp direto
  const sofiaLink = sofiaSlug
    ? `${sofiaBaseUrl}/${sofiaSlug}?via=lp&ref=frq_${franqueadaId}`
    : null;

  const waNumero = (franqueada.whatsapp_numero as string)?.replace(/\D/g, "") ?? "";
  const waMensagem = encodeURIComponent(
    `Oi! Vim pela página da ${primeiroNome} e quero agendar uma consulta. [ref:frq_${franqueadaId}]`,
  );
  const waFallback = waNumero
    ? `https://wa.me/${waNumero.startsWith("55") ? waNumero : `55${waNumero}`}?text=${waMensagem}`
    : (franqueada.link_agendamento as string) ?? "#";

  // waLink é a URL final do CTA. Sofia quando disponível, WhatsApp como fallback.
  const waLink = sofiaLink ?? waFallback;

  return (
    <main
      style={{ background: CREAM, color: INK, fontFamily: SANS, lineHeight: 1.6 }}
      className="min-h-screen antialiased"
    >
      {/* TOPBAR */}
      <header
        className="sticky top-0 z-50 border-b backdrop-blur"
        style={{ borderColor: `${INK}14`, background: `${CREAM}EB` }}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt={nomeComercial} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold"
                style={{ background: "rgba(47,93,80,0.08)", color: "#2F5D50", fontFamily: SERIF }}
              >
                {inicial}
              </div>
            )}
            <div>
              <div style={{ fontFamily: SERIF }} className="text-[15px] font-semibold leading-tight">
                {primeiroNome}
              </div>
              {cidadeUF && (
                <div className="text-[11px] tracking-wider" style={{ color: MUTED }}>
                  Nutrição de Precisão · {cidadeUF}
                </div>
              )}
            </div>
          </div>
          <WhatsAppLink
            href={waLink}
            franqueadaId={franqueadaId}
            source="topbar"
            className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 sm:inline-flex"
            style={{ background: WA }}
          >
            <WhatsappIcon size={14} /> Agendar consulta
          </WhatsAppLink>
        </div>
      </header>

      {/* HERO */}
      <section className="py-[72px] sm:py-[112px] md:py-[140px]">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 md:grid-cols-[1.15fr_1fr] md:gap-[72px]">
          <div>
            <div className="mb-6 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#2F5D50" }}>
              Nutrição de Precisão
            </div>
            <h1
              style={{ fontFamily: SERIF, letterSpacing: "-0.015em", lineHeight: 1.08, color: INK }}
              className="text-[40px] font-normal sm:text-[52px] lg:text-[64px]"
            >
              Existe um mapa do seu metabolismo. Quando você o enxerga, a{" "}
              <em className="italic font-normal" style={{ color: "#2F5D50" }}>
                melhor versão
              </em>{" "}
              da sua saúde aparece.
            </h1>
            <p className="mt-7 max-w-[540px] text-[18px] leading-[1.55]" style={{ color: GRAPHITE }}>
              Nutrição de precisão. Vamos dar tchau para os anos de tentativa e erro.
              Boas-vindas ao começo de um plano que funciona em você, traçado pelo{" "}
              <span style={{ color: "#2F5D50", fontWeight: 500 }}>
                mapa único do seu corpo
              </span>
              .
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <WhatsAppLink
                href={waLink}
                franqueadaId={franqueadaId}
                source="hero"
                className="inline-flex items-center gap-2.5 rounded-full px-7 py-4 text-[15px] font-medium text-white transition hover:opacity-90"
                style={{ background: WA, boxShadow: "0 8px 24px rgba(37,211,102,0.25)" }}
              >
                <WhatsappIcon size={18} /> Agendar consulta pelo WhatsApp
              </WhatsAppLink>
              <div className="text-sm" style={{ color: MUTED }}>
                Atendimento presencial e online
              </div>
            </div>
          </div>
          <div>
            <div
              className="flex aspect-[4/5] items-center justify-center overflow-hidden"
              style={{
                background: fotoUrl ? undefined : `linear-gradient(135deg, ${SAND} 0%, rgba(47,93,80,0.22) 100%)`,
                boxShadow: "0 40px 80px -20px rgba(31,29,26,0.25)",
              }}
            >
              {fotoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={fotoUrl} alt={nomeComercial} className="h-full w-full object-cover" />
              ) : (
                <div className="p-10 text-center">
                  <div
                    style={{ fontFamily: SERIF, color: "rgba(47,93,80,0.3)", fontStyle: "italic" }}
                    className="mb-4 text-[120px] leading-none"
                  >
                    {inicial}
                  </div>
                  <div
                    className="text-[11px] uppercase tracking-[0.25em]"
                    style={{ color: MUTED }}
                  >
                    Foto profissional
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* DORES */}
      <section
        className="py-20 sm:py-[112px]"
        style={{ background: "rgba(237,228,214,0.45)" }}
      >
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="max-w-[640px]">
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#2F5D50" }}>
              Isso é pra você se…
            </div>
            <h2
              style={{ fontFamily: SERIF, letterSpacing: "-0.015em", lineHeight: 1.08, color: INK }}
              className="text-[30px] font-normal sm:text-[38px]"
            >
              Você chegou até aqui porque sente que algo precisa mudar. Não mais um{" "}
              <span style={{ color: "#2F5D50", fontStyle: "italic" }}>começo zerado</span>.
            </h2>
          </div>
          <div className="mt-16 grid gap-y-10 gap-x-12 sm:grid-cols-2">
            {[
              {
                n: "01",
                t: (
                  <>
                    Você já tentou <strong style={{ color: "#2F5D50" }}>várias dietas</strong> e nenhuma sustentou
                    resultado. Tentativa e erro não é estratégia. É{" "}
                    <span style={{ color: "#2F5D50", fontWeight: 500 }}>desgaste</span>.
                  </>
                ),
              },
              {
                n: "02",
                t: (
                  <>
                    Seu <strong style={{ color: "#2F5D50" }}>histórico familiar</strong> te preocupa (diabetes,
                    colesterol, câncer) e você quer agir antes, não depois.
                  </>
                ),
              },
              {
                n: "03",
                t: (
                  <>
                    Você sente <strong>cansaço, inchaço, gordura abdominal</strong> que
                    não saem nem com treino nem com força de vontade.
                  </>
                ),
              },
              {
                n: "04",
                t: (
                  <>
                    Você quer <strong style={{ color: "#2F5D50" }}>parar de adivinhar</strong> e começar a decidir com
                    precisão. O mapa do seu metabolismo, não mais o palpite.
                  </>
                ),
              },
            ].map((d) => (
              <div key={d.n} className="flex items-start gap-5">
                <div
                  style={{ fontFamily: SERIF, color: "#2F5D50", lineHeight: 1 }}
                  className="shrink-0 text-[32px] font-light"
                >
                  {d.n}
                </div>
                <p className="pt-0.5 leading-[1.55]" style={{ color: GRAPHITE }}>
                  {d.t}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUEM ATENDE */}
      <section className="py-20 sm:py-[112px]">
        <div className="mx-auto grid max-w-[1180px] items-start gap-12 px-6 md:grid-cols-[5fr_7fr] md:gap-[72px]">
          <div
            className="flex aspect-square items-center justify-center overflow-hidden"
            style={{ background: fotoUrl ? undefined : "rgba(237,228,214,0.6)" }}
          >
            {fotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={fotoUrl} alt={nomeComercial} className="h-full w-full object-cover" />
            ) : (
              <div
                style={{ fontFamily: SERIF, color: "rgba(47,93,80,0.28)", fontStyle: "italic" }}
                className="text-[140px]"
              >
                {inicial}
              </div>
            )}
          </div>
          <div>
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#2F5D50" }}>
              Quem atende você
            </div>
            <h2
              style={{ fontFamily: SERIF, letterSpacing: "-0.015em", lineHeight: 1.08, color: INK }}
              className="text-[32px] font-normal sm:text-[38px]"
            >
              {nomeComercial}
            </h2>
            {(crn || cidadeUF) && (
              <div className="mt-2.5 text-[13px]" style={{ color: MUTED }}>
                {[crn, cidadeUF].filter(Boolean).join(" · ")}
              </div>
            )}
            <div className="mt-7 space-y-[18px] leading-[1.65]" style={{ color: GRAPHITE }}>
              <p>{historia}</p>
              <p>&ldquo;{fraseEscuta}&rdquo;</p>
            </div>
          </div>
        </div>
      </section>

      {/* LINHA DO TEMPO 12 MESES */}
      <section className="py-16 sm:py-[112px]" style={{ background: "rgba(237,228,214,0.45)" }}>
        <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
          <div className="mx-auto max-w-[720px] text-center">
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#2F5D50" }}>
              Sua transformação ao longo de 12 meses
            </div>
            <h2
              style={{ fontFamily: SERIF, letterSpacing: "-0.015em", lineHeight: 1.1, color: INK }}
              className="text-[26px] font-normal sm:text-[34px]"
            >
              <span style={{ color: "#2F5D50" }}>Silenciar</span> genes de doença,{" "}
              <span style={{ color: "#2F5D50" }}>ativar</span> genes de saúde. Uma jornada anual de{" "}
              <em style={{ color: "#2F5D50", fontStyle: "italic" }}>longevidade</em>.
            </h2>
          </div>

          <div className="mt-12 grid gap-8 sm:gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                marco: "Mês 1",
                titulo: "Diagnóstico Inicial",
                desc: "Primeira consulta + coleta do teste nutrigenético + plano alimentar personalizado conforme sua história.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
                    <path d="M8 2c0 4 8 6 8 10s-8 6-8 10" />
                    <path d="M16 2c0 4-8 6-8 10s8 6 8 10" />
                    <path d="M8 6h8M8 18h8M9 10h6M9 14h6" />
                  </svg>
                ),
              },
              {
                marco: "Dia 45",
                titulo: "Retorno com o Teste",
                desc: "Leitura completa do seu teste genético. Entendimento real de como seu corpo responde a alimentos e nutrientes.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                ),
              },
              {
                marco: "Mês 3-5",
                titulo: "Silenciamento Genético",
                desc: "3 consultas mensais de tratamento nutrigenético: silenciar predisposições, ativar genes protetivos.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
                    <path d="M4 20c4 0 6-16 16-16" />
                    <path d="M4 20h4M4 20v-4" />
                    <circle cx="20" cy="4" r="1.5" fill="currentColor" />
                  </svg>
                ),
              },
              {
                marco: "Mês 6",
                titulo: "Avaliação Semestral",
                desc: "Check completo da saúde: como seu corpo responde ao novo padrão + manutenção dos resultados alcançados.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-5 w-5">
                    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                ),
              },
              {
                marco: "Mês 12",
                titulo: "Checkup Anual",
                desc: "Correlação sintomas atuais + exames de sangue + genética. Cronograma anual de alimentos e suplementos pra longevidade ativa.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M12 2l2.4 5.8 6.2.6-4.7 4.2 1.4 6.1-5.3-3.2-5.3 3.2 1.4-6.1L3.4 8.4l6.2-.6L12 2z" />
                  </svg>
                ),
              },
            ].map((m, i) => (
              <div key={i} className="relative">
                <div className="text-center">
                  <div
                    className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-white"
                    style={{ background: "#2F5D50" }}
                  >
                    {m.icon}
                  </div>
                  <div
                    className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: "#2F5D50" }}
                  >
                    {m.marco}
                  </div>
                  <h3
                    style={{ fontFamily: SERIF, color: INK }}
                    className="mb-2 text-[18px] sm:text-[17px] lg:text-[18px]"
                  >
                    {m.titulo}
                  </h3>
                  <p className="text-[13px] leading-[1.5] sm:text-[12.5px] lg:text-[13px]" style={{ color: GRAPHITE }}>
                    {m.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-12 text-center text-[14px] italic px-4" style={{ color: MUTED }}>
            Todo mês seu plano evolui com base nos seus dados. Não é receita pronta.{" "}
            <span style={{ color: "#2F5D50", fontStyle: "normal", fontWeight: 500 }}>
              É engenharia de longevidade aplicada a você.
            </span>
          </p>
        </div>
      </section>

      {/* JORNADA */}
      <section
        className="relative overflow-hidden py-24 sm:py-[140px]"
        style={{ background: INK, color: CREAM }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative mx-auto max-w-[1180px] px-6">
          <div className="mx-auto mb-20 max-w-[620px] text-center">
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: WA }}>
              Sua jornada
            </div>
            <h2
              style={{ fontFamily: SERIF, letterSpacing: "-0.015em", lineHeight: 1.08 }}
              className="text-[30px] font-normal sm:text-[38px]"
            >
              Do primeiro olá no WhatsApp até uma versão sua que você ainda não conhece.
            </h2>
          </div>
          <div className="relative grid gap-14 md:grid-cols-3 md:gap-8">
            <div
              className="absolute top-8 left-[16.66%] right-[16.66%] hidden h-px md:block"
              style={{ background: "rgba(247,243,237,0.15)" }}
            />
            {[
              {
                eyebrow: "Passo 01",
                titulo: "Você fala com a gente",
                desc: "Pelo WhatsApp, nossa equipe entende sua história antes de agendar. Sem formulário frio. Sem pressa.",
                destaque: true,
              },
              {
                eyebrow: "Passo 02",
                titulo: "Primeira consulta",
                desc: "60 minutos de avaliação profunda: escuta, exames que você já tem, histórico. Aqui desenhamos sua rota.",
                destaque: false,
              },
              {
                eyebrow: "Passo 03",
                titulo: "Plano que cabe em você",
                desc: "Nutrição ajustada ao mapa do seu metabolismo. Quando faz sentido, o teste nutrigenético refina o mapa com precisão ainda maior. A análise do seu DNA que transforma tentativa em estratégia.",
                destaque: false,
              },
            ].map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="relative mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: step.destaque ? "rgba(37,211,102,0.18)" : "rgba(247,243,237,0.08)",
                    }}
                  />
                  <div
                    className="relative flex h-10 w-10 items-center justify-center rounded-full"
                    style={
                      step.destaque
                        ? { background: WA }
                        : { background: "transparent", border: "1px solid rgba(247,243,237,0.3)" }
                    }
                  >
                    {step.destaque ? (
                      <WhatsappIcon size={18} />
                    ) : i === 1 ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CREAM} strokeWidth="1.5">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M8 3v4M16 3v4M3 11h18" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CREAM} strokeWidth="1.5">
                        <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div
                  style={{ fontFamily: SERIF, color: step.destaque ? WA : "rgba(247,243,237,0.6)" }}
                  className="mb-3 text-[11px] uppercase tracking-[0.22em]"
                >
                  {step.eyebrow}
                </div>
                <h3 style={{ fontFamily: SERIF }} className="mb-3.5 text-[21px]">
                  {step.titulo}
                </h3>
                <p
                  className="mx-auto max-w-[280px] text-[15px] leading-[1.6]"
                  style={{ color: "rgba(247,243,237,0.72)" }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="relative mt-20 text-center">
            <WhatsAppLink
              href={waLink}
              franqueadaId={franqueadaId}
              source="jornada"
              className="inline-flex items-center gap-2.5 rounded-full px-7 py-4 text-[15px] font-medium text-white transition hover:opacity-90"
              style={{ background: WA, boxShadow: "0 8px 24px rgba(37,211,102,0.25)" }}
            >
              <WhatsappIcon size={18} /> Começar a sua jornada
            </WhatsAppLink>
          </div>
        </div>
      </section>

      {/* COMPARAÇÃO: CONSULTA AVULSA vs PLANO ANUAL */}
      <section className="py-20 sm:py-[128px]">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
          <div className="mx-auto mb-12 max-w-[640px] text-center">
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#2F5D50" }}>
              Como você quer começar
            </div>
            <h2
              style={{ fontFamily: SERIF, letterSpacing: "-0.015em", lineHeight: 1.1, color: INK }}
              className="text-[26px] font-normal sm:text-[36px]"
            >
              Duas formas de cuidar da sua saúde com a {primeiroNome}.
            </h2>
            <p className="mt-4 text-[15px] leading-[1.6]" style={{ color: GRAPHITE }}>
              Os valores são personalizados pela sua jornada. Conversamos no WhatsApp pra entender seu momento e sugerir o que faz mais sentido pra você.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Card 1. Consulta Avulsa */}
            <div className="rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: `${INK}14` }}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: MUTED }}>
                Opção 1
              </div>
              <h3 style={{ fontFamily: SERIF, color: INK }} className="mb-3 text-[24px] sm:text-[26px]">
                Consulta Avulsa
              </h3>
              <p className="mb-6 text-[14px] leading-[1.55]" style={{ color: GRAPHITE }}>
                Pra quem quer experimentar a abordagem antes de se comprometer com acompanhamento longo.
              </p>
              <ul className="space-y-3 text-[14px]" style={{ color: GRAPHITE }}>
                {[
                  "1 consulta de avaliação inicial (60 min)",
                  "Plano alimentar personalizado",
                  "1 retorno opcional em 30 dias (à parte)",
                  "Sem teste nutrigenético incluso",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span style={{ color: MUTED }}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 text-[13px] italic" style={{ color: MUTED }}>
                Investimento: pontual, sob consulta no WhatsApp
              </div>
            </div>

            {/* Card 2. Plano Anual (DESTAQUE) */}
            <div
              className="relative rounded-2xl p-6 sm:p-8 mt-4 lg:mt-0"
              style={{
                background: INK,
                color: CREAM,
                boxShadow: "0 30px 60px -20px rgba(31,29,26,0.35)",
              }}
            >
              {/* Badge */}
              <div
                className="absolute -top-3 right-6 sm:right-8 rounded-full px-3 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] text-white"
                style={{ background: "#2F5D50" }}
              >
                ★ Recomendado
              </div>

              <div
                className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "rgba(247,243,237,0.6)" }}
              >
                Opção 2
              </div>
              <h3 style={{ fontFamily: SERIF }} className="mb-3 text-[24px] sm:text-[26px] leading-tight">
                Plano Anual de Longevidade Genética
              </h3>
              <p className="mb-6 text-[14px] leading-[1.55]" style={{ color: "rgba(247,243,237,0.8)" }}>
                Pra quem quer silenciar genes de doença, ativar genes de saúde e construir longevidade real ao longo de 12 meses.
              </p>
              <ul className="space-y-3 text-[14px]" style={{ color: "rgba(247,243,237,0.92)" }}>
                {[
                  { texto: "Consulta inicial completa (60 min)", destaque: false },
                  { texto: "Teste nutrigenético incluso", destaque: true },
                  { texto: "Retorno com resultados do teste (45 dias)", destaque: true },
                  { texto: "3 meses de tratamento de silenciamento genético (1 consulta/mês)", destaque: true },
                  { texto: "Avaliação semestral de saúde + manutenção dos resultados", destaque: false },
                  { texto: "Checkup anual: correlação sintomas + exames + genética", destaque: true },
                  { texto: "Cronograma anual de alimentos e suplementos pra longevidade ativa", destaque: true },
                  { texto: "Acesso prioritário a novos testes (epigenético em breve)", destaque: false },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span style={{ color: "#25D366", marginTop: 2 }}>✓</span>
                    <span style={item.destaque ? { fontWeight: 500, color: CREAM } : {}}>
                      {item.texto}
                    </span>
                  </li>
                ))}
              </ul>
              <div
                className="mt-8 text-[13px] italic"
                style={{ color: "rgba(247,243,237,0.7)" }}
              >
                Investimento: parcelável em até 12x, proporcional à sua jornada
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <WhatsAppLink
              href={waLink}
              franqueadaId={franqueadaId}
              source="jornada"
              className="inline-flex items-center gap-2.5 rounded-full px-6 sm:px-7 py-4 text-[14px] sm:text-[15px] font-medium text-white transition hover:opacity-90"
              style={{ background: WA, boxShadow: "0 8px 24px rgba(37,211,102,0.25)" }}
            >
              <WhatsappIcon size={18} /> Conversar sobre qual faz mais sentido pra mim
            </WhatsAppLink>
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL */}
      <section className="py-24 sm:py-[128px]">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="mx-auto mb-16 max-w-[620px] text-center">
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#2F5D50" }}>
              Histórias que contam
            </div>
            <h2
              style={{ fontFamily: SERIF, letterSpacing: "-0.015em", lineHeight: 1.08, color: INK }}
              className="text-[30px] font-normal sm:text-[38px]"
            >
              Mulheres que entenderam o próprio corpo pela primeira vez.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                t: (
                  <>
                    A primeira consulta já foi diferente de tudo que vivi. Pela primeira
                    vez entendi <strong>por que meu corpo reage</strong> do jeito que reage.
                  </>
                ),
                a: "Marina, 42",
              },
              {
                t: (
                  <>
                    Antes eu testava tudo. Hoje eu <strong style={{ color: "#2F5D50" }}>entendo meu metabolismo</strong>.
                    Só faço o que faz sentido pra ele. Outro patamar.
                  </>
                ),
                a: "Patrícia, 51",
              },
              {
                t: (
                  <>
                    O <strong style={{ color: "#2F5D50" }}>teste nutrigenético</strong> foi um divisor. Virou um antes
                    e depois de autoconhecimento. Não de dieta.
                  </>
                ),
                a: "Juliana, 38",
              },
            ].map((d, i) => (
              <blockquote
                key={i}
                className="border-t pt-6"
                style={{ borderColor: `${INK}14` }}
              >
                <div
                  style={{ fontFamily: SERIF, color: "#2F5D50", lineHeight: 1 }}
                  className="mb-4 text-[42px]"
                >
                  &ldquo;
                </div>
                <p className="mb-5 leading-[1.65]" style={{ color: GRAPHITE }}>
                  {d.t}
                </p>
                <footer className="text-[13px]" style={{ color: MUTED }}>
                  {d.a}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        className="py-24 sm:py-[112px]"
        style={{ background: "rgba(237,228,214,0.45)" }}
      >
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="mb-14 text-center">
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#2F5D50" }}>
              Perguntas frequentes
            </div>
            <h2
              style={{ fontFamily: SERIF, letterSpacing: "-0.015em", lineHeight: 1.08, color: INK }}
              className="text-[30px] font-normal sm:text-[38px]"
            >
              O que costuma passar pela sua cabeça antes de agendar.
            </h2>
          </div>
          <div
            className="mx-auto max-w-[760px] border-t border-b"
            style={{ borderColor: `${INK}14` }}
          >
            {[
              {
                q: "Atende presencial ou online?",
                a: `Os dois. ${cidadeUF ? `O consultório fica em ${cidadeUF};` : "O consultório fica na minha cidade;"} também atendo online para pacientes de todo o Brasil. No primeiro contato no WhatsApp você escolhe o formato.`,
              },
              {
                q: "Como funciona o acompanhamento depois da primeira consulta?",
                a: "Depois da avaliação inicial, você recebe um plano escrito e retornamos em 30 dias pra ajustar. O ritmo depende do seu caso: alguns precisam de revisão quinzenal, outros mensal.",
              },
              {
                q: "O que é o teste nutrigenético?",
                a: "É uma análise única do seu DNA que mostra como seu corpo responde a nutrientes, padrões metabólicos e predisposições. Não é pra todos. Usamos quando, na consulta, vejo que vai agregar. Os detalhes, inclusive valores, conversamos juntas no atendimento.",
              },
              {
                q: "Atende plano de saúde?",
                a: "O atendimento é particular. Muitos planos oferecem reembolso parcial de consulta com nutricionista. Emito recibo com código próprio pra você solicitar.",
              },
            ].map((f, i, arr) => (
              <details
                key={i}
                className="group py-6"
                style={{ borderBottom: i === arr.length - 1 ? "0" : `1px solid ${INK}14` }}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-6 list-none">
                  <span style={{ fontFamily: SERIF, color: INK }} className="text-[19px] pr-8">
                    {f.q}
                  </span>
                  <span
                    className="shrink-0 text-[22px] transition-transform group-open:rotate-45"
                    style={{ color: "#2F5D50" }}
                  >
                    +
                  </span>
                </summary>
                <p className="mt-4 leading-[1.65]" style={{ color: GRAPHITE }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="cta" className="py-24 sm:py-[140px]">
        <div className="mx-auto max-w-[1180px] px-6 text-center">
          <div className="mb-6 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#2F5D50" }}>
            O próximo passo
          </div>
          <h2
            style={{ fontFamily: SERIF, letterSpacing: "-0.015em", lineHeight: 1.08, color: INK }}
            className="mb-7 text-[36px] font-normal sm:text-[48px]"
          >
            Seu metabolismo guarda segredos.
            <br />
            <em style={{ color: "#2F5D50" }} className="italic font-normal">
              A gente desvenda.
            </em>
          </h2>
          <p className="mx-auto mb-11 max-w-[560px] leading-[1.65]" style={{ color: GRAPHITE }}>
            O primeiro passo pra trocar tentativa e erro pelo mapa do seu corpo. Mande uma
            mensagem pra nossa equipe. Sem formulário, sem pressa. A gente te ouve e te
            orienta pro próximo passo.
          </p>
          <WhatsAppLink
            href={waLink}
            franqueadaId={franqueadaId}
            source="cta_final"
            className="inline-flex items-center gap-3 rounded-full px-9 py-5 text-[17px] font-medium text-white transition hover:opacity-90"
            style={{ background: WA, boxShadow: "0 12px 36px rgba(37,211,102,0.32)" }}
          >
            <WhatsappIcon size={22} /> Agendar consulta pelo WhatsApp
          </WhatsAppLink>
          <div className="mt-5 text-[13px]" style={{ color: MUTED }}>
            Resposta em até 2h no horário comercial
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${INK}14`, background: CREAM }}>
        <div className="mx-auto grid max-w-[1180px] gap-8 px-6 py-12 text-sm md:grid-cols-3">
          <div>
            <div style={{ fontFamily: SERIF, color: INK }} className="mb-3 text-[17px]">
              {nomeComercial}
            </div>
            <div className="leading-[1.7]" style={{ color: MUTED }}>
              {crn && (
                <>
                  {crn}
                  <br />
                </>
              )}
              {endereco && (
                <>
                  {endereco}
                  <br />
                </>
              )}
              {email}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: SERIF, color: INK }} className="mb-3 text-[17px]">
              Nos encontre
            </div>
            <div className="space-y-2" style={{ color: MUTED }}>
              {instaHandle && (
                <a
                  href={`https://instagram.com/${instaHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-70"
                >
                  @{instaHandle}
                </a>
              )}
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="block hover:opacity-70">
                WhatsApp
              </a>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: SERIF, color: INK }} className="mb-3 text-[17px]">
              Legal
            </div>
            <div className="space-y-2" style={{ color: MUTED }}>
              <a href="/privacidade" className="block hover:opacity-70">
                Política de privacidade
              </a>
              <a href="/termos" className="block hover:opacity-70">
                Termos de uso
              </a>
            </div>
          </div>
        </div>
        <div
          className="mx-auto flex max-w-[1180px] flex-col justify-between gap-2 px-6 py-5 text-[12px] md:flex-row"
          style={{ borderTop: `1px solid ${INK}14`, color: MUTED }}
        >
          <div>© {new Date().getFullYear()} {nomeComercial}. Todos os direitos reservados.</div>
          <div>Nutrição de Precisão · Scanner da Saúde</div>
        </div>
      </footer>
    </main>
  );
}
