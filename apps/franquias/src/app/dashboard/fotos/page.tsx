import Link from "next/link";
import { FotosBanco } from "./FotosBanco";

export const dynamic = "force-dynamic";

export default function MinhasFotosPage() {
  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-3xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro dashboard
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Minhas fotos</h1>
          <p className="mt-1 text-sm text-brand-text/60">
            Suba fotos suas e dos seus pratos para os posts ganharem vida. O
            pacote da semana usa uma foto daqui na capa do carrossel e no post
            de feed, trocando a cada post. Sem fotos, a arte sai só com o texto
            na cor da sua marca.
          </p>
        </header>

        <FotosBanco />
      </div>
    </main>
  );
}
