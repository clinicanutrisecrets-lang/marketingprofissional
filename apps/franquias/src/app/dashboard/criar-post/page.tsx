import Link from "next/link";
import { URL_CARROSSEL_TEMA } from "@/lib/scanner-url";

/**
 * Criar post (Aline, 15/10/2026): o menu tinha "Carrossel por tema" e
 * "Editor de arte" separados, e a profissional não sabia qual usar. Aqui são
 * as duas portas lado a lado, cada uma dizendo pra que serve.
 *
 * O carrossel mora no Scanner e abre no topo da aba (`_top`), senão abriria
 * o Scanner dentro do próprio Scanner quando o app está embutido.
 */
export default function CriarPostPage() {
  return (
    <main className="mx-auto max-w-5xl py-6 lg:py-10 lg:pl-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-brand-text">🧩 Criar post</h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
          Quer um post além do pacote da semana? Escolha o formato. Os dois saem na
          sua marca, prontos pra baixar.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <a
          href={URL_CARROSSEL_TEMA}
          target="_top"
          className="group rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="text-3xl">🧩</div>
          <h2 className="mt-3 font-bold text-brand-text">Carrossel</h2>
          <p className="mt-1 text-sm text-brand-text/60">
            Você escreve o tema e o Scanner monta os slides com o texto, na sua marca.
            Dá pra mudar o texto de cada slide, pôr foto nos cards e escolher a fonte.
          </p>
          <p className="mt-2 text-xs text-brand-text/45">Abre no Scanner, em Conteúdo IG.</p>
          <span className="mt-3 inline-block text-sm font-semibold text-brand-primary">
            Criar carrossel →
          </span>
        </a>

        <Link
          href="/dashboard/conteudo/editor"
          className="group rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <div className="text-3xl">🖼️</div>
          <h2 className="mt-3 font-bold text-brand-text">Post único</h2>
          <p className="mt-1 text-sm text-brand-text/60">
            Uma arte só, com o título e o texto que você escrever e uma foto sua se
            quiser. Você vê a prévia antes de baixar.
          </p>
          <span className="mt-3 inline-block text-sm font-semibold text-brand-primary">
            Criar post único →
          </span>
        </Link>
      </div>

      <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-brand-text/60 shadow-sm">
        Já tem a foto ou o vídeo pronto e só quer a legenda?{" "}
        <Link href="/dashboard/posts/novo" className="font-semibold text-brand-primary underline">
          Use o Post manual
        </Link>
        .
      </p>
    </main>
  );
}
