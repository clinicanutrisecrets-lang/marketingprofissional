import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostBibliotecaCard, type PostBiblioteca } from "./PostBibliotecaCard";

export const dynamic = "force-dynamic";

const ORDEM_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro", "geral",
];

export default async function BibliotecaPostsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("biblioteca_posts")
    .select("id, titulo, mes_ref, canva_url, legenda, ordem")
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  const posts = (data ?? []) as PostBiblioteca[];
  const porMes = new Map<string, PostBiblioteca[]>();
  for (const p of posts) {
    const lista = porMes.get(p.mes_ref) ?? [];
    lista.push(p);
    porMes.set(p.mes_ref, lista);
  }
  const meses = Array.from(porMes.keys()).sort(
    (a, b) => ORDEM_MESES.indexOf(a) - ORDEM_MESES.indexOf(b),
  );

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro dashboard
        </Link>

        <header className="mb-6">
          <h1 className="text-3xl font-bold text-brand-text">Biblioteca de posts prontos</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-text/60">
            Posts profissionais criados pela equipe Scanner. Clique em{" "}
            <strong>Editar no Canva</strong> pra abrir o modelo, trocar a logo
            pela sua e baixar — a legenda você copia aqui do lado.
          </p>
        </header>

        {meses.map((mes) => (
          <section key={mes} className="mb-10">
            <h2 className="mb-4 text-lg font-semibold capitalize text-brand-text">
              {mes} <span className="text-sm font-normal text-brand-text/50">· {porMes.get(mes)!.length} posts</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {porMes.get(mes)!.map((p) => (
                <PostBibliotecaCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        ))}

        {posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-brand-text/20 bg-white p-10 text-center text-brand-text/60">
            Biblioteca vazia por enquanto.
          </div>
        )}
      </div>
    </main>
  );
}
