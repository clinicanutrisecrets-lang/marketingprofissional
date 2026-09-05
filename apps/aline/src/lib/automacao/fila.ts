/**
 * Fila de envios do robô (sequências e respostas agendadas) + renovação de
 * token. Roda no cron /api/cron/instagram-fila.
 */

import { createAlineClient } from "@/lib/supabase/server";
import { enviarDm, respostaPrivadaComentario, responderComentario, renovarTokenLongo } from "@/lib/instagram/api";
import { carregarPerfilPorId, credenciaisDoPerfil, salvarTokenRenovado } from "@/lib/instagram/credenciais";
import { janela24hAberta, preencherTexto } from "./regras";

type Passo = { ordem: number; atraso_minutos: number; texto: string };

export async function enfileirarSequencia(params: {
  perfilId: string;
  contatoId: string;
  igsid: string;
  sequenciaId: string;
  regraId?: string | null;
  vars: { nome?: string | null; username?: string | null };
}): Promise<number> {
  const aline = createAlineClient();
  const { data: seq } = await aline
    .from("ig_sequencias")
    .select("id, ativa")
    .eq("id", params.sequenciaId)
    .maybeSingle();
  if (!seq || (seq as { ativa: boolean }).ativa === false) return 0;

  const { data: passosData, error } = await aline
    .from("ig_sequencia_passos")
    .select("ordem, atraso_minutos, texto")
    .eq("sequencia_id", params.sequenciaId)
    .order("ordem", { ascending: true });
  if (error) throw new Error(`passos: ${error.message}`);
  const passos = (passosData ?? []) as Passo[];
  if (passos.length === 0) return 0;

  // Contato já dentro desta sequência não entra de novo (evita DM em dobro).
  const { count } = await aline
    .from("ig_fila")
    .select("id", { count: "exact", head: true })
    .eq("contato_id", params.contatoId)
    .eq("sequencia_id", params.sequenciaId)
    .eq("status", "pendente");
  if ((count ?? 0) > 0) return 0;

  let acumuladoMin = 0;
  const linhas = passos.map((p) => {
    acumuladoMin += Math.max(0, p.atraso_minutos);
    return {
      perfil_id: params.perfilId,
      contato_id: params.contatoId,
      tipo: "dm",
      destino: params.igsid,
      texto: preencherTexto(p.texto, params.vars),
      enviar_em: new Date(Date.now() + acumuladoMin * 60_000).toISOString(),
      sequencia_id: params.sequenciaId,
      passo_ordem: p.ordem,
      regra_id: params.regraId ?? null,
    };
  });
  const { error: insErr } = await aline.from("ig_fila").insert(linhas);
  if (insErr) throw new Error(`ig_fila: ${insErr.message}`);
  return linhas.length;
}

type ItemFila = {
  id: string;
  perfil_id: string;
  contato_id: string;
  tipo: "dm" | "private_reply" | "comment_reply";
  destino: string;
  texto: string;
  sequencia_id: string | null;
  regra_id: string | null;
};

export async function processarFila(limite = 40): Promise<{ enviados: number; cancelados: number; falhas: number }> {
  const aline = createAlineClient();
  const { data, error } = await aline
    .from("ig_fila")
    .select("id, perfil_id, contato_id, tipo, destino, texto, sequencia_id, regra_id")
    .eq("status", "pendente")
    .lte("enviar_em", new Date().toISOString())
    .order("enviar_em", { ascending: true })
    .limit(limite);
  if (error) throw new Error(`ig_fila: ${error.message}`);
  const itens = (data ?? []) as ItemFila[];
  const resumo = { enviados: 0, cancelados: 0, falhas: 0 };

  const credCache = new Map<string, Awaited<ReturnType<typeof credenciaisDoPerfil>>>();

  for (const item of itens) {
    try {
      let acesso = credCache.get(item.perfil_id);
      if (!acesso) {
        const perfil = await carregarPerfilPorId(item.perfil_id);
        acesso = perfil ? await credenciaisDoPerfil(perfil) : { cred: null, motivo: "perfil não encontrado" };
        credCache.set(item.perfil_id, acesso);
      }
      if (!acesso.cred) {
        await marcar(item.id, "falhou", acesso.motivo);
        resumo.falhas++;
        continue;
      }

      const { data: contato } = await aline
        .from("ig_contatos")
        .select("ultima_msg_recebida_em, silenciado")
        .eq("id", item.contato_id)
        .maybeSingle();
      const c = contato as { ultima_msg_recebida_em: string | null; silenciado: boolean } | null;

      if (c?.silenciado) {
        await marcar(item.id, "cancelado", "contato silenciado");
        resumo.cancelados++;
        continue;
      }
      if (item.tipo === "dm" && !janela24hAberta(c?.ultima_msg_recebida_em)) {
        // Regra da Meta: DM só dentro de 24h da última mensagem da pessoa.
        await marcar(item.id, "cancelado", "janela_24h fechada");
        await cancelarRestoDaSequencia(item);
        resumo.cancelados++;
        continue;
      }

      if (item.tipo === "dm") await enviarDm(acesso.cred, item.destino, item.texto);
      else if (item.tipo === "private_reply") await respostaPrivadaComentario(acesso.cred, item.destino, item.texto);
      else await responderComentario(acesso.cred, item.destino, item.texto);

      await marcar(item.id, "enviado");
      await aline.from("ig_mensagens").insert({
        perfil_id: item.perfil_id,
        contato_id: item.contato_id,
        canal: item.tipo === "comment_reply" ? "comentario" : "dm",
        direcao: "saida",
        texto: item.texto,
        origem: item.sequencia_id ? "sequencia" : "regra",
        regra_id: item.regra_id,
      });
      resumo.enviados++;
    } catch (e) {
      const msg = (e as Error).message;
      console.error("[automacao/fila] falha ao enviar", item.id, msg);
      await marcar(item.id, "falhou", msg.slice(0, 500));
      resumo.falhas++;
    }
  }
  return resumo;

  async function marcar(id: string, status: string, erro?: string) {
    await aline
      .from("ig_fila")
      .update({ status, erro: erro ?? null, enviado_em: status === "enviado" ? new Date().toISOString() : null })
      .eq("id", id);
  }

  async function cancelarRestoDaSequencia(item: ItemFila) {
    if (!item.sequencia_id) return;
    await aline
      .from("ig_fila")
      .update({ status: "cancelado", erro: "janela_24h fechada" })
      .eq("contato_id", item.contato_id)
      .eq("sequencia_id", item.sequencia_id)
      .eq("status", "pendente");
  }
}

/** Token do login do Instagram dura 60 dias; renova quando faltar menos de 10. */
export async function renovarTokensVencendo(): Promise<{ renovados: number; falhas: number }> {
  const aline = createAlineClient();
  const limite = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();
  const { data } = await aline
    .from("perfis")
    .select("id, slug")
    .eq("instagram_login_tipo", "instagram")
    .not("instagram_access_token", "is", null)
    .lte("instagram_token_expiry", limite);
  const resumo = { renovados: 0, falhas: 0 };
  for (const p of (data ?? []) as Array<{ id: string; slug: string }>) {
    try {
      const perfil = await carregarPerfilPorId(p.id);
      if (!perfil) continue;
      const acesso = await credenciaisDoPerfil(perfil);
      if (!acesso.cred) continue;
      const novo = await renovarTokenLongo(acesso.cred.token);
      await salvarTokenRenovado(p.id, novo.access_token, new Date(Date.now() + novo.expires_in * 1000));
      resumo.renovados++;
    } catch (e) {
      console.error("[automacao/token] renovação falhou", p.slug, (e as Error).message);
      resumo.falhas++;
    }
  }
  return resumo;
}
