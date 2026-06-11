import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EnDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/en/login");

  const admin = createAdminClient();
  const { data: f } = await admin
    .from("franqueadas")
    .select(
      "id, nome_comercial, instagram_handle, instagram_conta_id, meta_ads_access_token, facebook_pagina_id, cidade, estado",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const instagramConnected = !!(f?.instagram_conta_id);
  const metaAdsConnected = !!(f?.meta_ads_access_token);
  const pageConnected = !!(f?.facebook_pagina_id);

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-5xl p-6 lg:p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-brand-text/50">
              Scanner da Saúde · Nutritionist Portal
            </div>
            <h1 className="mt-1 text-2xl font-bold text-brand-text">
              {f?.nome_comercial ?? "My Dashboard"}
            </h1>
            {f?.cidade && (
              <p className="text-sm text-brand-text/60">
                {f.cidade}{f.estado ? `, ${f.estado}` : ""}
              </p>
            )}
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

        {/* Connection status */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Connected accounts
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <ConnectionCard
              title="Instagram"
              description="Publish posts and stories automatically"
              connected={instagramConnected}
              handle={f?.instagram_handle ? `@${f.instagram_handle}` : undefined}
              connectHref="/en/dashboard/instagram-profile"
              connectLabel="Connect Instagram"
            />
            <ConnectionCard
              title="Facebook Page"
              description="Required for Meta Ads and Instagram Business"
              connected={pageConnected}
              connectHref="/en/dashboard/instagram-profile"
              connectLabel="Connect Page"
            />
            <ConnectionCard
              title="Meta Ads"
              description="Run paid campaigns to attract new patients"
              connected={metaAdsConnected}
              connectHref="/en/dashboard/ads"
              connectLabel="Connect Meta Ads"
            />
          </div>
        </section>

        {/* Main features */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-text/60">
            Features
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <FeatureCard
              icon="📸"
              title="Instagram Profile"
              description="View your profile, followers, recent posts and engagement metrics"
              href="/en/dashboard/instagram-profile"
              available={instagramConnected}
              badge={instagramConnected ? undefined : "connect first"}
            />
            <FeatureCard
              icon="✅"
              title="Content Approval"
              description="Review and approve AI-generated posts before publishing"
              href="/en/dashboard/approve"
              available={true}
            />
            <FeatureCard
              icon="📢"
              title="Meta Ads"
              description="Manage paid advertising campaigns on Facebook and Instagram"
              href="/en/dashboard/ads"
              available={true}
            />
            <FeatureCard
              icon="📊"
              title="Analytics"
              description="Track reach, engagement, and patient acquisition performance"
              href="/dashboard/relatorios"
              available={false}
              badge="coming soon"
            />
            <FeatureCard
              icon="⚙️"
              title="Settings"
              description="Update profile, target audience, tone of voice, integrations"
              href="/onboarding"
              available={true}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ConnectionCard({
  title,
  description,
  connected,
  handle,
  connectHref,
  connectLabel,
}: {
  title: string;
  description: string;
  connected: boolean;
  handle?: string;
  connectHref: string;
  connectLabel: string;
}) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm border-2 ${connected ? "border-green-100" : "border-dashed border-brand-text/10"}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-amber-400"}`} />
        <span className="text-sm font-semibold text-brand-text">{title}</span>
      </div>
      <p className="mb-3 text-xs text-brand-text/60">{description}</p>
      {connected ? (
        <span className="text-xs font-medium text-green-700">
          ✓ Connected{handle ? ` · ${handle}` : ""}
        </span>
      ) : (
        <Link
          href={connectHref}
          className="inline-block rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          {connectLabel} →
        </Link>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  href,
  available,
  badge,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  available: boolean;
  badge?: string;
}) {
  const inner = (
    <div className="h-full rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {badge && (
          <span className="rounded-full bg-brand-text/5 px-2 py-0.5 text-xs font-medium text-brand-text/60">
            {badge}
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-brand-text">{title}</div>
      <div className="mt-1 text-xs text-brand-text/60">{description}</div>
    </div>
  );

  return available ? (
    <Link href={href}>{inner}</Link>
  ) : (
    <div className="cursor-not-allowed opacity-60">{inner}</div>
  );
}
