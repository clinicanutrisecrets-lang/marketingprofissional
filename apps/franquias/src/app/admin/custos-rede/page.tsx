import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SONNET_INPUT_PER_M = 3;
const SONNET_OUTPUT_PER_M = 15;
const SONNET_CACHE_PER_M = 0.3;
const GEMINI_IMAGE_COST = 0.039;

type CustoFranqueada = {
  franqueadaId: string;
  nome: string;
  email: string;
  posts: { qtd: number; custoTexto: number; custoArte: number };
  agentes: number;
  revisoesAds: number;
  total: number;
};

type PageProps = {
  searchParams: Promise<{ mes?: string }>;
};

export default async function AdminCustosRedePage({ searchParams }: PageProps) {
  const { mes: mesParam } = await searchParams;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: adminRow } = await supabase
    .from("admins")
    .select("nome, papel")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!adminRow) redirect("/");
  const admin = adminRow as { nome: string; papel: string };

  // Mes selecionado (default: atual). formato YYYY-MM
  const hoje = new Date();
  const mesSelecionado =
    mesParam ?? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [anoStr, mesStr] = mesSelecionado.split("-");
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const inicio = new Date(Date.UTC(ano, mes - 1, 1)).toISOString();
  const fim = new Date(Date.UTC(ano, mes, 1)).toISOString();

  const dadosFranqueadas = await coletarCustosRede(inicio, fim);
  dadosFranqueadas.sort((a, b) => b.total - a.total);

  const totalRede = dadosFranqueadas.reduce((s, f) => s + f.total, 0);
  const ativas = dadosFranqueadas.filter((f) => f.total > 0).length;
  const media = ativas > 0 ? totalRede / ativas : 0;

  // Lista de meses disponiveis (ultimos 12)
  const opcoesMes: Array<{ value: string; label: string }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const l = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opcoesMes.push({ value: v, label: l });
  }

  return (
    <main className="min-h-screen bg-brand-muted">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-brand-text/60 hover:text-brand-primary"
        >
          ← Voltar ao admin
        </Link>

        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-brand-text">
              Custos de IA — Rede
            </h1>
            <p className="text-sm text-brand-text/60">
              Visão admin · {admin.nome}
            </p>
          </div>
          <form action="/admin/custos-rede" method="GET">
            <select
              name="mes"
              defaultValue={mesSelecionado}
              className="rounded-lg border border-brand-text/10 bg-white px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
              onChange={(e) => e.currentTarget.form?.submit()}
            >
              {opcoesMes.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </form>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card label="Total da rede" value={`$${totalRede.toFixed(2)}`} sub={`R$ ${(totalRede * 5).toFixed(2)}`} destaque />
          <Card label="Franqueadas ativas" value={String(ativas)} sub="com custo no mês" />
          <Card label="Média/franqueada" value={`$${media.toFixed(2)}`} sub={`R$ ${(media * 5).toFixed(2)}`} />
          <Card
            label="Maior gasto"
            value={`$${(dadosFranqueadas[0]?.total ?? 0).toFixed(2)}`}
            sub={dadosFranqueadas[0]?.nome ?? "—"}
            mute
          />
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-brand-text/5 bg-brand-muted/40 px-5 py-3 text-xs uppercase tracking-wider text-brand-text/60">
            Ranking por custo · {mesSelecionado}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-brand-text/5 text-left text-xs uppercase tracking-wider text-brand-text/60">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Franqueada</th>
                <th className="px-4 py-3 text-right">Posts</th>
                <th className="px-4 py-3 text-right">Texto</th>
                <th className="px-4 py-3 text-right">Arte</th>
                <th className="px-4 py-3 text-right">Agentes</th>
                <th className="px-4 py-3 text-right">Revisor Ads</th>
                <th className="px-4 py-3 text-right">Total USD</th>
                <th className="px-4 py-3 text-right">Total BRL</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {dadosFranqueadas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-brand-text/60">
                    Nenhuma franqueada com custo registrado neste mês.
                  </td>
                </tr>
              ) : (
                dadosFranqueadas.map((f, i) => (
                  <tr
                    key={f.franqueadaId}
                    className="border-t border-brand-muted hover:bg-brand-muted/30"
                  >
                    <td className="px-4 py-3 text-brand-text/40">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{f.nome}</td>
                    <td className="px-4 py-3 text-right text-brand-text/70 tabular-nums">
                      {f.posts.qtd}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-text/70 tabular-nums">
                      ${f.posts.custoTexto.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-text/70 tabular-nums">
                      ${f.posts.custoArte.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-text/70 tabular-nums">
                      ${f.agentes.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-text/70 tabular-nums">
                      ${f.revisoesAds.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      ${f.total.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-right text-brand-text/60 tabular-nums">
                      R$ {(f.total * 5).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/franqueadas/${f.franqueadaId}`}
                        className="text-xs font-medium text-brand-secondary hover:underline"
                      >
                        Abrir →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <p className="mt-6 text-center text-xs text-brand-text/40">
          Cotação USD 1 ≈ R$ 5,00 · Sonnet 4.5 ($3/M in, $15/M out, $0.30/M cache) · Gemini imagem ($0.039/imagem) · Outras fontes usam ia_custo_usd salvo na própria tabela.
        </p>
      </div>
    </main>
  );
}

async function coletarCustosRede(inicio: string, fim: string): Promise<CustoFranqueada[]> {
  const admin = createAdminClient();

  const { data: franqueadas } = await admin
    .from("franqueadas")
    .select("id, nome_completo, nome_comercial, email");

  const map = new Map<string, CustoFranqueada>();
  for (const f of (franqueadas ?? []) as Array<{
    id: string;
    nome_completo: string;
    nome_comercial: string | null;
    email: string;
  }>) {
    map.set(f.id, {
      franqueadaId: f.id,
      nome: f.nome_comercial || f.nome_completo,
      email: f.email,
      posts: { qtd: 0, custoTexto: 0, custoArte: 0 },
      agentes: 0,
      revisoesAds: 0,
      total: 0,
    });
  }

  // Posts (texto + arte Gemini)
  const { data: postsData } = await admin
    .from("posts_agendados")
    .select("franqueada_id, ia_tokens_input, ia_tokens_output, ia_tokens_cached, midia_pendente")
    .gte("criado_em", inicio)
    .lt("criado_em", fim);

  for (const p of (postsData ?? []) as Array<{
    franqueada_id: string;
    ia_tokens_input: number | null;
    ia_tokens_output: number | null;
    ia_tokens_cached: number | null;
    midia_pendente: boolean | null;
  }>) {
    const f = map.get(p.franqueada_id);
    if (!f) continue;
    f.posts.qtd += 1;
    const inp = p.ia_tokens_input ?? 0;
    const cached = p.ia_tokens_cached ?? 0;
    const out = p.ia_tokens_output ?? 0;
    f.posts.custoTexto +=
      ((inp - cached) / 1_000_000) * SONNET_INPUT_PER_M +
      (cached / 1_000_000) * SONNET_CACHE_PER_M +
      (out / 1_000_000) * SONNET_OUTPUT_PER_M;
    if (!p.midia_pendente) {
      f.posts.custoArte += GEMINI_IMAGE_COST;
    }
  }

  // Agentes (cada um tem ia_custo_usd)
  const tabelas = [
    "diagnosticos_perfil",
    "auditorias_conteudo",
    "storytellings_gerados",
    "tracao_conteudo",
    "planejamentos_estrategicos",
  ];
  for (const t of tabelas) {
    const { data, error } = await admin
      .from(t)
      .select("franqueada_id, ia_custo_usd")
      .gte("criado_em", inicio)
      .lt("criado_em", fim);
    if (error) continue;
    for (const r of (data ?? []) as Array<{
      franqueada_id: string;
      ia_custo_usd: number | null;
    }>) {
      const f = map.get(r.franqueada_id);
      if (!f) continue;
      f.agentes += Number(r.ia_custo_usd ?? 0);
    }
  }

  // Revisoes ads (gestor de trafego IA)
  const { data: revisoes } = await admin
    .from("franqueadas_revisoes_ads")
    .select("franqueada_id, ia_custo_usd")
    .gte("criado_em", inicio)
    .lt("criado_em", fim);
  for (const r of (revisoes ?? []) as Array<{
    franqueada_id: string;
    ia_custo_usd: number | null;
  }>) {
    const f = map.get(r.franqueada_id);
    if (!f) continue;
    f.revisoesAds += Number(r.ia_custo_usd ?? 0);
  }

  // Total
  const arr = Array.from(map.values());
  for (const f of arr) {
    f.total = f.posts.custoTexto + f.posts.custoArte + f.agentes + f.revisoesAds;
  }
  return arr;
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
          ? "bg-brand-primary/10 ring-1 ring-brand-primary/30"
          : mute
            ? "bg-white opacity-70"
            : "bg-white"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-brand-text/60">{label}</div>
      <div
        className={`mt-1 text-3xl font-bold ${
          destaque ? "text-brand-primary" : "text-brand-text"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-brand-text/50">{sub}</div>
    </div>
  );
}
