/**
 * A tela do painel de conversas (só desenha). Os dados chegam prontos de
 * montarPainel (lib/automacao/painel.ts); as ações chegam por props, pra a
 * mesma tela ser desenhada fora do app na conferência visual.
 */
import type { ReactNode } from "react";
import { legendaDaOrigem, linkDoDirect, nomeDoCanal, type Conversa, type Painel } from "@/lib/automacao/painel";

type Acao = (contatoId: string) => ((formData: FormData) => void | Promise<void>) | undefined;

export function ConversasView(p: {
  perfilNome: string;
  painel: Painel;
  cor: string;
  roboLigado: boolean;
  atendi?: Acao;
  alternarRobo?: (contatoId: string, silenciado: boolean) => ((formData: FormData) => void | Promise<void>) | undefined;
  voltar?: ReactNode;
}) {
  const { painel } = p;
  const c = painel.contadores;
  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:p-8">
        {p.voltar}
        <h1 className="text-2xl font-bold text-aline-text">Conversas de hoje</h1>
        <p className="mt-1 text-sm text-aline-text/60">
          {p.perfilNome} · nas últimas 24 h: {c.entradas24h} mensagens recebidas, {c.saidas24h} enviadas pelo robô, {c.conversas24h} pessoas.
          {!p.roboLigado && " O robô está desligado: nada sai sozinho."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Resumo rotulo="Urgente" n={painel.urgentes.length} classe="bg-red-50 text-red-800" />
          <Resumo rotulo="Esperando você" n={painel.esperando.length} classe="bg-amber-50 text-amber-900" />
          <Resumo rotulo="Ninguém respondeu" n={painel.semResposta.length} classe="bg-sky-50 text-sky-900" />
          <Resumo rotulo="Robô respondeu" n={painel.roboRespondeu.length} classe="bg-emerald-50 text-emerald-900" />
        </div>

        <Bloco titulo="Urgente" explica="Mensagem de sofrimento. O robô mandou só o CVV 188 e o 192 e te avisou por e-mail. Abra e responda você." itens={painel.urgentes} {...p} tom="border-red-300" vazio="Nada urgente." />
        <Bloco titulo="Esperando você" explica="O robô passou a conversa pra você: cliente com problema, convite, caso individual ou resposta que ele segurou." itens={painel.esperando} {...p} tom="border-amber-300" vazio="Ninguém esperando." />
        <Bloco titulo="Ninguém respondeu" explica="A pessoa escreveu e não saiu nada depois. Conversas que você mesma conduz não entram aqui." itens={painel.semResposta} {...p} tom="border-sky-200" vazio="Todo mundo teve resposta." />
        <Bloco titulo="O robô respondeu" explica="O que saiu nas últimas 24 h, pra você ler e corrigir o que não for do seu jeito." itens={painel.roboRespondeu} {...p} tom="border-emerald-200" vazio="O robô não mandou nada nas últimas 24 h." />
      </div>
    </main>
  );
}

function Resumo({ rotulo, n, classe }: { rotulo: string; n: number; classe: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${classe}`}>
      <div className="text-2xl font-bold">{n}</div>
      <div className="text-xs">{rotulo}</div>
    </div>
  );
}

function Bloco(p: {
  titulo: string; explica: string; itens: Conversa[]; tom: string; vazio: string; cor: string;
  atendi?: Acao; alternarRobo?: (contatoId: string, silenciado: boolean) => ((formData: FormData) => void | Promise<void>) | undefined;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-aline-text/70">{p.titulo} ({p.itens.length})</h2>
      <p className="mb-2 text-xs text-aline-text/60">{p.explica}</p>
      {p.itens.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-aline-text/50 shadow-sm">{p.vazio}</p>
      ) : (
        <div className="space-y-3">{p.itens.map((v) => <Cartao key={v.contato.id} v={v} {...p} />)}</div>
      )}
    </section>
  );
}

function Cartao(p: {
  v: Conversa; tom: string; cor: string; atendi?: Acao;
  alternarRobo?: (contatoId: string, silenciado: boolean) => ((formData: FormData) => void | Promise<void>) | undefined;
}) {
  const { contato: c, mensagens } = p.v;
  const quem = c.username ? `@${c.username}` : c.nome ?? "sem nome";
  const link = linkDoDirect(c.username);
  const cli = c.cliente_situacao?.confirmado ? c.cliente_situacao : null;
  const acaoAtendi = p.atendi?.(c.id);
  const acaoRobo = p.alternarRobo?.(c.id, !c.silenciado);
  return (
    <article className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm ${p.tom}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="break-all text-aline-text">{quem}</strong>
          {c.nome && c.username && <span className="text-sm text-aline-text/60"> · {c.nome}</span>}
          <div className="mt-1 flex flex-wrap gap-1 text-xs">
            {p.v.canalDaUltimaEntrada && <Selo>{p.v.canalDaUltimaEntrada}</Selo>}
            {p.v.horasDeJanela != null
              ? <Selo>{p.v.horasDeJanela >= 1 ? `${Math.floor(p.v.horasDeJanela)} h pra responder no direct` : "menos de 1 h pra responder"}</Selo>
              : <Selo>janela do direct fechada</Selo>}
            {cli && <Selo>cliente{cli.tem_genetico ? " · tem genético" : ""}{cli.tem_epigenetico ? " · tem epigenético" : ""}{cli.comprou_lotus ? " · Lótus" : ""}</Selo>}
            {c.aline_falou_em && <Selo>você conversa com ela</Selo>}
            {c.silenciado && <Selo>robô desligado pra ela</Selo>}
          </div>
          {c.precisa_humano && c.precisa_humano_motivo && (
            <p className="mt-2 text-sm font-medium text-aline-text">{c.precisa_humano_motivo}</p>
          )}
        </div>
      </header>

      <ol className="mt-3 space-y-1.5 text-sm">
        {mensagens.map((m) => (
          <li key={m.id} className={`rounded-lg px-3 py-2 ${m.direcao === "saida" ? "ml-6 bg-aline-muted" : "mr-6 ring-1 ring-aline-text/10"}`}>
            <div className="text-[11px] text-aline-text/50">
              {m.direcao === "saida" ? `robô · ${legendaDaOrigem(m.origem)}` : `${quem} · ${nomeDoCanal(m.canal)}`} · {quando(m.criado_em)}
            </div>
            <div className="whitespace-pre-wrap break-words text-aline-text">{(m.texto ?? "").slice(0, 600) || "(sem texto)"}</div>
          </li>
        ))}
      </ol>

      <footer className="mt-3 flex flex-wrap gap-2 text-sm">
        {link && (
          <a href={link} target="_blank" rel="noopener" className="rounded-lg px-3 py-1.5 font-medium text-white" style={{ background: p.cor }}>
            Abrir no Instagram
          </a>
        )}
        {c.precisa_humano && (
          <form action={acaoAtendi}><button className="rounded-lg px-3 py-1.5 ring-1 ring-aline-text/20">Resolvi</button></form>
        )}
        <form action={acaoRobo}><button className="rounded-lg px-3 py-1.5 ring-1 ring-aline-text/20">{c.silenciado ? "Religar robô pra ela" : "Desligar robô pra ela"}</button></form>
      </footer>
    </article>
  );
}

function Selo({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-aline-muted px-2 py-0.5 text-aline-text/70">{children}</span>;
}

function quando(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}
