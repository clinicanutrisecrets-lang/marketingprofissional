"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; icone: string; label: string; exato?: boolean };

/**
 * O caminho da semana fica à mostra; o resto vai pra "Mais ferramentas"
 * (Aline, 02/10: "muita informação, muito botão"). Nada foi tirado do app:
 * só deixou de disputar atenção com o que ela faz toda semana.
 */
const PRINCIPAIS: Item[] = [
  { href: "/dashboard", icone: "▦", label: "Início", exato: true },
  { href: "/dashboard/aprovar", icone: "✅", label: "Aprovar semana" },
  { href: "/dashboard/briefings", icone: "📝", label: "Pedir conteúdo" },
  { href: "/dashboard/posts-venda", icone: "🛍️", label: "Posts de venda" },
  { href: "/dashboard/videos", icone: "🎬", label: "Vídeos" },
];

const FERRAMENTAS: Item[] = [
  { href: "/dashboard/conteudo", icone: "🎨", label: "Estúdio de conteúdo" },
  { href: "/dashboard/conteudo/editor", icone: "🖼️", label: "Editor de arte" },
  { href: "/dashboard/fotos", icone: "📷", label: "Minhas fotos" },
  { href: "/dashboard/conteudo/galeria", icone: "🗂️", label: "Minha galeria" },
  { href: "/dashboard/biblioteca-posts", icone: "📚", label: "Posts prontos" },
  { href: "/dashboard/posts/novo", icone: "✍️", label: "Post manual" },
];

const ITENS: Item[] = [...PRINCIPAIS, ...FERRAMENTAS];

/**
 * `embutido`: o app está dentro do iframe do Scanner ("Posts e Conteúdo").
 * Nesse modo só a barra de chips aparece, em qualquer largura — a lateral
 * seria um segundo menu ao lado do menu do Scanner — e o Sair fica de fora:
 * deslogar de dentro do iframe deixaria um login do Marketing no meio da
 * tela do Scanner. O perfil (⚙️) entra como chip.
 */
export function SidebarNav(props: { nome: string; corPrimaria: string; embutido?: boolean }) {
  const pathname = usePathname();
  const naFerramenta = FERRAMENTAS.some((i) => ativo(i));
  const [maisAberto, setMaisAberto] = useState(naFerramenta);
  const mostrarMais = maisAberto || naFerramenta;

  if (props.embutido) {
    const perfil: Item = { href: "/onboarding", icone: "⚙️", label: "Meu perfil de marketing", exato: true };
    const itens = [...PRINCIPAIS, ...(mostrarMais ? [...FERRAMENTAS, perfil] : [])];
    return (
      // Chips QUEBRAM em linhas (Aline, 09/09: "tem como o menu ficar em 2
      // linhas pra não precisar arrastar pro lado?"). Dentro do iframe a
      // largura é a do Scanner, e rolagem horizontal escondia metade do menu.
      <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-brand-text/8 bg-white/90 px-4 py-2 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          {itens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                ativo(item)
                  ? "bg-brand-primary text-white"
                  : "bg-brand-muted text-brand-text/70"
              }`}
            >
              {item.icone} {item.label}
            </Link>
          ))}
          <BotaoMais aberto={mostrarMais} onClick={() => setMaisAberto(!mostrarMais)} chip />
        </div>
      </div>
    );
  }

  function ativo(item: Item): boolean {
    if (item.exato) return pathname === item.href;
    // rota mais específica vence (editor/galeria não acendem o estúdio)
    const maisEspecifica = ITENS.some(
      (o) => o !== item && !o.exato && o.href.startsWith(item.href) && pathname.startsWith(o.href),
    );
    return pathname.startsWith(item.href) && !maisEspecifica;
  }

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-brand-text/8 bg-white lg:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold text-white"
            style={{ background: props.corPrimaria }}
          >
            {props.nome.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-brand-text">{props.nome}</p>
            <p className="text-[11px] text-brand-text/50">Scanner da Saúde</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {[...PRINCIPAIS, ...(mostrarMais ? FERRAMENTAS : [])].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                ativo(item)
                  ? "bg-brand-primary text-white shadow-sm"
                  : "text-brand-text/70 hover:bg-brand-muted"
              }`}
            >
              <span className="w-5 text-center">{item.icone}</span>
              {item.label}
            </Link>
          ))}
          <BotaoMais aberto={mostrarMais} onClick={() => setMaisAberto(!mostrarMais)} />
        </nav>

        <div className="border-t border-brand-text/8 p-3">
          <Link
            href="/onboarding"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-text/70 hover:bg-brand-muted"
          >
            <span className="w-5 text-center">⚙️</span>
            Meu perfil
          </Link>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-brand-text/50 hover:bg-brand-muted"
            >
              <span className="w-5 text-center">↩︎</span>
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile: barra horizontal com chips roláveis */}
      <div className="sticky top-0 z-30 -mx-4 mb-4 overflow-x-auto border-b border-brand-text/8 bg-white/90 px-4 py-2 backdrop-blur lg:hidden">
        <div className="flex w-max gap-2">
          {[...PRINCIPAIS, ...(mostrarMais ? FERRAMENTAS : [])].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                ativo(item)
                  ? "bg-brand-primary text-white"
                  : "bg-brand-muted text-brand-text/70"
              }`}
            >
              {item.icone} {item.label}
            </Link>
          ))}
          <BotaoMais aberto={mostrarMais} onClick={() => setMaisAberto(!mostrarMais)} chip />
        </div>
      </div>
    </>
  );
}

function BotaoMais(props: { aberto: boolean; onClick: () => void; chip?: boolean }) {
  const texto = props.aberto ? "Menos" : "Mais ferramentas";
  if (props.chip) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        className="whitespace-nowrap rounded-full border border-brand-text/15 px-3 py-1.5 text-xs font-semibold text-brand-text/60"
      >
        {props.aberto ? "▴" : "▾"} {texto}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-brand-text/50 hover:bg-brand-muted"
    >
      <span className="w-5 text-center">{props.aberto ? "▴" : "▾"}</span>
      {texto}
    </button>
  );
}
