import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { AprovarVariacaoButton } from "./AprovarVariacaoButton";

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

export const dynamic = "force-dynamic";

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

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id, nome_completo, nome_comercial")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) redirect("/onboarding");

  const franqueada = f as { id: string; nome_completo: string; nome_comercial: string | null };

  const { data: a } = await supabase
    .from("anuncios")
    .select("*")
    .eq("id", params.id)
    .eq("franqueada_id", franqueada.id)
    .maybeSingle();

  if (!a || (a as Record<string, unknown>).status !== "aguardando_aprovacao") {
    redirect("/dashboard/anuncios");
  }

  const anuncio = a as Record<string, unknown>;
  const variacoes = (anuncio.variacoes as Variacao[] | null) ?? [];
  const alertas =
    (anuncio.alertas_compliance as string[] | null) ??
    ((anuncio.publico_meta_json as Record<string, unknown> | null)
      ?.alertas_compliance as string[] | null) ??
    [];

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <a
          href="/dashboard/anuncios"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar
        </a>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Aprovar criativo</h1>
          <p className="text-sm text-brand-text/60">
            Escolha a melhor variação de copy para lançar no Meta Ads
          </p>
        </header>

        {/* Informações da campanha */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Campanha
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCell label="Nome" value={(anuncio.nome as string) || "—"} />
            <InfoCell
              label="Objetivo"
              value={(anuncio.objetivo_negocio as string)?.replace(/_/g, " ") || "—"}
            />
            <InfoCell
              label="Budget diário"
              value={
                anuncio.budget_diario ? formatCurrency(anuncio.budget_diario as number) : "—"
              }
            />
            <InfoCell
              label="Público"
              value={(anuncio.publico_descricao as string) || "—"}
            />
          </div>
        </div>

        {/* Alertas de compliance */}
        {alertas.length > 0 && (
          <div className="mb-6 rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <h2 className="font-semibold text-yellow-900">Alertas de compliance CFN</h2>
            </div>
            <ul className="space-y-1">
              {alertas.map((alerta, i) => (
                <li key={i} className="text-sm text-yellow-800">
                  • {alerta}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Variações */}
        <div className="grid gap-5 lg:grid-cols-3">
          {variacoes.map((v, idx) => (
            <div
              key={v.letra}
              className="flex flex-col rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-bold text-brand-primary">
                  Variação {v.letra}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    v.compliance_ok
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {v.compliance_ok ? "✅ Compliance OK" : "❌ Compliance falhou"}
                </span>
              </div>

              {v.imagem_url && (
                <div className="mb-3 overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.imagem_url}
                    alt={`Preview variação ${v.letra}`}
                    className="h-48 w-full object-cover"
                  />
                </div>
              )}

              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-text/60">
                Ângulo
              </div>
              <p className="mb-3 text-sm text-brand-text">{v.angulo}</p>

              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-text/60">
                Headline
              </div>
              <p className="mb-3 text-base font-bold text-brand-text">{v.headline}</p>

              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-text/60">
                Texto principal
              </div>
              <p className="mb-3 text-sm text-brand-text">{v.primary_text}</p>

              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-text/60">
                Descrição
              </div>
              <p className="mb-3 text-sm text-brand-text/80">{v.description}</p>

              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-text/60">
                Justificativa
              </div>
              <p className="mb-4 text-xs text-brand-text/60 italic">{v.justificativa}</p>

              <div className="mt-auto">
                <AprovarVariacaoButton
                  anuncioId={params.id}
                  variacaoIdx={idx}
                  disabled={!v.compliance_ok}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-brand-text/60">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-brand-text">{value}</div>
    </div>
  );
}
