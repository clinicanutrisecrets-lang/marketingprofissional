import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { montarAvisoPronto } from "@/lib/conteudo/aviso-pronto-db";
import TendenciasCard from "@/components/TendenciasCard";
import { TutorialTour } from "@/components/TutorialTour";
import { GuiaPrimeiraVez } from "./GuiaPrimeiraVez";
import { SugestaoCard, type Sugestao } from "./conteudo/SugestaoCard";
import { formatarSemana } from "@/lib/conteudo/semana";

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

  // "Seus conteúdos ficaram prontos" — inclusive o que ela pediu em "Pedir
  // conteúdo". A contagem de posts sai de `posts_agendados`, nunca de
  // `total_posts` (que fica em 0 em quase toda linha), senão uma aprovação
  // vazia viraria aviso e mandaria a nutri pra uma tela sem nada.
  const aviso = await montarAvisoPronto(supabase, fId);

  // "Temas em alta" (Aline, 16/10/2026): as sugestões que o radar monta todo
  // domingo saíram do menu junto com o Estúdio e ficaram sem porta. Elas
  // mostram o que está sendo pesquisado no nicho dela e o que entrou na conta,
  // então moram aqui no início. Só a semana mais recente; o resto em "Ver todos".
  const { data: sugestoesData } = await supabase
    .from("sugestoes_conteudo")
    .select("*")
    .eq("franqueada_id", fId)
    .neq("status", "descartado")
    .order("semana_ref", { ascending: false })
    .order("ordem", { ascending: true })
    .limit(12);
  const sugestoesTodas = (sugestoesData ?? []) as Sugestao[];
  const semanaTemas = sugestoesTodas[0]?.semana_ref ?? null;
  const temasEmAlta = sugestoesTodas.filter((s) => s.semana_ref === semanaTemas).slice(0, 4);

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
      <GuiaPrimeiraVez />

      {/* Conteúdo pronto esperando aprovação (Aline, 22/09/2026). Fica acima
          do CTA de gerar: o que ela tem pra fazer agora é aprovar o que já
          existe, não gerar mais. Some sozinho quando ela aprova. */}
      {aviso && (
        <Link
          href={aviso.href}
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 transition hover:bg-emerald-100"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl">
              ✅
            </span>
            <span className="min-w-0">
              {aviso.estrategia && (
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                  {aviso.estrategia}
                </span>
              )}
              <span className="block text-sm font-bold text-emerald-900">{aviso.titulo}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-emerald-800/80">
                {aviso.detalhe}
              </span>
            </span>
          </span>
          <span className="flex-shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white">
            {aviso.acao} →
          </span>
        </Link>
      )}

      {/* Sem semana esperando: uma linha só, sem banda de "gerar". O pacote da
          semana chega sozinho; pra um post a mais há o Criar post no menu
          (Aline, 02/10/2026: "mais clean, mais objetivo possível"). */}
      {!aviso && (
        <div className="mb-6 rounded-2xl bg-white p-4 text-sm text-brand-text/70 shadow-sm">
          Seu pacote da semana, com a estratégia, chega pronto pra aprovar. Quer um
          assunto específico?{" "}
          <Link href="/dashboard/briefings" className="font-semibold" style={{ color: corPrimaria }}>
            Pedir conteúdo
          </Link>
          .
        </div>
      )}

      {temasEmAlta.length > 0 && semanaTemas && (
        <section className="mb-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-brand-text">🔥 Temas em alta</h2>
              <p className="text-xs text-brand-text/60">
                O que está sendo pesquisado no seu nicho na semana de {formatarSemana(semanaTemas)},
                já em post pronto pra baixar ou gravar.
              </p>
            </div>
            <Link href="/dashboard/conteudo" className="text-sm font-semibold" style={{ color: corPrimaria }}>
              Ver todos →
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {temasEmAlta.map((s) => (
              <SugestaoCard key={s.id} sugestao={s} />
            ))}
          </div>
        </section>
      )}

      {/* Em alta no nicho */}
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
