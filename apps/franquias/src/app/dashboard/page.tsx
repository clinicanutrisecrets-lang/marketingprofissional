import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TendenciasCard from "@/components/TendenciasCard";
import { TutorialTour } from "@/components/TutorialTour";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada) redirect("/onboarding");
  if (!franqueada.onboarding_completo) redirect("/onboarding");

  const f = franqueada as Record<string, unknown>;
  const fId = f.id as string;

  const nome =
    (f.nome_comercial as string) ||
    (f.nome_completo as string)?.split(" ")[0] ||
    "Olá";
  const corPrimaria = (f.cor_primaria_hex as string) || "#0BB8A8";

  // Números reais do que funciona hoje
  const segunda = proximaSegunda();
  const [{ count: sugestoesSemana }, { count: artesSalvas }, { count: pedidosPendentes }] =
    await Promise.all([
      supabase
        .from("sugestoes_conteudo")
        .select("id", { count: "exact", head: true })
        .eq("franqueada_id", fId)
        .eq("semana_ref", segunda)
        .neq("status", "descartado"),
      supabase
        .from("artes_geradas")
        .select("id", { count: "exact", head: true })
        .eq("franqueada_id", fId),
      supabase
        .from("briefings_franqueada")
        .select("id", { count: "exact", head: true })
        .eq("franqueada_id", fId)
        .eq("status", "pendente"),
    ]);

  const temSugestoes = (sugestoesSemana ?? 0) > 0;

  return (
    <main className="mx-auto max-w-5xl py-6 lg:py-10 lg:pl-6">
      <TutorialTour />

      {/* Saudação */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text lg:text-3xl">
          Olá, {nome} 👋
        </h1>
        <p className="mt-1 text-sm text-brand-text/60">
          Sua agência de conteúdo, pronta pra trabalhar.
        </p>
      </header>

      {/* Guia do Estúdio — logo abaixo da saudação, antes do CTA. A Aline pediu
          que ele chame atenção e fique SEMPRE à mão (16/08): a profissional que
          não entende como o conteúdo é criado não confia no que recebe.
          O PDF é servido pelo Scanner, que é onde ele vive versionado. */}
      <a
        href="https://scannerdasaude.com/guia-estudio-conteudo.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center gap-4 rounded-2xl border-2 border-dashed border-brand-primary/40 bg-white p-4 transition hover:border-brand-primary hover:bg-brand-primary/5"
      >
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-xl">
          📘
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-brand-text">
            Primeira vez aqui? Comece pelo guia
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-brand-text/60">
            Como o seu conteúdo é criado toda semana, o que muda em cada formato
            e o que fazer com o pacote. 7 páginas.
          </span>
        </span>
        <span className="flex-shrink-0 rounded-lg bg-brand-primary/10 px-3 py-2 text-[13px] font-semibold text-brand-primary">
          Abrir guia →
        </span>
      </a>

      {/* CTA principal */}
      <Link
        href="/dashboard/conteudo"
        className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5 text-white shadow-sm transition hover:opacity-95"
        style={{ background: corPrimaria }}
      >
        <div>
          <p className="text-base font-bold">
            {temSugestoes
              ? `Você tem ${sugestoesSemana} sugestões prontas esta semana`
              : "Gere suas sugestões da semana"}
          </p>
          <p className="mt-0.5 text-sm text-white/80">
            {temSugestoes
              ? "Artes, legendas e roteiros esperando por você no Estúdio."
              : "Pautas do seu nicho + artes na sua marca + legendas prontas, em 1 minuto."}
          </p>
        </div>
        <span className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold">
          {temSugestoes ? "Abrir o Estúdio →" : "✨ Gerar agora →"}
        </span>
      </Link>

      {/* Números */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icone="🗓️" valor={String(sugestoesSemana ?? 0)} label="Sugestões da semana" />
        <StatCard icone="🗂️" valor={String(artesSalvas ?? 0)} label="Artes na galeria" />
        <StatCard icone="📝" valor={String(pedidosPendentes ?? 0)} label="Pedidos na fila" />
        <StatCard icone="🛡️" valor="Ativo" label="Compliance CFN" />
      </section>

      {/* Em alta no nicho — abaixo dos números */}
      <section className="mb-6">
        <TendenciasCard
          nicho={(f.nicho_principal as string) ?? "saude_integrativa"}
          corPrimaria={corPrimaria}
        />
      </section>

      <footer className="mt-12 pb-6 text-center text-xs text-brand-text/40">
        Scanner da Saúde · Plataforma Franquia Digital
      </footer>
    </main>
  );
}

function proximaSegunda(): string {
  const agora = new Date(Date.now() - 3 * 3600 * 1000);
  const dow = agora.getUTCDay();
  const dias = ((8 - dow) % 7) || 7;
  return new Date(agora.getTime() + dias * 86400 * 1000).toISOString().slice(0, 10);
}

function StatCard({ icone, valor, label }: { icone: string; valor: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-xl">{icone}</div>
      <div className="mt-2 text-2xl font-bold text-brand-text">{valor}</div>
      <div className="mt-0.5 text-xs text-brand-text/50">{label}</div>
    </div>
  );
}
