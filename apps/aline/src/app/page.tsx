import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-aline-bg p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-aline-text/50">
            Sistema interno · privado
          </p>
          <h1 className="text-4xl font-bold text-aline-text">Studio Aline</h1>
          <p className="mt-2 text-aline-text/60">
            Gestão integrada dos dois perfis, anúncios e relatórios.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <PerfilCard
            nome="@scannerdasaude"
            cor="#0BB8A8"
            descricao="Vender o software Scanner da Saúde. Público: nutricionistas."
          />
          <PerfilCard
            nome="@nutrisecrets"
            cor="#D946EF"
            descricao="Educar sobre nutrição de precisão. 250k seguidores."
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <QuickLink href="/aprovar" title="Aprovar a semana" />
          <QuickLink href="/anuncios" title="Gestão de anúncios" />
          <QuickLink href="/relatorios" title="Relatório unificado" />
        </div>

        <Link
          href="/login"
          className="mt-12 inline-block text-sm text-aline-text/60 hover:text-aline-scanner"
        >
          Entrar no painel →
        </Link>
      </div>
    </main>
  );
}

function PerfilCard({
  nome,
  cor,
  descricao,
}: {
  nome: string;
  cor: string;
  descricao: string;
}) {
  return (
    <div
      className="rounded-2xl border bg-white p-6 shadow-sm"
      style={{ borderColor: `${cor}33` }}
    >
      <div
        className="mb-3 inline-block h-3 w-3 rounded-full"
        style={{ background: cor }}
      />
      <h2 className="text-xl font-semibold">{nome}</h2>
      <p className="mt-1 text-sm text-aline-text/60">{descricao}</p>
    </div>
  );
}

function QuickLink({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-aline-text/10 bg-white p-4 text-sm font-medium transition hover:border-aline-scanner hover:text-aline-scanner"
    >
      {title} →
    </Link>
  );
}
