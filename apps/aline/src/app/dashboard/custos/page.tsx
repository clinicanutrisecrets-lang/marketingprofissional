import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Precos Sonnet 4.5 (USD por 1M tokens)
const SONNET_INPUT_PER_M = 3;
const SONNET_OUTPUT_PER_M = 15;
const SONNET_CACHE_PER_M = 0.3;

// Custo aproximado por imagem gerada (gpt-image-1 high quality 1024x1024)
const OPENAI_IMAGE_COST = 0.167;

type Linha = { categoria: string; qtd: number; custoUsd: number };

export default async function CustosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();

  // Periodo: mes atual + mes passado
  const hoje = new Date();
  const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString();

  const mesAtual = await coletarCustos(aline, inicioMesAtual);
  const mesPassado = await coletarCustos(aline, inicioMesPassado, inicioMesAtual);

  const totalMesAtual = mesAtual.reduce((s, l) => s + l.custoUsd, 0);
  const totalMesPassado = mesPassado.reduce((s, l) => s + l.custoUsd, 0);

  const projecao = projetarMesAtual(totalMesAtual, hoje);

  return (
    <main className="min-h-screen bg-aline-bg">
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-aline-text/60 hover:text-aline-scanner"
        >
          ← Voltar
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl font-bold text-aline-text">Custos de IA</h1>
          <p className="mt-2 text-sm text-aline-text/60">
            Quanto o Studio gastou com Claude (texto) + OpenAI (imagens) por mês.
          </p>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card label="Mês atual (real)" value={`$${totalMesAtual.toFixed(2)}`} sub={`R$ ${(totalMesAtual * 5).toFixed(2)}`} />
          <Card
            label="Projeção fim do mês"
            value={`$${projecao.toFixed(2)}`}
            sub={`R$ ${(projecao * 5).toFixed(2)}`}
            destaque
          />
          <Card
            label="Mês passado"
            value={`$${totalMesPassado.toFixed(2)}`}
            sub={`R$ ${(totalMesPassado * 5).toFixed(2)}`}
            mute
          />
        </section>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-aline-text/60">
            Mês atual — quebra por categoria
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-aline-text/10 text-left text-xs uppercase tracking-wide text-aline-text/50">
                <th className="pb-2">Categoria</th>
                <th className="pb-2 text-right">Quantidade</th>
                <th className="pb-2 text-right">Custo USD</th>
                <th className="pb-2 text-right">Custo BRL</th>
              </tr>
            </thead>
            <tbody>
              {mesAtual.map((l) => (
                <tr key={l.categoria} className="border-b border-aline-text/5">
                  <td className="py-2.5 font-medium">{l.categoria}</td>
                  <td className="py-2.5 text-right text-aline-text/70">{l.qtd}</td>
                  <td className="py-2.5 text-right tabular-nums">${l.custoUsd.toFixed(4)}</td>
                  <td className="py-2.5 text-right tabular-nums text-aline-text/60">
                    R$ {(l.custoUsd * 5).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td className="pt-3">TOTAL</td>
                <td className="pt-3"></td>
                <td className="pt-3 text-right tabular-nums">${totalMesAtual.toFixed(4)}</td>
                <td className="pt-3 text-right tabular-nums">
                  R$ {(totalMesAtual * 5).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        <p className="text-center text-xs text-aline-text/40">
          Cotação estimada: USD 1 ≈ R$ 5,00 · Preços Sonnet 4.5 ($3/M in, $15/M out, $0.30/M cache) e OpenAI gpt-image-1 ($0.167/imagem 1024×1024 HD).
        </p>
      </div>
    </main>
  );
}

async function coletarCustos(
  aline: ReturnType<typeof createAlineClient>,
  desde: string,
  ate?: string,
): Promise<Linha[]> {
  const linhas: Linha[] = [];

  // Posts (texto + arte)
  let postsQuery = aline
    .from("posts")
    .select("ia_tokens_input, ia_tokens_output, ia_tokens_cached, midia_pendente")
    .gte("criado_em", desde);
  if (ate) postsQuery = postsQuery.lt("criado_em", ate);
  const { data: posts } = await postsQuery;
  const postsList = (posts ?? []) as Array<{
    ia_tokens_input: number | null;
    ia_tokens_output: number | null;
    ia_tokens_cached: number | null;
    midia_pendente: boolean | null;
  }>;

  if (postsList.length > 0) {
    const inputTokens = sum(postsList.map((p) => p.ia_tokens_input ?? 0));
    const outputTokens = sum(postsList.map((p) => p.ia_tokens_output ?? 0));
    const cachedTokens = sum(postsList.map((p) => p.ia_tokens_cached ?? 0));
    const custoTexto =
      ((inputTokens - cachedTokens) / 1_000_000) * SONNET_INPUT_PER_M +
      (cachedTokens / 1_000_000) * SONNET_CACHE_PER_M +
      (outputTokens / 1_000_000) * SONNET_OUTPUT_PER_M;

    linhas.push({
      categoria: "Posts — texto (Claude)",
      qtd: postsList.length,
      custoUsd: custoTexto,
    });

    // Arte: 1 imagem por post sem midia_pendente (foi gerada)
    const comArte = postsList.filter((p) => !p.midia_pendente).length;
    if (comArte > 0) {
      linhas.push({
        categoria: "Posts — arte (OpenAI HD)",
        qtd: comArte,
        custoUsd: comArte * OPENAI_IMAGE_COST,
      });
    }
  }

  // Diagnosticos
  await somarTabela(aline, "diagnosticos", "Diagnósticos", desde, ate, linhas);
  // Auditorias
  await somarTabela(aline, "auditorias_conteudo", "Auditorias de conteúdo", desde, ate, linhas);
  // Storytellings
  await somarTabela(aline, "storytellings_gerados", "Storytellings", desde, ate, linhas);
  // Tracao
  await somarTabela(aline, "tracao_conteudo", "Tração (Skill 7)", desde, ate, linhas);

  return linhas;
}

async function somarTabela(
  aline: ReturnType<typeof createAlineClient>,
  tabela: string,
  rotulo: string,
  desde: string,
  ate: string | undefined,
  linhas: Linha[],
) {
  let q = aline.from(tabela).select("ia_custo_usd").gte("criado_em", desde);
  if (ate) q = q.lt("criado_em", ate);
  const { data, error } = await q;
  if (error) return; // tabela pode nao existir ainda em alguns ambientes
  const lista = (data ?? []) as Array<{ ia_custo_usd: number | null }>;
  if (lista.length === 0) return;
  const custo = sum(lista.map((d) => Number(d.ia_custo_usd ?? 0)));
  linhas.push({ categoria: rotulo, qtd: lista.length, custoUsd: custo });
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function projetarMesAtual(custoAteAgora: number, hoje: Date): number {
  const diaAtual = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  if (diaAtual === 0) return custoAteAgora;
  return (custoAteAgora / diaAtual) * diasNoMes;
}

function Card({
  label,
  value,
  sub,
  destaque,
  mute,
}: {
  label: string;
  value: string;
  sub: string;
  destaque?: boolean;
  mute?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 shadow-sm ${
        destaque
          ? "bg-aline-scanner/10 ring-1 ring-aline-scanner/30"
          : mute
            ? "bg-white opacity-70"
            : "bg-white"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-aline-text/50">{label}</div>
      <div
        className={`mt-1 text-3xl font-bold ${
          destaque ? "text-aline-scanner" : "text-aline-text"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-aline-text/50">{sub}</div>
    </div>
  );
}
