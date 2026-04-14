import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const OBJETIVO_LABEL: Record<string, { emoji: string; label: string }> = {
  ganhar_seguidores: { emoji: "👥", label: "Ganhar seguidores" },
  receber_mensagens: { emoji: "💬", label: "Receber mensagens" },
  agendar_consultas: { emoji: "📅", label: "Agendar consultas" },
  vender_teste_genetico: { emoji: "🧬", label: "Vender teste" },
  alcance: { emoji: "🎥", label: "Alcance" },
  trafego_site: { emoji: "🌐", label: "Tráfego site" },
};

export default async function AdminAnunciosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!admin) redirect("/");

  const adminDb = createAdminClient();
  const { data: anuncios } = await adminDb
    .from("anuncios")
    .select(
      "id, nome, status, objetivo_negocio, tema_criativo, budget_diario, data_inicio, data_fim, copy_headline, copy_texto, copy_cta_botao, meta_campaign_id, franqueadas:franqueada_id(id, nome_completo, nome_comercial, nicho_principal, cidade)",
    )
    .order("criado_em", { ascending: false });

  const lista = (anuncios ?? []) as Array<Record<string, unknown>>;
  const rascunhos = lista.filter((a) => a.status === "rascunho");

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-secondary"
        >
          ← Voltar
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">
            Revisão de anúncios
          </h1>
          <p className="text-sm text-brand-text/60">
            Rascunhos das franqueadas aguardando você replicar no Meta Ads Manager.
          </p>
        </header>

        {rascunhos.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mb-3 text-5xl">✅</div>
            <p className="text-sm text-brand-text/60">
              Nenhum rascunho pendente no momento.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 text-sm text-amber-700">
              {rascunhos.length} rascunho(s) aguardando sua ação
            </div>
            <div className="space-y-4">
              {rascunhos.map((a) => {
                const obj = OBJETIVO_LABEL[a.objetivo_negocio as string];
                const fr = a.franqueadas as {
                  id: string;
                  nome_completo: string;
                  nome_comercial: string | null;
                  nicho_principal: string | null;
                  cidade: string | null;
                } | null;
                return (
                  <article
                    key={a.id as string}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="mb-1 text-xs text-brand-text/60">
                          {fr?.nome_comercial || fr?.nome_completo} ·{" "}
                          {fr?.nicho_principal?.replace(/_/g, " ")}
                          {fr?.cidade ? ` · ${fr.cidade}` : ""}
                        </div>
                        <h3 className="text-lg font-semibold text-brand-text">
                          {obj?.emoji} {(a.nome as string) || "Sem nome"}
                        </h3>
                      </div>
                      <Link
                        href={`/admin/franqueadas/${fr?.id}`}
                        className="rounded-lg border border-brand-text/10 px-3 py-1.5 text-xs hover:border-brand-primary"
                      >
                        Ver ficha da nutri
                      </Link>
                    </header>

                    <div className="mb-3 grid gap-3 sm:grid-cols-4 text-sm">
                      <Info label="Objetivo" value={obj?.label ?? "—"} />
                      <Info label="Budget/dia" value={formatCurrency(a.budget_diario as number)} />
                      <Info
                        label="Início"
                        value={a.data_inicio ? formatDate(a.data_inicio as string) : "—"}
                      />
                      <Info
                        label="Fim"
                        value={a.data_fim ? formatDate(a.data_fim as string) : "sem data"}
                      />
                    </div>

                    {a.tema_criativo && (
                      <div className="mb-3 rounded-lg bg-brand-muted p-3 text-sm">
                        <strong className="text-xs uppercase tracking-wider text-brand-text/60">
                          Tema:{" "}
                        </strong>
                        {a.tema_criativo as string}
                      </div>
                    )}

                    {(a.copy_headline || a.copy_texto) && (
                      <div className="mb-3 rounded-lg border border-brand-text/10 p-3 text-sm">
                        <strong className="text-xs uppercase tracking-wider text-brand-text/60">
                          Criativo:
                        </strong>
                        {a.copy_headline && (
                          <div className="mt-1 font-semibold text-brand-text">
                            {a.copy_headline as string}
                          </div>
                        )}
                        {a.copy_texto && (
                          <div className="mt-1 text-brand-text/80">
                            {a.copy_texto as string}
                          </div>
                        )}
                        {a.copy_cta_botao && (
                          <div className="mt-2 inline-block rounded-full bg-brand-primary px-3 py-1 text-xs font-medium text-white">
                            {a.copy_cta_botao as string}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 border-t border-brand-muted pt-3">
                      <a
                        href="https://business.facebook.com/adsmanager/manage/campaigns"
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-brand-secondary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-secondary/90"
                      >
                        🚀 Abrir Meta Ads Manager
                      </a>
                      <form
                        action={`/api/admin/anuncios/${a.id}/ativar`}
                        method="POST"
                        className="flex items-center gap-2"
                      >
                        <input
                          name="meta_campaign_id"
                          placeholder="Colar campaign_id do Meta"
                          className="rounded-lg border border-brand-text/10 px-2 py-1 text-xs"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                        >
                          ✓ Marcar como ativo
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-brand-text/50">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
