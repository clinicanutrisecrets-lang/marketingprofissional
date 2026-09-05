/**
 * Simulador do robô: recebe um comentário/DM de mentira e mostra o que o robô
 * FARIA (regra escolhida, textos, sequência, tags), sem mandar nada pra Meta.
 * Reusa exatamente as mesmas funções do caminho real (regras, config, IA e
 * base do Scanner) — se aqui responde X, no ar responde X.
 */

import { createAlineClient } from "@/lib/supabase/server";
import { carregarPerfilPorSlug } from "@/lib/instagram/credenciais";
import { lerConfig } from "./config";
import { gerarAgradecimentoComentario, responderDmComScanner } from "./ia";
import { pareceClinico, pareceSpam, preencherTexto, selecionarRegra, type Gatilho, type Regra } from "./regras";
import { buscarConhecimentoScanner } from "./scanner-conhecimento";

export type ResultadoSimulacao = {
  regra: string | null;
  acoes: string[];
  avisos: string[];
};

export async function simularEvento(params: {
  slug: string;
  gatilho: Gatilho;
  texto: string;
  mediaId?: string | null;
  nome?: string | null;
}): Promise<ResultadoSimulacao> {
  const perfil = await carregarPerfilPorSlug(params.slug);
  if (!perfil) return { regra: null, acoes: [], avisos: ["Perfil não encontrado"] };
  const aline = createAlineClient();
  const config = lerConfig(perfil.automacao_config);
  const vars = { nome: params.nome ?? "Maria Teste", username: "maria.teste" };
  const acoes: string[] = [];
  const avisos: string[] = [];

  const { data } = await aline
    .from("ig_regras")
    .select("id, nome, ativa, gatilho, palavras_chave, media_ids, resposta_publica, resposta_privada, sequencia_id, tags_adicionar, uma_vez_por_contato, prioridade")
    .eq("perfil_id", perfil.id)
    .eq("ativa", true);
  const regras = (data ?? []) as Regra[];
  const regra = selecionarRegra({ gatilho: params.gatilho, texto: params.texto, mediaId: params.mediaId }, regras);

  if (regra) {
    if (params.gatilho === "comentario" && regra.resposta_publica) {
      acoes.push(`Responde no comentário: "${preencherTexto(regra.resposta_publica, vars)}"`);
    }
    if (regra.resposta_privada) {
      acoes.push(`Manda no direct: "${preencherTexto(regra.resposta_privada, vars)}"`);
    }
    if (regra.sequencia_id) {
      const { data: passos } = await aline
        .from("ig_sequencia_passos")
        .select("ordem, atraso_minutos, texto")
        .eq("sequencia_id", regra.sequencia_id)
        .order("ordem");
      const lista = (passos ?? []) as Array<{ ordem: number; atraso_minutos: number; texto: string }>;
      let acumulado = 0;
      for (const p of lista) {
        acumulado += p.atraso_minutos;
        acoes.push(`Sequência, passo ${p.ordem} (+${acumulado} min): "${preencherTexto(p.texto, vars)}"`);
      }
      if (params.gatilho === "comentario") {
        avisos.push("Sequência é DM: só sai se a pessoa responder no direct (janela de 24h da Meta). Comentário sozinho não abre a janela.");
      }
    }
    if (regra.tags_adicionar.length > 0) acoes.push(`Adiciona as tags: ${regra.tags_adicionar.join(", ")}`);
    if (regra.uma_vez_por_contato) avisos.push("Esta regra só dispara uma vez por pessoa.");
    return { regra: regra.nome, acoes, avisos };
  }

  if (params.gatilho === "comentario") {
    if (!config.agradecer_comentarios) return { regra: null, acoes: ["Nada: nenhuma regra casou e a chave 'agradecer comentários' está desligada."], avisos };
    if (pareceSpam(params.texto)) return { regra: null, acoes: ["Nada: parece spam."], avisos };
    if (pareceClinico(params.texto)) {
      return { regra: null, acoes: [`Responde no comentário (pergunta clínica → direct): "${preencherTexto(config.texto_convite_direct, vars)}"`], avisos };
    }
    const texto = await gerarAgradecimentoComentario({ perfil, comentario: params.texto, username: vars.username });
    return texto
      ? { regra: null, acoes: [`Responde no comentário (agradecimento gerado): "${texto}"`], avisos }
      : { regra: null, acoes: [], avisos: ["A geração do agradecimento falhou. Veja o log da Vercel."] };
  }

  if (params.gatilho === "dm") {
    if (!config.responder_dm_scanner) return { regra: null, acoes: ["Nada: nenhuma regra casou e a chave 'responder direct' está desligada."], avisos };
    const contexto = await buscarConhecimentoScanner(params.texto);
    if (!contexto.disponivel) avisos.push("Base do Scanner indisponível nesta simulação (segredo ou rede). A resposta saiu sem ela.");
    else avisos.push(`Base do Scanner: ${contexto.totalRegistros} registro(s) encontrados pra esta pergunta.`);
    const resp = await responderDmComScanner({
      perfil, historico: [], pergunta: params.texto, nomeContato: vars.nome,
      contextoScanner: contexto, textoEncaminharHumano: config.texto_encaminhar_humano,
    });
    if (!resp) return { regra: null, acoes: [], avisos: [...avisos, "A geração da resposta falhou. Veja o log da Vercel."] };
    acoes.push(`Manda no direct: "${resp.texto}"`);
    if (resp.encaminhar) acoes.push(`Marca o contato como "esperando uma pessoa"${resp.motivo ? ` (${resp.motivo})` : ""}.`);
    return { regra: null, acoes, avisos };
  }

  return { regra: null, acoes: ["Nada: story sem regra só fica registrado."], avisos };
}
