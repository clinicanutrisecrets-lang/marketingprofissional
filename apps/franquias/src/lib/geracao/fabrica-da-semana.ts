import type { createAdminClient } from "@/lib/supabase/server";
import { PAPEL_POST_FIXO } from "@/lib/geracao/post-fixo";
import {
  PAPEL_FABRICA,
  LEMBRETE_FABRICA,
  LEGENDA_FABRICA,
  HASHTAGS_FABRICA,
  personalizacaoFabrica,
} from "@/lib/geracao/fabrica";

type Admin = ReturnType<typeof createAdminClient>;

const REPO = "clinicanutrisecrets-lang/marketingprofissional";

/**
 * O 2º post fixo (lib/geracao/fabrica.ts), na semana SEGUINTE à do 1º.
 * Best-effort: o pacote da semana nunca falha por ele.
 *
 * 🔴 Só entra quando o post fixo da consulta já saiu numa semana ANTERIOR
 * (Aline 15/10: "na segunda semana, porque daí a pessoa absorve tudo da
 * primeira"). E só uma vez: post da Fábrica em qualquer status que não seja
 * erro/cancelado já conta. Erro ao ler a contagem NÃO gera o post.
 *
 * O post nasce em 'gerando' e o worker (.github/workflows/render-carrossel-fabrica.yml)
 * desenha os slides e o vira em 'aguardando_aprovacao'.
 */
export async function montarFabricaDaSemana(p: {
  admin: Admin;
  franqueadaId: string;
  franqueada: Record<string, unknown>;
  aprovacaoId: string;
  semanaRef: string;
  logoUrl: string | null;
  fotoUrl: string | null;
}): Promise<{ ok: true; gerados: number } | { ok: false; motivo: string }> {
  const { admin, franqueadaId, franqueada, aprovacaoId, semanaRef } = p;
  try {
    const { count: fixoAntes, error: e1 } = await admin
      .from("posts_agendados")
      .select("id", { count: "exact", head: true })
      .eq("franqueada_id", franqueadaId)
      .eq("papel_estrategia", PAPEL_POST_FIXO)
      .lt("semana_ref", semanaRef);
    if (e1) return { ok: false, motivo: `contagem do post fixo: ${e1.message}` };
    if ((fixoAntes ?? 0) === 0) return { ok: true, gerados: 0 };

    const { count: jaTem, error: e2 } = await admin
      .from("posts_agendados")
      .select("id", { count: "exact", head: true })
      .eq("franqueada_id", franqueadaId)
      .eq("papel_estrategia", PAPEL_FABRICA)
      .not("status", "in", "(erro,cancelado)");
    if (e2) return { ok: false, motivo: `contagem da Fábrica: ${e2.message}` };
    if ((jaTem ?? 0) > 0) return { ok: true, gerados: 0 };

    const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) return { ok: false, motivo: "falta GITHUB_ACTIONS_TOKEN" };

    const spec = personalizacaoFabrica({
      nome: (franqueada.nome_completo as string) ?? (franqueada.nome_comercial as string) ?? null,
      handle: (franqueada.instagram_handle as string) ?? null,
      corPrimaria: (franqueada.cor_primaria_hex as string) ?? null,
      corSecundaria: (franqueada.cor_secundaria_hex as string) ?? null,
      textosDoPublico: textosDoPublico(franqueada),
      logo: p.logoUrl,
      foto: p.fotoUrl,
    });

    const { data: novo, error: errIns } = await admin
      .from("posts_agendados")
      .insert({
        franqueada_id: franqueadaId,
        aprovacao_semanal_id: aprovacaoId,
        semana_ref: semanaRef,
        tipo_post: "feed_carrossel",
        status: "gerando",
        origem: "ia_automatico",
        data_hora_agendada: primeiroDiaDaSemana(semanaRef, franqueada),
        copy_legenda: LEGENDA_FABRICA,
        copy_legenda_ia_original: LEGENDA_FABRICA,
        hashtags: HASHTAGS_FABRICA,
        hashtags_ia_original: HASHTAGS_FABRICA,
        papel_estrategia: PAPEL_FABRICA,
        lembrete_execucao: LEMBRETE_FABRICA,
        legenda_gerada_ia: false,
      } as never)
      .select("id")
      .single();
    if (errIns || !novo) return { ok: false, motivo: `insert: ${errIns?.message}` };
    const postId = (novo as { id: string }).id;

    const resp = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/render-carrossel-fabrica.yml/dispatches`, {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({
        ref: process.env.CORTE_IA_WORKFLOW_REF || "main",
        inputs: {
          post_id: postId,
          spec_b64: Buffer.from(JSON.stringify(spec), "utf8").toString("base64"),
          destino_prefix: `${franqueadaId}/fabrica/${postId}`,
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        },
      }),
    });
    if (!resp.ok) {
      const corpo = await resp.text().catch(() => "");
      // 'erro' libera a próxima semana a tentar de novo (a contagem ignora erro).
      await admin.from("posts_agendados").update({ status: "erro" } as never).eq("id", postId);
      return { ok: false, motivo: `worker ${resp.status}: ${corpo.slice(0, 160)}` };
    }
    console.log("[semanal] carrossel da Fábrica disparado", franqueadaId, postId);
    return { ok: true, gerados: 1 };
  } catch (e) {
    return { ok: false, motivo: (e as Error).message };
  }
}

/** O que ela atende, em texto: queixas do questionário, depois nicho e público. */
export function textosDoPublico(f: Record<string, unknown>): string[] {
  const pb = f.publico_briefing as { queixas?: unknown } | null | undefined;
  const queixas = Array.isArray(pb?.queixas) ? (pb!.queixas as unknown[]).filter((q): q is string => typeof q === "string") : [];
  return [
    ...queixas,
    ((f.nicho_principal as string) ?? "").replace(/_/g, " "),
    (f.publico_alvo_descricao as string) ?? "",
  ].filter((t) => t.trim());
}

function primeiroDiaDaSemana(semanaRef: string, franqueada: Record<string, unknown>): string {
  const dias = ((franqueada.dias_post_semana as number[]) ?? [1, 3, 5]).slice().sort((a, b) => a - b);
  const horario = (franqueada.horario_preferido_post as string) ?? "08:00";
  const [h, m] = horario.split(":").map(Number);
  const d = new Date(semanaRef);
  const diff = ((dias[0] ?? 1) - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(h ?? 8, m ?? 0, 0, 0);
  return d.toISOString();
}
