import "server-only";
import sharp from "sharp";
import { createClaude, CLAUDE_MODEL_AGENTES } from "@/lib/claude/client";
import { createAdminClient } from "@/lib/supabase/server";
import { logarCusto } from "@/lib/custos/log";
import { ASSUNTOS_FOTO, caminhoNoBucket, type AssuntoFoto } from "@/lib/geracao/fotos-banco";

/**
 * Descreve uma foto de "Minhas fotos" (Aline, 14/10/2026): o que aparece, os
 * assuntos (do vocabulário fechado de fotos-banco) e a altura do rosto, pra o
 * corte não cortar a cabeça. Uma leitura de imagem por foto, só uma vez.
 *
 * Falha nunca derruba nada: a foto segue no banco e é usada no rodízio, como
 * antes. A próxima montagem da semana tenta de novo.
 */
export type DescricaoFoto = { descricao: string; assuntos: AssuntoFoto[]; foco_y: number | null };

const FERRAMENTA = {
  name: "descrever_foto",
  description: "Descreve a foto para escolher em que slide de post ela combina.",
  input_schema: {
    type: "object" as const,
    properties: {
      descricao: { type: "string", description: "Uma frase curta, em português, do que aparece na foto." },
      assuntos: {
        type: "array",
        items: { type: "string", enum: [...ASSUNTOS_FOTO] },
        description:
          "Os assuntos que a foto MOSTRA de fato (de 1 a 4). profissional = a nutricionista aparece; atendimento = consulta com paciente; consultorio = ambiente sem gente; prato = comida pronta; ingrediente = alimento cru/feira; cozinha = preparando; kit = kit de teste; coleta = coletando amostra; exame = papéis, laudo ou tubos; suplemento; atividade = movimento/treino; bem_estar = descanso, sono, natureza.",
      },
      foco_y: {
        type: ["number", "null"],
        description:
          "Altura (0 = topo, 1 = base) do ponto que não pode sair num recorte: o rosto principal, ou a mão segurando o objeto. null se não houver pessoa nem objeto central.",
      },
    },
    required: ["descricao", "assuntos", "foco_y"],
  },
};

function validar(entrada: unknown): DescricaoFoto | null {
  const e = entrada as { descricao?: unknown; assuntos?: unknown; foco_y?: unknown };
  if (typeof e?.descricao !== "string") return null;
  const validos = new Set<string>(ASSUNTOS_FOTO);
  const assuntos = (Array.isArray(e.assuntos) ? e.assuntos : []).filter(
    (a): a is AssuntoFoto => typeof a === "string" && validos.has(a),
  );
  const f = typeof e.foco_y === "number" && e.foco_y >= 0 && e.foco_y <= 1 ? e.foco_y : null;
  return { descricao: e.descricao.slice(0, 300), assuntos: assuntos.slice(0, 4), foco_y: f };
}

export async function descreverImagem(buf: Buffer): Promise<{ resultado: DescricaoFoto | null; uso?: { in: number; out: number } }> {
  const jpg = await sharp(buf).rotate().resize(768, 768, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  const claude = createClaude();
  const r = await claude.messages.create({
    model: CLAUDE_MODEL_AGENTES,
    max_tokens: 400,
    tools: [FERRAMENTA],
    tool_choice: { type: "tool", name: FERRAMENTA.name },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpg.toString("base64") } },
          { type: "text", text: "Descreva esta foto do banco de fotos de uma nutricionista, para escolher em que post ela combina." },
        ],
      },
    ],
  });
  const bloco = r.content.find((b) => b.type === "tool_use") as { input?: unknown } | undefined;
  return {
    resultado: bloco ? validar(bloco.input) : null,
    uso: { in: r.usage?.input_tokens ?? 0, out: r.usage?.output_tokens ?? 0 },
  };
}

/** Descreve e grava uma foto do banco. Devolve o que gravou, ou null. */
export async function descreverEGravarFoto(
  foto: { id: string; url_storage: string; franqueada_id: string },
): Promise<DescricaoFoto | null> {
  const admin = createAdminClient();
  try {
    let buf: Buffer | null = null;
    const local = caminhoNoBucket(foto.url_storage);
    if (local) {
      const { data, error } = await admin.storage.from(local.bucket).download(local.path);
      if (!error && data) buf = Buffer.from(await data.arrayBuffer());
    } else {
      const res = await fetch(foto.url_storage, { signal: AbortSignal.timeout(10000) });
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    }
    if (!buf) {
      console.warn(`[descrever-foto] foto ${foto.id} não baixou`);
      return null;
    }
    const { resultado, uso } = await descreverImagem(buf);
    await logarCusto({
      franqueadaId: foto.franqueada_id,
      servico: "claude",
      operacao: "descrever_foto",
      modelo: CLAUDE_MODEL_AGENTES,
      uso: { input_tokens: uso?.in ?? 0, output_tokens: uso?.out ?? 0 },
      sucesso: !!resultado,
      metadata: { arquivo_id: foto.id },
    });
    if (!resultado) return null;
    const { error } = await admin
      .from("arquivos_franqueada")
      .update({
        assuntos: resultado.assuntos,
        descricao_auto: resultado.descricao,
        foco_y: resultado.foco_y,
        descrito_em: new Date().toISOString(),
      } as never)
      .eq("id", foto.id);
    if (error) {
      console.warn(`[descrever-foto] não gravou ${foto.id}:`, error.message);
      return null;
    }
    return resultado;
  } catch (e) {
    console.warn(`[descrever-foto] ${foto.id} falhou:`, (e as Error).message);
    return null;
  }
}
