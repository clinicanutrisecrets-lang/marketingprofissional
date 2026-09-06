/**
 * Raio-X do público: lê a conta do Instagram (posts + métricas, comentários,
 * conversas recentes do direct quando a API entrega) e escreve o que engaja,
 * o que o público precisa e ideias de posts. Guarda em aline.ig_analises.
 *
 * Nunca inventa número: tudo que vai pro relatório vem das tabelas lidas.
 * Sem a permissão de insights, usa curtidas e comentários e avisa.
 */

import { createAlineClient } from "@/lib/supabase/server";
import {
  insightsDaMidia,
  listarComentarios,
  listarConversas,
  listarMidiasDetalhadas,
  type InsightsMidia,
  type MidiaDetalhada,
} from "@/lib/instagram/api";
import { carregarPerfilPorSlug, credenciaisDoPerfil } from "@/lib/instagram/credenciais";
import { createClaude, CLAUDE_MODEL } from "@/lib/claude/scripts";
import { semTravessoes } from "@/lib/texto/sem-travessoes";
import { CLAUDE_MODEL_RAPIDO } from "./ia";

export type PostAnalisado = {
  id: string;
  permalink?: string;
  data?: string;
  /** Timestamp completo (ISO, com hora e fuso) — necessário pra medir melhor horário.
   *  `data` continua sendo só o dia, pra não quebrar quem já lê esse campo. */
  publicado_em?: string;
  formato: string; // Reel | Carrossel | Imagem | Vídeo
  legenda: string; // primeiras 140 letras
  curtidas: number;
  comentarios: number;
  alcance?: number;
  salvamentos?: number;
  compartilhamentos?: number;
  visualizacoes?: number;
  interacoes?: number;
};

export type TemaContado = { tema: string; quantidade: number; exemplos: string[] };

export type DadosRaioX = {
  gerado_em: string;
  posts: PostAnalisado[];
  insights_disponiveis: boolean;
  comentarios_lidos: number;
  temas_comentarios: TemaContado[];
  conversas_lidas: number;
  temas_dm: TemaContado[];
  por_formato: Array<{ formato: string; posts: number; media_curtidas: number; media_comentarios: number; media_salvamentos?: number; media_visualizacoes?: number }>;
};

export type ResultadoRaioX = { id: string; dados: DadosRaioX; relatorio: string; avisos: string[] };

function formatoDe(m: MidiaDetalhada): string {
  if (m.media_product_type === "REELS") return "Reel";
  if (m.media_type === "CAROUSEL_ALBUM") return "Carrossel";
  if (m.media_type === "VIDEO") return "Vídeo";
  return "Imagem";
}

function media(ns: Array<number | undefined>): number | undefined {
  const v = ns.filter((n): n is number => typeof n === "number");
  if (v.length === 0) return undefined;
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

/**
 * Corta texto por PONTO DE CÓDIGO, não por unidade UTF-16.
 *
 * `slice()` conta unidades de 16 bits, e emoji ocupa duas. Cortar no meio de um
 * deixa metade de um par substituto na string — que é JSON inválido e derruba a
 * chamada seguinte com "no low surrogate in string". Só aparecia em leitura
 * longa, porque com poucos posts a chance de o corte cair num emoji é pequena.
 */
export function cortarSeguro(texto: string, limite: number): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  const pontos = Array.from(limpo); // separa por ponto de código: emoji fica inteiro
  return pontos.length <= limite ? limpo : pontos.slice(0, limite).join("");
}

export async function gerarRaioXPublico(slug: string, limitePosts = 60): Promise<ResultadoRaioX> {
  const perfil = await carregarPerfilPorSlug(slug);
  if (!perfil) throw new Error("Perfil não encontrado");
  const acesso = await credenciaisDoPerfil(perfil);
  if (!acesso.cred) throw new Error(acesso.motivo);
  const cred = acesso.cred;
  const avisos: string[] = [];
  const dona = (perfil.instagram_username ?? perfil.instagram_handle).toLowerCase().replace(/^@/, "");

  // 1. Posts com contagens básicas
  const midias = await listarMidiasDetalhadas(cred, limitePosts);
  if (midias.length === 0) throw new Error("A conta não tem posts que a API consiga ler.");

  // 2. Métricas por post (precisa de instagram_business_manage_insights)
  let insightsDisponiveis = true;
  const insightsPorId = new Map<string, InsightsMidia>();
  for (const m of midias) {
    if (!insightsDisponiveis) break;
    try {
      insightsPorId.set(m.id, await insightsDaMidia(cred, m.id));
    } catch (e) {
      const msg = (e as Error).message;
      if (/permission|\(#10\)|\(#100\)|OAuthException/i.test(msg) && insightsPorId.size === 0) {
        insightsDisponiveis = false;
        avisos.push(
          "Salvamentos, compartilhamentos, alcance e visualizações não vieram: falta a permissão instagram_business_manage_insights no app da Meta (Permissões e recursos) e reconectar o Instagram. Usei curtidas e comentários.",
        );
      } else {
        console.warn("[raio-x] insights falhou pra", m.id, msg.slice(0, 160));
      }
    }
  }

  const posts: PostAnalisado[] = midias.map((m) => {
    const i = insightsPorId.get(m.id) ?? {};
    return {
      id: m.id,
      permalink: m.permalink,
      data: m.timestamp?.slice(0, 10),
      publicado_em: m.timestamp,
      formato: formatoDe(m),
      legenda: cortarSeguro(m.caption ?? "", 140),
      curtidas: m.like_count ?? i.likes ?? 0,
      comentarios: m.comments_count ?? i.comments ?? 0,
      alcance: i.reach,
      salvamentos: i.saved,
      compartilhamentos: i.shares,
      visualizacoes: i.views,
      interacoes: i.total_interactions,
    };
  });

  // 3. Comentários dos 15 posts mais comentados (texto de quem NÃO é a dona)
  const maisComentados = [...posts].sort((a, b) => b.comentarios - a.comentarios).slice(0, 15);
  const comentarios: string[] = [];
  for (const p of maisComentados) {
    if (p.comentarios === 0) continue;
    try {
      const lista = await listarComentarios(cred, p.id, 50);
      for (const c of lista) {
        if ((c.username ?? "").toLowerCase() !== dona && c.text?.trim()) comentarios.push(c.text.trim().slice(0, 300));
      }
    } catch (e) {
      console.warn("[raio-x] comentários falharam pra", p.id, (e as Error).message.slice(0, 120));
    }
    if (comentarios.length >= 300) break;
  }

  // 4. Conversas do direct (o que a API devolver; costuma ser parcial)
  const mensagensDm: string[] = [];
  let conversasLidas = 0;
  try {
    const conversas = await listarConversas(cred, 50);
    conversasLidas = conversas.length;
    for (const c of conversas) {
      for (const m of c.messages?.data ?? []) {
        if ((m.from?.username ?? "").toLowerCase() !== dona && m.from?.id !== perfil.instagram_user_id && m.message?.trim()) {
          mensagensDm.push(m.message.trim().slice(0, 300));
        }
      }
    }
    if (conversasLidas === 0) avisos.push("A API não devolveu conversas do direct para esta conta.");
  } catch (e) {
    avisos.push(`Conversas do direct não puderam ser lidas: ${(e as Error).message.slice(0, 160)}`);
  }

  // 5. Temas (classificação em lote, modelo rápido)
  const [temasComentarios, temasDm] = await Promise.all([
    classificarTemas(comentarios, "comentários em posts"),
    classificarTemas(mensagensDm, "mensagens no direct"),
  ]);

  // 6. Média por formato
  const formatos = Array.from(new Set(posts.map((p) => p.formato)));
  const porFormato = formatos.map((f) => {
    const ps = posts.filter((p) => p.formato === f);
    return {
      formato: f,
      posts: ps.length,
      media_curtidas: media(ps.map((p) => p.curtidas)) ?? 0,
      media_comentarios: media(ps.map((p) => p.comentarios)) ?? 0,
      media_salvamentos: media(ps.map((p) => p.salvamentos)),
      media_visualizacoes: media(ps.map((p) => p.visualizacoes)),
    };
  });

  const dados: DadosRaioX = {
    gerado_em: new Date().toISOString(),
    posts,
    insights_disponiveis: insightsDisponiveis,
    comentarios_lidos: comentarios.length,
    temas_comentarios: temasComentarios,
    conversas_lidas: conversasLidas,
    temas_dm: temasDm,
    por_formato: porFormato,
  };

  // 7. Relatório
  const relatorio = await escreverRelatorio(perfil.instagram_handle, dados);

  const aline = createAlineClient();
  const { data, error } = await aline
    .from("ig_analises")
    .insert({ perfil_id: perfil.id, tipo: "publico", dados, relatorio, avisos })
    .select("id")
    .single();
  if (error) throw new Error(`ig_analises: ${error.message}`);
  return { id: (data as { id: string }).id, dados, relatorio, avisos };
}

function textoDe(msg: { content: Array<{ type: string; text?: string }> }): string {
  return msg.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
}

async function classificarTemas(textos: string[], origem: string): Promise<TemaContado[]> {
  if (textos.length === 0) return [];
  const claude = createClaude();
  const amostra = textos.slice(0, 250);
  try {
    const msg = await claude.messages.create({
      model: CLAUDE_MODEL_RAPIDO,
      max_tokens: 1500,
      temperature: 0,
      system: `Você classifica ${origem} de um perfil de nutricionista no Instagram em TEMAS de necessidade do público.
Devolva JSON puro: {"temas":[{"tema":"<nome curto>","quantidade":<n>,"exemplos":["<até 3 textos literais curtos>"]}]}
Temas úteis (use só os que aparecem, crie outros se precisar): dúvida clínica individual, pedido de material/PDF, pedido de consulta ou preço, relato pessoal de sintoma, elogio/agradecimento, pergunta sobre teste genético, pergunta sobre microbiota, alimentação infantil, emagrecimento/GLP-1, hormônios/ciclo, profissional pedindo capacitação, spam/irrelevante.
A soma das quantidades deve bater com o total de textos. Exemplos são literais, sem inventar.`,
      messages: [{ role: "user", content: amostra.map((t, i) => `${i + 1}. ${t}`).join("\n") }],
    });
    const bruto = textoDe(msg);
    const ini = bruto.indexOf("{");
    const fim = bruto.lastIndexOf("}");
    const json = JSON.parse(bruto.slice(ini, fim + 1)) as { temas?: TemaContado[] };
    return (json.temas ?? [])
      .filter((t) => t && typeof t.tema === "string")
      .map((t) => ({ tema: t.tema, quantidade: Number(t.quantidade) || 0, exemplos: (t.exemplos ?? []).slice(0, 3).map(String) }))
      .sort((a, b) => b.quantidade - a.quantidade);
  } catch (e) {
    console.error("[raio-x] classificar temas falhou:", (e as Error).message);
    return [];
  }
}

async function escreverRelatorio(handle: string, d: DadosRaioX): Promise<string> {
  const claude = createClaude();
  const top = (chave: keyof PostAnalisado, n = 8) =>
    [...d.posts]
      .filter((p) => typeof p[chave] === "number")
      .sort((a, b) => (b[chave] as number) - (a[chave] as number))
      .slice(0, n)
      .map((p) => `- [${p.formato}, ${p.data}] ${chave}=${p[chave]} · "${p.legenda}"`)
      .join("\n");
  const blocos = [
    `PERFIL: @${handle}. Posts lidos: ${d.posts.length}. Insights ${d.insights_disponiveis ? "disponíveis" : "INDISPONÍVEIS (só curtidas e comentários)"}.`,
    `MÉDIA POR FORMATO:\n${d.por_formato.map((f) => `- ${f.formato}: ${f.posts} posts, ${f.media_curtidas} curtidas, ${f.media_comentarios} comentários${f.media_salvamentos != null ? `, ${f.media_salvamentos} salvamentos` : ""}${f.media_visualizacoes != null ? `, ${f.media_visualizacoes} visualizações` : ""} (médias)`).join("\n")}`,
    `TOP POR CURTIDAS:\n${top("curtidas")}`,
    `TOP POR COMENTÁRIOS:\n${top("comentarios")}`,
    d.insights_disponiveis ? `TOP POR SALVAMENTOS:\n${top("salvamentos")}` : "",
    d.insights_disponiveis ? `TOP POR COMPARTILHAMENTOS:\n${top("compartilhamentos")}` : "",
    d.insights_disponiveis ? `TOP POR VISUALIZAÇÕES:\n${top("visualizacoes")}` : "",
    `TEMAS DOS COMENTÁRIOS (${d.comentarios_lidos} lidos):\n${d.temas_comentarios.map((t) => `- ${t.tema}: ${t.quantidade} · ex.: ${t.exemplos.map((e) => `"${e}"`).join(" / ")}`).join("\n") || "(nenhum)"}`,
    `TEMAS DAS DMs (${d.conversas_lidas} conversas):\n${d.temas_dm.map((t) => `- ${t.tema}: ${t.quantidade} · ex.: ${t.exemplos.map((e) => `"${e}"`).join(" / ")}`).join("\n") || "(nenhuma lida)"}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const msg = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2500,
    temperature: 0.4,
    system: `Você é estrategista de conteúdo de uma nutricionista de precisão (nutrigenética, microbiota, exames) e escreve um raio-x do público dela a partir dos DADOS abaixo. Português do Brasil, sem travessão, direto.
REGRAS: cite só números que estão nos dados; se um dado não existe, diga que não veio. Nunca use as palavras "IA" ou "inteligência artificial". Processo funcional, nunca nome de doença como conclusão.
FORMATO (títulos curtos, listas):
1. Quem é esse público (2 a 4 linhas, a partir dos temas de comentários e DMs)
2. O que mais engaja (formato e tema, com os posts que provam)
3. O que engaja pouco (e uma hipótese do porquê)
4. Necessidades e dores que aparecem (com exemplos literais)
5. 10 ideias de posts novos: tema, formato, gancho de abertura e por que deve funcionar (ligado a um dado)
6. 3 oportunidades pro robô (regras de comentário/direct que valem criar, com a palavra-chave)`,
    messages: [{ role: "user", content: blocos }],
  });
  return semTravessoes(textoDe(msg));
}
