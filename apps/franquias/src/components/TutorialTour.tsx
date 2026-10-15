"use client";

import { useEffect, useState } from "react";

/**
 * Tutorial interativo da plataforma: abre sozinho no primeiro acesso
 * (flag em localStorage) e fica sempre disponível no botão flutuante
 * "❓ Tutorial". Carrossel didático com progresso e ações diretas.
 */

// v4 (15/10/2026): menu novo (Criar post, Estúdio fora). Chave nova pra quem
// viu o v3 ver o novo uma vez.
const CHAVE = "tutorial_plataforma_v4";

type Passo = {
  emoji: string;
  titulo: string;
  texto: string;
  dica?: string;
  href?: string;
  hrefLabel?: string;
};

const PASSOS: Passo[] = [
  {
    emoji: "👋",
    titulo: "Boas-vindas à sua agência de marketing!",
    texto:
      "Aqui você tem conteúdo profissional pro seu Instagram sem precisar de designer nem redator. Vou te mostrar em 2 minutos como tudo funciona.",
    dica: "Você pode reabrir este tutorial quando quiser no botão ❓ Tutorial.",
  },
  {
    emoji: "✅",
    titulo: "Aprovar semana",
    texto:
      "Todo domingo o sistema monta a sua semana sozinho: posts com arte na SUA marca, legenda pronta, stories e reel, seguindo uma estratégia que leva quem te segue até o teste nutrigenético. Você só revisa, ajusta o que quiser e aprova. Aprovado, é baixar as artes e copiar as legendas.",
    dica: "O guia da semana, no topo da tela, explica o papel de cada post.",
    href: "/dashboard/aprovar",
    hrefLabel: "Abrir Aprovar semana",
  },
  {
    emoji: "📝",
    titulo: "Pedir conteúdo",
    texto:
      "Quer um assunto específico na próxima semana? Peça aqui. O pedido entra no pacote do domingo seguinte.",
    href: "/dashboard/briefings",
    hrefLabel: "Pedir conteúdo",
  },
  {
    emoji: "🛍️",
    titulo: "Posts de venda",
    texto:
      "Posts prontos pra cada produto que você vende, com a arte na sua marca e o link de compra na legenda.",
    href: "/dashboard/posts-venda",
    hrefLabel: "Ver posts de venda",
  },
  {
    emoji: "🧩",
    titulo: "Criar post",
    texto:
      "Quer um post além do pacote da semana? Em Criar post você escolhe o formato: Carrossel (você escreve o tema e o Scanner monta os slides) ou Post único (uma arte só, com o seu texto e uma foto sua se quiser). Os dois saem na sua marca.",
    href: "/dashboard/criar-post",
    hrefLabel: "Abrir Criar post",
  },
  {
    emoji: "🎬",
    titulo: "Vídeos",
    texto:
      "Tudo de vídeo num lugar só: teleprompter (o roteiro rola na tela enquanto você grava pelo celular), vídeo animado sem você aparecer, vídeo curto com uma frase escrita em cima de um clipe, e edição automática do vídeo que você gravou.",
    dica: "Grave na vertical, com luz de frente pra você (janela ou ring light).",
    href: "/dashboard/videos",
    hrefLabel: "Abrir Vídeos",
  },
  {
    emoji: "🧰",
    titulo: "Mais ferramentas",
    texto:
      "No menu, em 'Mais ferramentas', ficam Minhas fotos (suba fotos suas, que entram nas artes), Minha galeria (as artes que você já fez), Posts prontos e o Post manual (pra quando você já tem a foto e só quer a legenda).",
  },
  {
    emoji: "📲",
    titulo: "Como postar no Instagram",
    texto:
      "Baixe a arte (vai pra galeria do seu celular), toque em 'Copiar legenda', abra o Instagram, crie o post com a arte e cole a legenda. Menos de 1 minuto por post.",
    dica: "Salve as artes da semana de uma vez e agende no próprio Instagram se quiser.",
  },
  {
    emoji: "🚀",
    titulo: "Tudo pronto pra começar!",
    texto:
      "Primeiro passo: abra Aprovar semana e veja o que já está montado pra você.",
    href: "/dashboard/aprovar",
    hrefLabel: "Começar agora",
  },
];

export function TutorialTour() {
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) {
        setAberto(true);
      }
    } catch {
      // localStorage indisponível
    }
  }, []);

  function fechar() {
    setAberto(false);
    setPasso(0);
    try {
      localStorage.setItem(CHAVE, "visto");
    } catch {}
  }

  const p = PASSOS[passo]!;
  const ultimo = passo === PASSOS.length - 1;

  return (
    <>
      {/* Botão flutuante — sempre visível */}
      <button
        onClick={() => {
          setPasso(0);
          setAberto(true);
        }}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90"
        title="Ver tutorial da plataforma"
      >
        ❓ Tutorial
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={fechar}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 text-4xl">{p.emoji}</div>
            <h2 className="mb-2 text-xl font-bold text-brand-text">{p.titulo}</h2>
            <p className="text-sm leading-relaxed text-brand-text/70">{p.texto}</p>
            {p.dica && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                💡 {p.dica}
              </p>
            )}
            {p.href && (
              <a
                href={p.href}
                onClick={fechar}
                className="mt-3 inline-block rounded-lg bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20"
              >
                {p.hrefLabel} →
              </a>
            )}

            {/* Progresso */}
            <div className="mt-6 flex items-center justify-center gap-1.5">
              {PASSOS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPasso(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === passo ? "w-6 bg-brand-primary" : "w-2 bg-brand-text/20"
                  }`}
                  aria-label={`Passo ${i + 1}`}
                />
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={fechar}
                className="text-xs text-brand-text/40 hover:text-brand-text/70"
              >
                Pular
              </button>
              <div className="flex gap-2">
                {passo > 0 && (
                  <button
                    onClick={() => setPasso((x) => x - 1)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-brand-text/60 ring-1 ring-brand-text/15"
                  >
                    Voltar
                  </button>
                )}
                <button
                  onClick={() => (ultimo ? fechar() : setPasso((x) => x + 1))}
                  className="rounded-xl bg-brand-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {ultimo ? "Concluir ✓" : "Próximo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
