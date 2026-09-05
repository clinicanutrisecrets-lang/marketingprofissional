"use server";

import { revalidatePath } from "next/cache";
import { createAlineClient, createClient } from "@/lib/supabase/server";
import { CONFIG_PADRAO, lerConfig, lerDirecionamentos, normalizarUsername, type AutomacaoConfig } from "./config";

async function exigirSessao() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Entre de novo.");
}

async function perfilId(slug: string): Promise<string> {
  const aline = createAlineClient();
  const { data } = await aline.from("perfis").select("id").eq("slug", slug).maybeSingle();
  const id = (data as { id?: string } | null)?.id;
  if (!id) throw new Error(`Perfil '${slug}' não encontrado`);
  return id;
}

function lista(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function texto(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export async function salvarConfigAutomacao(slug: string, form: FormData): Promise<void> {
  await exigirSessao();
  const aline = createAlineClient();
  const { data: atualRow } = await aline.from("perfis").select("automacao_config").eq("slug", slug).maybeSingle();
  const atual = lerConfig((atualRow as { automacao_config?: unknown } | null)?.automacao_config);
  const config: AutomacaoConfig = {
    ...atual,
    agradecer_comentarios: form.get("agradecer_comentarios") === "on",
    responder_dm_scanner: form.get("responder_dm_scanner") === "on",
    texto_convite_direct: texto(form.get("texto_convite_direct")) ?? CONFIG_PADRAO.texto_convite_direct,
    texto_encaminhar_humano: texto(form.get("texto_encaminhar_humano")) ?? CONFIG_PADRAO.texto_encaminhar_humano,
    nao_responder_usernames: lista(form.get("nao_responder_usernames")).map(normalizarUsername).filter(Boolean),
    voz: texto(form.get("voz")) ?? "",
    instrucoes_etica: texto(form.get("instrucoes_etica")) ?? "",
    direcionamentos: lerDirecionamentos(String(form.get("direcionamentos") ?? "")),
    publicar_posts: form.get("publicar_posts") === "on",
    gerar_posts_semanal: form.get("gerar_posts_semanal") === "on",
  };
  const { error } = await aline.from("perfis").update({ automacao_config: config }).eq("slug", slug);
  if (error) throw new Error(error.message);
  revalidatePath(`/perfis/${slug}/automacoes`);
}

export async function salvarRegra(slug: string, form: FormData): Promise<void> {
  await exigirSessao();
  const aline = createAlineClient();
  const pid = await perfilId(slug);
  const id = texto(form.get("id"));
  const gatilho = String(form.get("gatilho") ?? "comentario");
  if (!["comentario", "dm", "story_reply", "story_mention"].includes(gatilho)) throw new Error("Gatilho inválido");
  // Botões: uma linha por botão — "Rótulo | resposta | tags | nome da sequência"
  const { data: seqs } = await aline.from("ig_sequencias").select("id, nome").eq("perfil_id", pid);
  const seqPorNome = new Map(((seqs ?? []) as Array<{ id: string; nome: string }>).map((s) => [s.nome.trim().toLowerCase(), s.id]));
  const opcoes = String(form.get("opcoes") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [rotulo = "", resposta = "", tags = "", seq = ""] = l.split("|").map((x) => x.trim());
      const sequencia_id = seq ? (seqPorNome.get(seq.toLowerCase()) ?? null) : null;
      if (seq && !sequencia_id) throw new Error(`Botão "${rotulo}": sequência "${seq}" não existe.`);
      return { rotulo, resposta, tags: lista(tags), sequencia_id };
    })
    .filter((o) => o.rotulo && o.resposta);
  if (opcoes.length > 3) throw new Error("No máximo 3 botões por regra (limite pra caber na tela do Instagram).");
  for (const o of opcoes) {
    if (o.rotulo.length > 20) throw new Error(`Botão "${o.rotulo}" tem mais de 20 caracteres (limite do Instagram).`);
  }

  const linha = {
    perfil_id: pid,
    nome: texto(form.get("nome")) ?? "Regra sem nome",
    ativa: form.get("ativa") !== "off",
    gatilho,
    palavras_chave: lista(form.get("palavras_chave")),
    media_ids: gatilho === "comentario" ? lista(form.get("media_ids")) : [],
    resposta_publica: gatilho === "comentario" ? texto(form.get("resposta_publica")) : null,
    resposta_privada: texto(form.get("resposta_privada")),
    sequencia_id: texto(form.get("sequencia_id")),
    tags_adicionar: lista(form.get("tags_adicionar")),
    uma_vez_por_contato: form.get("uma_vez_por_contato") === "on",
    prioridade: Number(form.get("prioridade") ?? 100) || 100,
    opcoes,
  };
  if (!linha.resposta_publica && !linha.resposta_privada && !linha.sequencia_id && linha.tags_adicionar.length === 0) {
    throw new Error("A regra precisa fazer alguma coisa: resposta pública, resposta privada, sequência ou tag.");
  }
  if (opcoes.length > 0 && !linha.resposta_privada) {
    throw new Error("Botões precisam de uma pergunta na resposta do direct (ex.: \"Antes de te mandar, me conta: você é nutricionista?\").");
  }
  const q = id ? aline.from("ig_regras").update(linha).eq("id", id).eq("perfil_id", pid) : aline.from("ig_regras").insert(linha);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath(`/perfis/${slug}/automacoes`);
}

export async function alternarRegra(slug: string, id: string, ativa: boolean): Promise<void> {
  await exigirSessao();
  const aline = createAlineClient();
  await aline.from("ig_regras").update({ ativa }).eq("id", id);
  revalidatePath(`/perfis/${slug}/automacoes`);
}

export async function excluirRegra(slug: string, id: string): Promise<void> {
  await exigirSessao();
  const aline = createAlineClient();
  await aline.from("ig_regras").delete().eq("id", id);
  revalidatePath(`/perfis/${slug}/automacoes`);
}

/**
 * Sequência: uma linha por passo no textarea, no formato
 *   <atraso em minutos> | <texto>
 * Ex.: "0 | Oi, {primeiro_nome}! Segue o e-book: https://…"
 *      "1440 | Conseguiu ler? Qualquer dúvida me chama aqui."
 */
export async function salvarSequencia(slug: string, form: FormData): Promise<void> {
  await exigirSessao();
  const aline = createAlineClient();
  const pid = await perfilId(slug);
  const id = texto(form.get("id"));
  const nome = texto(form.get("nome")) ?? "Sequência";
  const passos = String(form.get("passos") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      // "minutos | texto || Rótulo -> resposta ;; Rótulo -> resposta"
      const [corpo, botoesBruto = ""] = l.split("||").map((x) => x.trim());
      const m = corpo.match(/^(\d+)\s*\|\s*(.+)$/);
      const base = m
        ? { ordem: i + 1, atraso_minutos: Number(m[1]), texto: m[2].trim() }
        : { ordem: i + 1, atraso_minutos: 0, texto: corpo };
      const opcoes = botoesBruto
        .split(";;")
        .map((b) => b.trim())
        .filter(Boolean)
        .map((b) => {
          const mm = b.match(/^(.+?)\s*->\s*(.+)$/);
          if (!mm) throw new Error(`Botão do passo ${i + 1} sem "->": "${b}"`);
          const rotulo = mm[1].trim();
          if (rotulo.length > 20) throw new Error(`Botão "${rotulo}" tem mais de 20 caracteres (limite do Instagram).`);
          return { rotulo, resposta: mm[2].trim(), tags: [], sequencia_id: null };
        });
      if (opcoes.length > 3) throw new Error(`Passo ${i + 1}: no máximo 3 botões.`);
      return { ...base, opcoes };
    });
  if (passos.length === 0) throw new Error("A sequência precisa de pelo menos um passo.");

  let seqId = id;
  if (seqId) {
    const { error } = await aline.from("ig_sequencias").update({ nome }).eq("id", seqId).eq("perfil_id", pid);
    if (error) throw new Error(error.message);
    await aline.from("ig_sequencia_passos").delete().eq("sequencia_id", seqId);
  } else {
    const { data, error } = await aline.from("ig_sequencias").insert({ perfil_id: pid, nome }).select("id").single();
    if (error) throw new Error(error.message);
    seqId = (data as { id: string }).id;
  }
  const { error: pErr } = await aline
    .from("ig_sequencia_passos")
    .insert(passos.map((p) => ({ ...p, sequencia_id: seqId })));
  if (pErr) throw new Error(pErr.message);
  revalidatePath(`/perfis/${slug}/automacoes`);
}

export async function excluirSequencia(slug: string, id: string): Promise<void> {
  await exigirSessao();
  const aline = createAlineClient();
  await aline.from("ig_sequencias").delete().eq("id", id);
  revalidatePath(`/perfis/${slug}/automacoes`);
}

export async function marcarContatoAtendido(slug: string, contatoId: string): Promise<void> {
  await exigirSessao();
  const aline = createAlineClient();
  await aline.from("ig_contatos").update({ precisa_humano: false, precisa_humano_motivo: null }).eq("id", contatoId);
  revalidatePath(`/perfis/${slug}/automacoes`);
}

export async function alternarSilenciarContato(slug: string, contatoId: string, silenciado: boolean): Promise<void> {
  await exigirSessao();
  const aline = createAlineClient();
  await aline.from("ig_contatos").update({ silenciado }).eq("id", contatoId);
  revalidatePath(`/perfis/${slug}/automacoes`);
}

export type EstadoSimulacao = { resultado?: import("./simulador").ResultadoSimulacao; erro?: string } | null;

export async function simularRobo(slug: string, _prev: EstadoSimulacao, form: FormData): Promise<EstadoSimulacao> {
  await exigirSessao();
  const gatilho = String(form.get("gatilho") ?? "comentario");
  if (!["comentario", "dm", "story_reply", "story_mention"].includes(gatilho)) return { erro: "Gatilho inválido" };
  const textoEv = String(form.get("texto") ?? "").trim();
  if (!textoEv) return { erro: "Escreva o comentário ou a mensagem." };
  try {
    const { simularEvento } = await import("./simulador");
    const resultado = await simularEvento({
      slug,
      gatilho: gatilho as "comentario" | "dm" | "story_reply" | "story_mention",
      texto: textoEv,
      mediaId: texto(form.get("media_id")),
    });
    return { resultado };
  } catch (e) {
    return { erro: (e as Error).message };
  }
}

export type EstadoVoz = { voz?: string; legendas?: number; respostas?: number; erro?: string } | null;

export async function mapearVozAction(slug: string, _prev: EstadoVoz, _form: FormData): Promise<EstadoVoz> {
  await exigirSessao();
  try {
    const { mapearVoz } = await import("./mapear-voz");
    const r = await mapearVoz(slug);
    revalidatePath(`/perfis/${slug}/automacoes`);
    return r;
  } catch (e) {
    return { erro: (e as Error).message };
  }
}
