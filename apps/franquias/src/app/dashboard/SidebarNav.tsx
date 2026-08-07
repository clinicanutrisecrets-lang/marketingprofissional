"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/dashboard", icone: "▦", label: "Dashboard", exato: true },
  { href: "/dashboard/conteudo", icone: "🎨", label: "Estúdio de conteúdo" },
  { href: "/dashboard/conteudo/editor", icone: "🖼️", label: "Editor de arte" },
  { href: "/dashboard/conteudo/galeria", icone: "🗂️", label: "Minha galeria" },
  { href: "/dashboard/biblioteca-posts", icone: "📚", label: "Posts prontos" },
  { href: "/dashboard/aprovar", icone: "✅", label: "Aprovar semana" },
  { href: "/dashboard/briefings", icone: "📝", label: "Pedir conteúdo" },
  { href: "/dashboard/posts/novo", icone: "✨", label: "Post manual" },
  { href: "/dashboard/teleprompter", icone: "🎥", label: "Teleprompter" },
  { href: "/dashboard/biblioteca-videos", icone: "🎬", label: "Vídeos" },
];

export function SidebarNav(props: { nome: string; corPrimaria: string }) {
  const pathname = usePathname();

  function ativo(item: (typeof ITENS)[number]): boolean {
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
          {ITENS.map((item) => (
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
          {ITENS.map((item) => (
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
        </div>
      </div>
    </>
  );
}
