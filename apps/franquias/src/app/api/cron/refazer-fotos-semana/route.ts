import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { geracaoPausadaParaConta } from "@/lib/features";
import { lerTextoArte, podeRedesenhar } from "@/lib/criativo/texto-arte-edicao";
import { desenharArteDoPost } from "@/lib/posts/redesenhar-arte";
import { montarPostFixoDaSemana } from "@/lib/geracao/post-fixo-da-semana";
import { buscarArquivoUrl } from "@/lib/arquivos/url-asset";
import { gerarPostsDaSemana } from "@/lib/geracao/semanal";
import { filhaIndisponivel } from "@/lib/geracao/fila-semanal";
import { olharArte } from "@/lib/revisor-arte/olhar";
import { achadosDoOlhar, decidirAcao, resumoAchados } from "@/lib/revisor-arte/regras";
import { logarCusto } from "@/lib/custos/log";
import { CLAUDE_MODEL_AGENTES } from "@/lib/claude/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * 🔴 TAREFA DE USO ÚNICO (Aline, 18/10/2026: "hoje é o dia que eles veem,
 * arruma de todos"). O pacote de domingo 18/10 (semana de 19/10) saiu com a
 * foto recortada numa faixa, e o post fixo do perfil não saiu (o véu da capa
 * quebrava no build; ver packages/ai-image/src/svg-sem-concatenacao.test.ts).
 *
 * A cada passada, até 20/10:
 *  1. redesenha, com o MESMO texto e a MESMA foto, todo post da semana que
 *     tem foto na arte e ainda espera aprovação (sem tocar no que a
 *     profissional editou, aprovou ou que já foi postado);
 *  2. monta o post fixo do perfil de quem tem o pacote da semana e não tem
 *     o fixo (a própria função garante "uma vez por conta");
 *  3. manda montar o pacote de quem ficou sem nenhum por falta de tempo.
 *
 * Idempotente: cada post refeito ganha uma linha `arte_foto_inteira` no
 * edicoes_log e não é refeito de novo. Depois de 20/10 não faz nada.
 * Remover a rota e a entrada do vercel.json na próxima mexida.
 */
const SEMANA = "2026-10-19";
const VALE_ATE = Date.parse("2026-10-21T03:00:00Z");
const MARCA = "arte_foto_inteira";
const ORCAMENTO_MS = 230_000;


/**
 * PROVA DO REVISOR DA ARTE (19/10/2026), uma vez só: o revisor olha 3 artes
 * cortadas do pacote de 18/10 (o resultado esperado é refazer) e 3 refeitas
 * (o esperado é ok). O resultado vai pro log `[prova-revisor-arte]`. Roda só
 * enquanto não houver custo `prova_revisor_arte` gravado.
 */
const PROVA = [
  { esperado: "refazer", path: "2e8d44ec-065b-4247-b3be-47d2a67f7c3a/ai-image/1792314136342_carrossel_1.png", texto: "O seu DNA não é a resposta. A leitura dele é.", assunto: "Consulta Nutrigenética (inclui o teste de DNA)" },
  { esperado: "refazer", path: "8af97c61-daed-46be-bdd5-6ffb0def2e70/ai-image/1792314124181_feed_imagem.png", texto: "Seu corpo é uma fábrica / E tem um setor que você nunca olhou", assunto: "Fábrica da Saúde" },
  { esperado: "refazer", path: "ba61aba1-e1da-4ce5-b2e1-d6c81ce379b8/ai-image/1792314084621_carrossel_1.png", texto: "Seu exame normal não explica o cansaço", assunto: "exame de sangue e genética" },
  { esperado: "ok", path: "ba61aba1-e1da-4ce5-b2e1-d6c81ce379b8/ai-image/1792353643958_carrossel_1.png", texto: "Seu exame normal não explica o cansaço", assunto: "exame de sangue e genética" },
  { esperado: "ok", path: "2e8d44ec-065b-4247-b3be-47d2a67f7c3a/ai-image/1792353705261_feed_imagem.png", texto: "Sua dor tem endereço / E ela não está onde você sente", assunto: "inflamação" },
  { esperado: "ok", path: "8af97c61-daed-46be-bdd5-6ffb0def2e70/ai-image/1792353761480_editorial_1.png", texto: "Consulta integrativa de precisão e excelência", assunto: "consulta integrativa" },
];

async function provaDoRevisor(admin: ReturnType<typeof createAdminClient>): Promise<string[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const { count, error } = await admin
    .from("custos_geracao")
    .select("id", { count: "exact", head: true })
    .eq("operacao", "prova_revisor_arte");
  if (error || (count ?? 0) > 0) return null;
  const linhas: string[] = [];
  for (const c of PROVA) {
    try {
      const { data, error: dErr } = await admin.storage.from("franqueadas-assets").download(c.path);
      if (dErr || !data) {
        linhas.push(`${c.path}: não baixou`);
        continue;
      }
      const r = await olharArte(Buffer.from(await data.arrayBuffer()), { texto: c.texto, assunto: c.assunto });
      await logarCusto({ servico: "claude", operacao: "prova_revisor_arte", modelo: CLAUDE_MODEL_AGENTES, uso: r.uso, sucesso: !!r.olhar, metadata: { path: c.path } });
      if (!r.olhar) {
        linhas.push(`${c.path}: sem leitura`);
        continue;
      }
      const achados = achadosDoOlhar(r.olhar);
      const acao = decidirAcao(achados, { temFoto: true, podeRefazer: true });
      const acertou = (acao === "refazer_sem_foto") === (c.esperado === "refazer");
      linhas.push(`${acertou ? "ACERTOU" : "ERROU"} esperado=${c.esperado} acao=${acao} nota=${r.olhar.nota} [${resumoAchados(achados)}] foto="${r.olhar.o_que_a_foto_mostra}" ${c.path}`);
    } catch (e) {
      linhas.push(`${c.path}: ${(e as Error).message}`);
    }
  }
  console.log("[prova-revisor-arte]", JSON.stringify(linhas));
  return linhas;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  if (Date.now() > VALE_ATE) return NextResponse.json({ ok: true, encerrada: true });

  const inicio = Date.now();
  const temTempo = () => Date.now() - inicio < ORCAMENTO_MS;
  const admin = createAdminClient();
  const origem = new URL(request.url).origin;

  const { data: contas, error: cErr } = await admin
    .from("franqueadas")
    .select("*")
    .eq("status", "ativo")
    .eq("onboarding_completo", true);
  if (cErr) return NextResponse.json({ erro: cErr.message }, { status: 500 });

  const { data: aprovs, error: aErr } = await admin
    .from("aprovacoes_semanais")
    .select("id, franqueada_id, status")
    .eq("semana_ref", SEMANA);
  if (aErr) return NextResponse.json({ erro: aErr.message }, { status: 500 });

  const { data: postsRaw, error: pErr } = await admin
    .from("posts_agendados")
    .select("id, franqueada_id, aprovacao_semanal_id, tipo_post, status, data_hora_postado, editado_pela_nutri, texto_arte, foto_arte_ref, edicoes_log")
    .eq("semana_ref", SEMANA);
  if (pErr) return NextResponse.json({ erro: pErr.message }, { status: 500 });
  const posts = (postsRaw ?? []) as Array<Record<string, unknown>>;

  // 3 (disparado primeiro: roda na função dela, com os 300s dela).
  const comPosts = new Set(posts.map((p) => p.franqueada_id as string));
  const semPacote = ((contas ?? []) as Array<Record<string, unknown>>).filter(
    (c) => !comPosts.has(c.id as string) && !geracaoPausadaParaConta(c.email as string | null),
  );
  const pacotes = Promise.all(
    semPacote.map(async (c) => {
      try {
        const res = await fetch(`${origem}/api/cron/gerar-semanas/uma`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${process.env.CRON_SECRET}` },
          body: JSON.stringify({ franqueadaId: c.id, semanaRef: SEMANA }),
          cache: "no-store",
        });
        // A URL da implantação pede login da Vercel (401 em 18/10): gera aqui
        // mesmo, como o cron de domingo faz quando a filha não responde.
        const r = (
          filhaIndisponivel(res.status)
            ? await gerarPostsDaSemana(c.id as string, SEMANA)
            : await res.json().catch(() => ({}))
        ) as { ok?: boolean; total?: number; erro?: string };
        return `${c.email}: ${r.ok ? `ok (${r.total ?? 0})` : r.erro ?? res.status}`;
      } catch (e) {
        return `${c.email}: ${(e as Error).message}`;
      }
    }),
  );

  // 1. Redesenho das artes com foto.
  const refeitos: string[] = [];
  const falhas: string[] = [];
  for (const p of posts) {
    if (!temTempo()) break;
    if (!p.foto_arte_ref || p.editado_pela_nutri || !podeRedesenhar(p)) continue;
    const log = Array.isArray(p.edicoes_log) ? (p.edicoes_log as Array<Record<string, unknown>>) : [];
    if (log.some((l) => l?.campo === MARCA)) continue;
    const pecas = lerTextoArte(p.texto_arte);
    if (!pecas) continue;
    try {
      const r = await desenharArteDoPost({
        admin,
        franqueadaId: p.franqueada_id as string,
        tipoPost: p.tipo_post as string,
        pecas,
        fotoRef: p.foto_arte_ref as string,
      });
      const { error } = await admin
        .from("posts_agendados")
        .update({
          url_imagem_final: r.urlImagem,
          ...(r.urlsSlides ? { urls_slides: r.urlsSlides } : {}),
          edicoes_log: [...log, { em: new Date().toISOString(), campo: MARCA }],
        })
        .eq("id", p.id as string)
        .eq("status", "aguardando_aprovacao");
      if (error) falhas.push(`${p.id}: ${error.message}`);
      else refeitos.push(p.id as string);
    } catch (e) {
      falhas.push(`${p.id}: ${(e as Error).message}`);
    }
  }

  // 2. Post fixo do perfil.
  const fixos: string[] = [];
  for (const a of (aprovs ?? []) as Array<{ id: string; franqueada_id: string; status: string | null }>) {
    if (!temTempo()) break;
    if (a.status === "recusada") continue;
    const f = ((contas ?? []) as Array<Record<string, unknown>>).find((c) => c.id === a.franqueada_id);
    if (!f) continue;
    const logoUrl = await buscarArquivoUrl(admin, a.franqueada_id, "logo_principal");
    const r = await montarPostFixoDaSemana({
      admin,
      franqueadaId: a.franqueada_id,
      franqueada: f,
      aprovacaoId: a.id,
      semanaRef: SEMANA,
      logoUrl: logoUrl ?? null,
    });
    fixos.push(`${f.email}: ${r.ok ? `gerados=${r.gerados}` : r.motivo}`);
  }

  const prova = temTempo() ? await provaDoRevisor(admin).catch(() => null) : null;
  const resumo = { ok: true, refeitos: refeitos.length, falhas, fixos, pacotes: await pacotes, prova };
  console.log("[refazer-fotos-semana]", JSON.stringify(resumo));
  return NextResponse.json(resumo);
}
