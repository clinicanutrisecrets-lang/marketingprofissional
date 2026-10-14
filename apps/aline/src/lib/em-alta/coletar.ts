import Anthropic from "@anthropic-ai/sdk";
import { createAlineClient } from "@/lib/supabase/server";
import { createClaude } from "@/lib/claude/client";
import {
  BUSCAS_EM_ALTA, FERRAMENTA_RADAR, REGRAS_RADAR, lerRss, semRepetidas, urlBusca, validarTemas,
  type Manchete,
} from "./radar";

const MODEL = "claude-sonnet-4-5";

async function buscar(q: string): Promise<Manchete[]> {
  try {
    const r = await fetch(urlBusca(q), {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ScannerdaSaude/1.0)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    return lerRss(await r.text());
  } catch {
    return [];
  }
}

/** Manchetes do momento, sem repetição. Busca que falha só some da lista. */
export async function manchetesDoMomento(): Promise<Manchete[]> {
  const lotes = await Promise.all(BUSCAS_EM_ALTA.map(buscar));
  return semRepetidas(lotes.flat()).slice(0, 60);
}

/**
 * Monta o lote do dia de UM perfil: escolhe as manchetes pela leitura dele e
 * grava. Manchete já guardada (de outro dia) não entra de novo.
 */
export async function coletarTemasDoPerfil(
  perfil: { id: string; slug: string; publico_alvo: string | null },
  manchetes: Manchete[],
  hoje = new Date().toISOString().slice(0, 10),
): Promise<{ ok: true; novos: number } | { ok: false; erro: string }> {
  if (manchetes.length === 0) return { ok: false, erro: "nenhuma manchete coletada" };
  const aline = createAlineClient();
  const { data: ja } = await aline.from("temas_em_alta").select("manchete").eq("perfil_id", perfil.id);
  const vistas = new Set(((ja ?? []) as Array<{ manchete: string }>).map((r) => r.manchete));
  const candidatas = manchetes.filter((m) => !vistas.has(m.titulo));
  if (candidatas.length === 0) return { ok: true, novos: 0 };

  const profissional = perfil.slug === "scannerdasaude";
  const pedido = [
    REGRAS_RADAR,
    profissional
      ? "PÚBLICO DESTE PERFIL: profissionais da saúde. O ângulo é o que a colega faz com isso no consultório."
      : `PÚBLICO DESTE PERFIL: ${perfil.publico_alvo ?? "mulheres adultas que cuidam da saúde"}.`,
    "MANCHETES:",
    candidatas.map((m, i) => `${i + 1}. ${m.titulo}${m.fonte ? ` (${m.fonte})` : ""}`).join("\n"),
  ].join("\n\n");

  const msg = await createClaude().messages.create({
    model: MODEL,
    max_tokens: 2500,
    tools: [FERRAMENTA_RADAR as unknown as Anthropic.Tool],
    tool_choice: { type: "tool", name: FERRAMENTA_RADAR.name },
    messages: [{ role: "user", content: pedido }],
  });
  const bloco = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!bloco) return { ok: false, erro: msg.stop_reason === "max_tokens" ? "resposta cortada" : "ferramenta não usada" };
  const temas = validarTemas(bloco.input, candidatas);
  if (temas.length === 0) return { ok: true, novos: 0 };

  const { error } = await aline.from("temas_em_alta").upsert(
    temas.map((t) => ({
      perfil_id: perfil.id,
      data_ref: hoje,
      manchete: t.manchete.titulo,
      fonte: t.manchete.fonte || null,
      url: t.manchete.url || null,
      fato: t.fato,
      angulo: t.angulo,
      assunto: t.assunto,
      relevancia: t.relevancia,
    })),
    { onConflict: "perfil_id,manchete", ignoreDuplicates: true },
  );
  if (error) return { ok: false, erro: error.message };
  return { ok: true, novos: temas.length };
}
