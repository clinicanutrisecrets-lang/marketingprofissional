import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  COLECOES,
  postLiberado,
  produtosQueVende,
  type PostBibliotecaRow,
  type ProdutoDaNutri,
} from "@/lib/biblioteca/gate";
import { PostBibliotecaCard } from "./PostBibliotecaCard";

export const dynamic = "force-dynamic";

const ORDEM_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro", "geral",
];

const COLUNAS_POST =
  "id, titulo, mes_ref, colecao, formato, canva_url, imagem_url, requer_scanner_produto, observacao, legenda, ordem";

const PAINEL_TRATAMENTOS = "https://tratamentos.scannerdasaude.com/painel";

export default async function BibliotecaPostsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("biblioteca_posts")
    .select(COLUNAS_POST)
    .eq("ativo", true)
    .order("ordem", { ascending: true });

  // Erro de carregamento NUNCA pode ter cara de biblioteca vazia — a nutri
  // acharia que os posts sumiram.
  if (error) {
    console.error("[biblioteca-posts] select falhou:", error.message);
    return (
      <EstadoSimples>
        <p className="font-semibold text-brand-text">Erro ao carregar os posts.</p>
        <p className="mt-1 text-sm text-brand-text/60">
          Recarregue a página. Se continuar assim, fale com o suporte.
        </p>
      </EstadoSimples>
    );
  }

  const posts = (data ?? []) as PostBibliotecaRow[];

  // Quais produtos essa nutri vende hoje (cache produtos_scanner) — decide
  // as coleções liberadas. Erro aqui não some com a seção em silêncio: a
  // tela avisa que não deu pra conferir.
  let vendidos = new Set<string>();
  let falhouProdutos = false;

  const { data: franq } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (franq) {
    const { data: prods, error: prodErr } = await supabase
      .from("produtos_scanner")
      .select("produto_id, scanner_produto_id")
      .eq("franqueada_id", (franq as { id: string }).id)
      .eq("ativo", true);

    if (prodErr) {
      console.error("[biblioteca-posts] produtos_scanner falhou:", prodErr.message);
      falhouProdutos = true;
    } else {
      vendidos = produtosQueVende((prods ?? []) as ProdutoDaNutri[]);
    }
  }

  const daColecao = posts.filter((p) => p.colecao);
  const mensais = posts.filter((p) => !p.colecao && postLiberado(p, vendidos));

  // Coleções que a nutri pode ver, na ordem em que aparecem nos posts.
  const colecoesLiberadas: string[] = [];
  const porColecao = new Map<string, PostBibliotecaRow[]>();
  for (const p of daColecao) {
    if (!postLiberado(p, vendidos)) continue;
    const chave = p.colecao as string;
    if (!porColecao.has(chave)) {
      porColecao.set(chave, []);
      colecoesLiberadas.push(chave);
    }
    porColecao.get(chave)!.push(p);
  }

  // Existe coleção bloqueada? A nutri não fica sabendo por acaso: a tela diz
  // o que destrava (publicar o produto na Loja) e leva pro lugar certo.
  const bloqueadas = daColecao.some((p) => !postLiberado(p, vendidos));

  const porMes = new Map<string, PostBibliotecaRow[]>();
  for (const p of mensais) {
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
            Posts profissionais criados pela equipe Scanner. Nos modelos do
            Canva, clique em <strong>Editar no Canva</strong> pra trocar a logo
            pela sua e baixar. Nas artes prontas, é só <strong>Baixar a arte</strong>{" "}
            — a legenda você copia aqui do lado.
          </p>
        </header>

        {colecoesLiberadas.map((chave) => {
          const meta = COLECOES[chave];
          const lista = porColecao.get(chave)!;
          return (
            <section key={chave} className="mb-10 rounded-2xl bg-white/60 p-5 ring-1 ring-brand-primary/15">
              <h2 className="text-lg font-semibold text-brand-text">
                {meta?.titulo ?? chave}{" "}
                <span className="text-sm font-normal text-brand-text/50">
                  · {lista.length} posts
                </span>
              </h2>
              <p className="mb-4 mt-1 max-w-3xl text-sm text-brand-text/60">
                {meta?.descricao ??
                  "Posts liberados pra você porque você vende esse produto na sua Loja."}
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lista.map((p) => (
                  <PostBibliotecaCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          );
        })}

        {falhouProdutos && (
          <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Não deu pra conferir os produtos da sua Loja agora, então algumas
            coleções podem estar faltando aqui. Recarregue a página.
          </div>
        )}

        {!falhouProdutos && bloqueadas && (
          <div className="mb-8 rounded-2xl border border-dashed border-brand-primary/30 bg-white p-4 text-sm text-brand-text/70">
            <strong className="text-brand-text">
              Tem coleção de posts esperando por você.
            </strong>{" "}
            Os posts de venda do teste genético (DNA 360 e Consulta
            Nutrigenética) aparecem aqui assim que o produto estiver ativo na
            sua Loja do Scanner Tratamentos — é de lá que sai o link de
            checkout do post.{" "}
            <a
              href={PAINEL_TRATAMENTOS}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-brand-primary underline"
            >
              Abrir o meu painel ↗
            </a>{" "}
            Já publicou? Clique em <strong>Atualizar produtos</strong> na tela
            Posts de venda.
          </div>
        )}

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

function EstadoSimples({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-6xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar pro dashboard
        </Link>
        <div className="rounded-2xl border border-dashed border-brand-text/20 bg-white p-10 text-center">
          {children}
        </div>
      </div>
    </main>
  );
}
