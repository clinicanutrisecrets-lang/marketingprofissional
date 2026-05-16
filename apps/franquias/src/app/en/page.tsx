import Link from "next/link";

export default function HomeEN() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-muted to-white">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-block rounded-full bg-brand-primary/10 px-4 py-1 text-sm font-medium text-brand-primary">
            Digital Franchise Platform
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-brand-text sm:text-6xl">
            Scanner da Saúde
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-brand-text/70">
            Marketing automation for franchise nutritionists. Personalized
            landing page, Instagram posts, creatives and weekly reports —
            centrally managed.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/en/login"
            className="group rounded-2xl border border-brand-primary/20 bg-white p-8 shadow-sm transition hover:border-brand-primary hover:shadow-md"
          >
            <div className="mb-3 text-sm font-medium uppercase tracking-wide text-brand-primary">
              I am a Nutritionist
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-brand-text">
              Franchisee Panel →
            </h2>
            <p className="text-sm text-brand-text/60">
              Access your dashboard, approve weekly posts, view reports and
              manage your integrations.
            </p>
          </Link>

          <Link
            href="/admin/login"
            className="group rounded-2xl border border-brand-secondary/20 bg-white p-8 shadow-sm transition hover:border-brand-secondary hover:shadow-md"
          >
            <div className="mb-3 text-sm font-medium uppercase tracking-wide text-brand-secondary">
              Internal Team
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-brand-text">
              Admin Panel →
            </h2>
            <p className="text-sm text-brand-text/60">
              Manage franchisees, approve content, download files and track
              overall performance.
            </p>
          </Link>
        </div>

        <footer className="mt-24 text-center text-xs text-brand-text/40">
          © {new Date().getFullYear()} Scanner da Saúde · Aline Quissak
        </footer>
      </div>
    </main>
  );
}
