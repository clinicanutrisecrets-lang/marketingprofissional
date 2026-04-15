import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-muted px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mb-4 text-6xl">🔍</div>
        <h1 className="mb-2 text-2xl font-bold text-brand-text">Página não encontrada</h1>
        <p className="mb-6 text-sm text-brand-text/60">
          Essa URL não existe, foi movida, ou você digitou errado.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-primary/90"
        >
          Voltar pro início
        </Link>
      </div>
    </main>
  );
}
