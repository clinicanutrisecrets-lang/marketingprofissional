import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada) redirect("/onboarding");
  if (!franqueada.onboarding_completo) redirect("/onboarding");

  const f = franqueada as Record<string, unknown>;

  // Fallback inteligente pro nome
  const nome =
    (f.nome_comercial as string) ||
    (f.nome_completo as string)?.split(" ")[0] ||
    "Dra.";

  const corPrimaria = (f.cor_primaria_hex as string) || "#0BB8A8";
  const instagramConectado = !!f.instagram_conta_id;
  const tokenExpira = f.instagram_token_expiry
    ? Math.round(
        (new Date(f.instagram_token_expiry as string).getTime() - Date.now()) /
          (24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        {/* Header com a marca da nutri */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{ background: corPrimaria }}
            >
              {nome.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-text lg:text-3xl">
                Olá, {nome}
              </h1>
              <p className="text-sm text-brand-text/60">
                {f.nicho_principal
                  ? `Nutrição ${(f.nicho_principal as string).replace("_", " ")}`
                  : "Seu painel Scanner da Saúde"}
                {f.instagram_handle ? ` · @${f.instagram_handle as string}` : ""}
              </p>
            </div>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-brand-text/10 bg-white px-3 py-1.5 text-sm hover:border-brand-primary"
            >
              Sair
            </button>
          </form>
        </header>

        {/* Status e ações */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <StatusCard
            titulo="Instagram"
            status={instagramConectado ? "ok" : "alerta"}
            texto={
              instagramConectado
                ? `Conectado${tokenExpira != null ? ` · expira em ${tokenExpira} dias` : ""}`
                : "Não conectado"
            }
            acao={instagramConectado ? null : { label: "Conectar", href: "/onboarding?step=6" }}
          />
          <StatusCard
            titulo="Plano"
            status="info"
            texto={formatarPlano((f.plano as string) ?? "franquia_basico")}
          />
          <StatusCard
            titulo="Status do serviço"
            status={f.status === "ativo" ? "ok" : "info"}
            texto={
              f.status === "ativo"
                ? "Ativo · posts sendo gerados"
                : `Status: ${(f.status as string) ?? "—"}`
            }
          />
        </div>

        {/* Métricas principais */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Essa semana
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard titulo="Posts publicados" valor="—" hint="aguardando primeira semana" />
            <MetricCard titulo="Alcance total" valor="—" />
            <MetricCard titulo="Engajamento" valor="—" />
            <MetricCard titulo="Leads (ads)" valor="—" />
          </div>
        </section>

        {/* Ações rápidas */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Ações rápidas
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <ActionCard
              icone="✅"
              titulo="Aprovar semana"
              descricao="Revise os 7-10 posts da semana"
              href="/dashboard/aprovar"
              disponivel={true}
            />
            <ActionCard
              icone="✨"
              titulo="Criar post manual"
              descricao="Sobe seu vídeo + IA faz a legenda"
              href="/dashboard/posts/novo"
              disponivel={true}
            />
            <ActionCard
              icone="📊"
              titulo="Relatório semanal"
              descricao="Performance + recomendações"
              href="/dashboard/relatorios"
              disponivel={true}
            />
            <ActionCard
              icone="🎯"
              titulo="Anúncios"
              descricao="Gerencie suas campanhas"
              href="/dashboard/anuncios"
              disponivel={true}
            />
          </div>
        </section>

        {/* LP personalizada */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Sua Landing Page
          </h2>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-brand-text">
                  marketingprofissional.vercel.app/
                  {(f.instagram_handle as string) ||
                    (f.nome_comercial as string)?.toLowerCase().replace(/\s+/g, "-") ||
                    "sua-url"}
                </div>
                <p className="mt-1 text-sm text-brand-text/60">
                  Sua LP personalizada com suas cores, foto, história e link de agendamento.
                </p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                em produção
              </span>
            </div>
          </div>
        </section>

        {/* Configurações */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Configurações
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/onboarding?step=1"
              className="group rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="text-sm font-medium text-brand-text">Editar meus dados</div>
              <div className="mt-1 text-xs text-brand-text/60">
                Atualizar informações da ficha
              </div>
            </Link>
            <Link
              href="/dashboard/biblioteca-videos"
              className="group rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="text-sm font-medium text-brand-text">🎬 Biblioteca de vídeos</div>
              <div className="mt-1 text-xs text-brand-text/60">
                Vídeos seus + Pexels pra reels
              </div>
            </Link>
            <Link
              href="/onboarding?step=6"
              className="group rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="text-sm font-medium text-brand-text">Integrações</div>
              <div className="mt-1 text-xs text-brand-text/60">
                Instagram, Meta Ads, reconectar
              </div>
            </Link>
            <Link
              href="/onboarding?step=9"
              className="group rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="text-sm font-medium text-brand-text">Automação e CTA</div>
              <div className="mt-1 text-xs text-brand-text/60">
                Aprovação, horários, anúncios
              </div>
            </Link>
          </div>
        </section>

        <footer className="mt-12 text-center text-xs text-brand-text/40">
          Scanner da Saúde · Plataforma Franquia Digital
        </footer>
      </div>
    </main>
  );
}

function StatusCard({
  titulo,
  status,
  texto,
  acao,
}: {
  titulo: string;
  status: "ok" | "alerta" | "info";
  texto: string;
  acao?: { label: string; href: string } | null;
}) {
  const cor =
    status === "ok"
      ? "bg-green-100 text-green-700"
      : status === "alerta"
        ? "bg-amber-100 text-amber-700"
        : "bg-blue-100 text-blue-700";
  const icon = status === "ok" ? "●" : status === "alerta" ? "●" : "●";
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-brand-text/60">
          {titulo}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cor}`}>
          {icon} {status === "ok" ? "OK" : status === "alerta" ? "Atenção" : "Info"}
        </span>
      </div>
      <div className="text-sm font-medium text-brand-text">{texto}</div>
      {acao && (
        <Link
          href={acao.href}
          className="mt-2 inline-block text-xs font-medium text-brand-primary hover:underline"
        >
          {acao.label} →
        </Link>
      )}
    </div>
  );
}

function MetricCard({
  titulo,
  valor,
  hint,
}: {
  titulo: string;
  valor: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-brand-text/60">
        {titulo}
      </div>
      <div className="mt-2 text-3xl font-bold text-brand-text">{valor}</div>
      {hint && <div className="mt-1 text-xs text-brand-text/40">{hint}</div>}
    </div>
  );
}

function ActionCard({
  icone,
  titulo,
  descricao,
  href,
  disponivel,
  badge,
}: {
  icone: string;
  titulo: string;
  descricao: string;
  href: string;
  disponivel: boolean;
  badge?: string;
}) {
  const inner = (
    <div className="h-full rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="mb-2 flex items-start justify-between">
        <span className="text-2xl">{icone}</span>
        {badge && (
          <span className="rounded-full bg-brand-text/5 px-2 py-0.5 text-xs font-medium text-brand-text/60">
            {badge}
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-brand-text">{titulo}</div>
      <div className="mt-1 text-xs text-brand-text/60">{descricao}</div>
    </div>
  );
  return disponivel ? (
    <Link href={href}>{inner}</Link>
  ) : (
    <div className="cursor-not-allowed opacity-70">{inner}</div>
  );
}

function formatarPlano(plano: string): string {
  const map: Record<string, string> = {
    franquia_basico: "Franquia Básico",
    franquia_avancado: "Franquia Avançado",
    franquia_premium: "Franquia Premium",
  };
  return map[plano] ?? plano;
}
