import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AprovarVariacaoButton } from "./AprovarVariacaoButton";

export const dynamic = "force-dynamic";

type Variacao = {
  letra: string;
  angulo: string;
  headline: string;
  primary_text: string;
  description: string;
  justificativa: string;
  compliance_ok: boolean;
  imagem_url?: string;
};

export default async function AprovarAnuncioPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: anuncioData } = await admin
    .from("anuncios")
    .select("*, franqueadas(id, auth_user_id, nome_comercial, cidade)")
    .eq("id", params.id)
    .maybeSingle();

  if (!anuncioData) redirect("/dashboard/anuncios");

  const anuncio = anuncioData as {
    id: string;
    nome: string;
    objetivo_negocio: string | null;
    budget_diario: number | null;
    status: string;
    variacoes: unknown;
    alertas_compliance: string[] | null;
    franqueadas: {
      id: string;
      auth_user_id: string;
      nome_comercial: string | null;
      cidade: string | null;
    };
  };

  if (anuncio.franqueadas.auth_user_id !== user.id) {
    redirect("/dashboard/anuncios");
  }

  if (anuncio.status !== "aguardando_aprovacao") {
    redirect("/dashboard/anuncios");
  }

  let variacoes: Variacao[] = [];
  try {
    const raw = anuncio.variacoes;
    if (Array.isArray(raw)) {
      variacoes = raw as Variacao[];
    } else if (typeof raw === "string") {
      variacoes = JSON.parse(raw);
    }
  } catch {
    variacoes = [];
  }

  const OBJETIVO_LABEL: Record<string, string> = {
    ganhar_seguidores: "Ganhar seguidores",
    receber_mensagens: "Receber mensagens",
    agendar_consultas: "Agendar consultas",
    vender_teste_genetico: "Vender teste genético",
    alcance: "Alcance",
    trafego_site: "Tráfego pro site",
  };

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/dashboard/anuncios"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar para Anúncios
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-brand-text">
            Aprovar criativo: {anuncio.nome || "Campanha"}
          </h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-brand-text/60">
            <span>
              Objetivo:{" "}
              <strong className="text-brand-text">
                {OBJETIVO_LABEL[anuncio.objetivo_negocio ?? ""] ??
                  anuncio.objetivo_negocio}
              </strong>
            </span>
            {anuncio.budget_diario != null && (
              <span>
                Budget/dia:{" "}
                <strong className="text-brand-text">
                  R$ {anuncio.budget_diario.toFixed(2)}
                </strong>
              </span>
            )}
            {anuncio.franqueadas.cidade && (
              <span>
                Cidade:{" "}
                <strong className="text-brand-text">
                  {anuncio.franqueadas.cidade}
                </strong>
              </span>
            )}
          </div>
        </header>

        {anuncio.alertas_compliance && anuncio.alertas_compliance.length > 0 && (
          <div className="mb-6 rounded-2xl border border-yellow-400 bg-yellow-50 p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold text-yellow-900">
              <span>⚠️</span>
              <span>Alertas de compliance detectados</span>
            </div>
            <ul className="space-y-1 text-sm text-yellow-800">
              {anuncio.alertas_compliance.map((alerta, i) => (
                <li key={i}>• {alerta}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mb-6 text-sm text-brand-text/60">
          A IA gerou {variacoes.length} variações de copy com ângulos psicológicos diferentes.
          Escolha a que mais combina com o momento da campanha.
        </p>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {variacoes.map((v, idx) => (
            <div
              key={v.letra}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-sm"
            >
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
                  Variação {v.letra}
                </span>
                {v.compliance_ok ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    ✓ Compliance OK
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    ⚠ Revisar
                  </span>
                )}
              </div>

              {/* Angulo */}
              <p className="mb-2 text-xs text-brand-text/50">{v.angulo}</p>

              {/* Headline */}
              <h3 className="mb-2 text-lg font-bold text-brand-text">{v.headline}</h3>

              {/* Primary text */}
              <p className="mb-2 text-sm text-brand-text/80">{v.primary_text}</p>

              {/* Description */}
              <p className="mb-3 text-xs text-brand-text/50">{v.description}</p>

              {/* Justificativa */}
              <details className="mb-4">
                <summary className="cursor-pointer text-xs font-medium text-brand-primary hover:underline">
                  Por que essa variação?
                </summary>
                <p className="mt-1 text-xs italic text-brand-text/60">{v.justificativa}</p>
              </details>

              {/* Imagem preview */}
              {v.imagem_url && (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.imagem_url}
                    alt={`Preview variação ${v.letra}`}
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: 200 }}
                  />
                </div>
              )}

              {/* Spacer to push button to bottom */}
              <div className="flex-1" />

              {/* Approve button */}
              <AprovarVariacaoButton
                anuncioId={anuncio.id}
                variacaoIdx={idx}
                disabled={!v.compliance_ok}
              />
              {!v.compliance_ok && (
                <p className="mt-1 text-center text-xs text-red-500">
                  Variação bloqueada por compliance
                </p>
              )}
            </div>
          ))}
        </div>

        {variacoes.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mb-3 text-4xl">🤔</div>
            <p className="text-brand-text/60">Nenhuma variação encontrada neste anúncio.</p>
          </div>
        )}
      </div>
    </main>
  );
}
