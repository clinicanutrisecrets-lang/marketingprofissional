import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  franquia_basico: "Basic Franchise",
  franquia_avancado: "Advanced Franchise",
  franquia_premium: "Premium Franchise",
};

export default async function DashboardPageEN() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/en/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada) redirect("/onboarding");
  if (!franqueada.onboarding_completo) redirect("/onboarding");

  const f = franqueada as Record<string, unknown>;

  const name =
    (f.nome_comercial as string) ||
    (f.nome_completo as string)?.split(" ")[0] ||
    "Dr.";

  const primaryColor = (f.cor_primaria_hex as string) || "#0BB8A8";
  const instagramConnected = !!f.instagram_conta_id;
  const tokenDaysLeft = f.instagram_token_expiry
    ? Math.round(
        (new Date(f.instagram_token_expiry as string).getTime() - Date.now()) /
          (24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{ background: primaryColor }}
            >
              {name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-brand-text lg:text-3xl">
                Hello, {name}
              </h1>
              <p className="text-sm text-brand-text/60">
                {f.nicho_principal
                  ? `Nutrition · ${(f.nicho_principal as string).replace("_", " ")}`
                  : "Your Scanner da Saúde panel"}
                {f.instagram_handle ? ` · @${f.instagram_handle as string}` : ""}
              </p>
            </div>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="rounded-lg border border-brand-text/10 bg-white px-3 py-1.5 text-sm hover:border-brand-primary"
            >
              Sign out
            </button>
          </form>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <StatusCard
            title="Instagram"
            status={instagramConnected ? "ok" : "warning"}
            text={
              instagramConnected
                ? `Connected${tokenDaysLeft != null ? ` · expires in ${tokenDaysLeft} days` : ""}`
                : "Not connected"
            }
            action={
              instagramConnected
                ? null
                : {
                    label: "Connect",
                    href: "/api/auth/meta/start?return_to=/en/dashboard/perfil-instagram",
                  }
            }
          />
          <StatusCard
            title="Plan"
            status="info"
            text={PLAN_LABELS[(f.plano as string) ?? "franquia_basico"] ?? (f.plano as string)}
          />
          <StatusCard
            title="Service status"
            status={f.status === "ativo" ? "ok" : "info"}
            text={
              f.status === "ativo"
                ? "Active · posts being generated"
                : `Status: ${(f.status as string) ?? "—"}`
            }
          />
        </div>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            This week
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard title="Posts published" value="—" hint="awaiting first week" />
            <MetricCard title="Total reach" value="—" />
            <MetricCard title="Engagement" value="—" />
            <MetricCard title="Leads (ads)" value="—" />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Quick actions
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <ActionCard
              icon="✅"
              title="Approve week"
              description="Review the 7-10 posts of the week"
              href="/en/dashboard/aprovar"
            />
            <ActionCard
              icon="📊"
              title="Weekly report"
              description="Performance + recommendations"
              href="/en/dashboard/relatorios"
            />
            <ActionCard
              icon="🎯"
              title="Ads"
              description="Manage your campaigns"
              href="/en/dashboard/anuncios"
            />
            <ActionCard
              icon="📸"
              title="Instagram profile"
              description="Bio, followers and latest posts"
              href="/en/dashboard/perfil-instagram"
            />
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Your Landing Page
          </h2>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-brand-text">
                  app.scannerdasaude.com/lp/
                  {(f.instagram_handle as string) ||
                    (f.nome_comercial as string)?.toLowerCase().replace(/\s+/g, "-") ||
                    "your-url"}
                </div>
                <p className="mt-1 text-sm text-brand-text/60">
                  Your personalized landing page with your colors, photo,
                  story and booking link.
                </p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                in production
              </span>
            </div>
          </div>
        </section>

        <footer className="mt-12 text-center text-xs text-brand-text/40">
          Scanner da Saúde · Digital Franchise Platform
        </footer>
      </div>
    </main>
  );
}

function StatusCard({
  title,
  status,
  text,
  action,
}: {
  title: string;
  status: "ok" | "warning" | "info";
  text: string;
  action?: { label: string; href: string } | null;
}) {
  const colorCls =
    status === "ok"
      ? "bg-green-100 text-green-700"
      : status === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-blue-100 text-blue-700";
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-brand-text/60">
          {title}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorCls}`}>
          ● {status === "ok" ? "OK" : status === "warning" ? "Action needed" : "Info"}
        </span>
      </div>
      <div className="text-sm font-medium text-brand-text">{text}</div>
      {action && (
        <Link
          href={action.href}
          className="mt-2 inline-block text-xs font-medium text-brand-primary hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wider text-brand-text/60">
        {title}
      </div>
      <div className="mt-2 text-3xl font-bold text-brand-text">{value}</div>
      {hint && <div className="mt-1 text-xs text-brand-text/40">{hint}</div>}
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="h-full rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md">
        <div className="mb-2 text-2xl">{icon}</div>
        <div className="text-sm font-semibold text-brand-text">{title}</div>
        <div className="mt-1 text-xs text-brand-text/60">{description}</div>
      </div>
    </Link>
  );
}

