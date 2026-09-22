import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { geracaoPausadaParaConta } from "@/lib/features";
import { gerarPostsDaSemana } from "@/lib/geracao/semanal";
import {
  LOTE_PARALELO,
  avisoFilaCortada,
  cabeMaisUmLote,
  filhaIndisponivel,
  lotesDaFila,
  ordenarFila,
  type ContaDaFila,
} from "@/lib/geracao/fila-semanal";

export const dynamic = "force-dynamic";
// 🔴 O `fetch` do Next guarda POST no Data Cache quando `revalidate` não é 0
// (foi o que quebrou o SSO do Marketing em 11/09/2026, servindo um link
// mágico já consumido). Aqui o corpo muda por conta e por semana: cachear
// mandaria a mesma conta duas vezes e deixaria outra sem nada.
export const fetchCache = "force-no-store";
export const maxDuration = 300;

type Resultado = {
  franqueadaId: string;
  nome: string;
  ok: boolean;
  total?: number;
  erro?: string;
  pausada?: boolean;
  inline?: boolean;
};

/**
 * CRON (domingo 09:00 UTC): monta o pacote da semana de cada conta ativa.
 *
 * 🔴 Ele NÃO gera aqui dentro. Cada conta é despachada pra
 * `/api/cron/gerar-semanas/uma`, que tem os 300s dela. Gerar tudo nesta função
 * era o defeito: ~95s por conta contra um teto de 300s, então só as três
 * primeiras da ordem física recebiam e o resto ficava sem pacote, em silêncio.
 * Detalhe em lib/geracao/fila-semanal.ts.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const inicio = Date.now();
  const admin = createAdminClient();

  // Semana de referência = próxima segunda (da semana que vem)
  const d = new Date();
  const dayOfWeek = d.getDay();
  const diasAteSegunda = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7;
  d.setDate(d.getDate() + diasAteSegunda);
  const semanaRef = d.toISOString().slice(0, 10);

  // Pega franqueadas ativas com onboarding completo.
  // A ORDEM É EXPLÍCITA de propósito: sem `order`, o Postgres devolve a ordem
  // física da tabela, que joga quem entrou depois pro fim da fila.
  const { data: franqueadas, error: erroLista } = await admin
    .from("franqueadas")
    .select("id, nome_completo, email, criado_em")
    .eq("status", "ativo")
    .eq("onboarding_completo", true);

  if (erroLista) {
    console.error("[gerar-semanas] não deu pra ler as contas:", erroLista.message);
    return NextResponse.json({ erro: erroLista.message }, { status: 500 });
  }

  const fila = ordenarFila((franqueadas ?? []) as ContaDaFila[]);
  if (fila.length === 0) {
    return NextResponse.json({
      ok: true,
      semanaRef,
      processadas: 0,
      mensagem: "Nenhuma franqueada ativa",
    });
  }

  const origem = new URL(request.url).origin;
  const resultados: Resultado[] = [];

  // Pausa é POR CONTA: uma conta pausada nunca pode impedir o pacote das
  // outras — e sai da fila antes do despacho, pra não ocupar vaga no lote.
  const paraGerar: ContaDaFila[] = [];
  for (const conta of fila) {
    if (geracaoPausadaParaConta(conta.email)) {
      resultados.push({
        franqueadaId: conta.id,
        nome: conta.nome_completo,
        ok: true,
        total: 0,
        pausada: true,
      });
      continue;
    }
    paraGerar.push(conta);
  }

  const naoProcessadas: ContaDaFila[] = [];

  for (const lote of lotesDaFila(paraGerar, LOTE_PARALELO)) {
    if (!cabeMaisUmLote(Date.now() - inicio)) {
      naoProcessadas.push(...lote);
      continue;
    }
    const doLote = await Promise.all(
      lote.map((conta) => despachar(origem, conta, semanaRef)),
    );
    resultados.push(...doLote);
  }

  const aviso = avisoFilaCortada(naoProcessadas);
  if (aviso) console.error(`[gerar-semanas] ${aviso}`);

  const sucesso = resultados.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    semanaRef,
    processadas: resultados.length,
    sucesso,
    falhas: resultados.length - sucesso,
    nao_processadas: naoProcessadas.map((c) => ({ id: c.id, nome: c.nome_completo })),
    aviso,
    detalhes: resultados,
  });
}

/**
 * Manda a conta pra função filha. Se a filha não estiver disponível (deploy
 * a meio caminho, rota fora do ar), gera aqui mesmo — o comportamento antigo
 * é pior que o novo, mas é muito melhor que a conta ficar sem pacote.
 */
async function despachar(
  origem: string,
  conta: ContaDaFila,
  semanaRef: string,
): Promise<Resultado> {
  const base = {
    franqueadaId: conta.id,
    nome: conta.nome_completo,
  };
  try {
    const res = await fetch(`${origem}/api/cron/gerar-semanas/uma`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({ franqueadaId: conta.id, semanaRef }),
      cache: "no-store",
    });

    if (filhaIndisponivel(res.status)) {
      console.warn(
        `[gerar-semanas] filha indisponível (${res.status}) — gerando inline ${conta.email ?? conta.id}`,
      );
      const r = await gerarPostsDaSemana(conta.id, semanaRef);
      return { ...base, ok: r.ok, total: r.total, erro: r.erro, inline: true };
    }

    const r = (await res.json()) as { ok?: boolean; total?: number; erro?: string };
    console.log(
      `[gerar-semanas] ${conta.email ?? conta.id} ok=${r.ok} total=${r.total ?? 0}` +
        (r.erro ? ` erro=${r.erro}` : ""),
    );
    return { ...base, ok: !!r.ok, total: r.total, erro: r.erro };
  } catch (e) {
    const erro = (e as Error).message;
    console.error(`[gerar-semanas] falhou ${conta.email ?? conta.id}: ${erro}`);
    return { ...base, ok: false, erro };
  }
}
