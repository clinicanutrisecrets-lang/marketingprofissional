"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-5";
const REPO = "clinicanutrisecrets-lang/marketingprofissional";

/**
 * Reel animado: o agente escreve o SPEC (formato Detetive da Saúde) e a
 * plataforma dispara o worker do GitHub Actions, que renderiza o MP4
 * (Python/PIL+ffmpeg, ~7-10 min) e sobe pro Storage. Status na tabela
 * reels_animados.
 *
 * Requer GITHUB_ACTIONS_TOKEN (PAT com Actions:write neste repo) na Vercel.
 */

const GLIFOS_VALIDOS = [
  "semente_abobora", "espinafre", "cacau", "ovo", "amendoa",
  "lentilha", "sardinha", "queijo", "brocolis",
];

const SYSTEM_SPEC = `
Você escreve SPECs de reels animados 9:16 no formato "Detetive da Saúde" para profissionais de saúde integrativa (nutricionistas, médicos, biomédicos etc.). NUNCA cite a profissão no texto das cenas — linguagem neutra de investigação. Saída: APENAS JSON válido, sem markdown.

FORMATO EXATO (siga à risca — o renderizador é rígido):
{
 "tema": "Nome curto do tema (1-3 palavras, vira o título gigante)",
 "cor_tema": "ROSE",   // uma de: AMBER CORAL MUSTARD TIFFANY ROXO ROSE
 "assinatura": "<vem no input>",
 "cenas": [
  {"tipo":"hook","dur":4.4,"l1":"Linha de gancho 1.","l2":"Linha de gancho 2."},
  {"tipo":"sintoma","dur":5.4,"cor":"AMBER","eyebrow":"sintoma 01","titulo":"Nome do sintoma","texto":"Descrição vívida do sintoma em 1-2 frases.","alvo":"neck","alvo_off":[-30,18],"card_y":960,"figura":{"eye":"open","brow_tilt":0.4}},
  {"tipo":"gene","dur":6.2,"cor":"MUSTARD","cor2":"AMBER","gene":"COMT","rs":"rs4680","texto":"Metáfora lúdica explicando o gene em 2 frases."},
  {"tipo":"sinergia","dur":10.6,"cor":"TIFFANY","titulo":"Título da sinergia","itens":[{"glifo":"espinafre","nome":"Espinafre cozido","qtd":"1 xícara","freq":"todos os dias"},{"glifo":"cacau","nome":"Cacau 70%","qtd":"20 g","freq":"todos os dias"},{"glifo":"ovo","nome":"Ovos","qtd":"2 unidades","freq":"5x por semana"}]},
  {"tipo":"nota","dur":6.6,"cor":"TIFFANY","glifos":["espinafre","cacau","ovo"],"texto":"Por que a combinação funciona, em 2 frases."},
  {"tipo":"marcadores","dur":7.0,"cor":"ROXO","eyebrow":"exame de sangue","titulo":"O que investigar","itens":[{"nome":"Ferritina","faixa":"ideal 70-150"},{"nome":"Vitamina D","faixa":"ideal 40-60"},{"nome":"TSH","faixa":"ideal < 2,5"}]},
  {"tipo":"virada","dur":5.0,"l1":"Primeira linha grande.","l2":"Segunda linha grande — o reenquadramento.","texto":"1-2 frases curtas que sustentam a virada."},
  {"tipo":"cta","dur":5.0,"l1":"Pergunta que convida a investigar.","acao1":"ME CHAMA NO DIRECT","l2":"Segunda pergunta, pra quem não vai agir agora.","acao2":"SALVE ESTE REEL"}
 ]
}

REGRAS DURAS:
- glifo/glifos: APENAS destes: ${GLIFOS_VALIDOS.join(", ")}. NUNCA invente outro.
- alvo: uma de: face, eyes, neck, chest, spine. São os pontos REAIS da figura no renderizador (spine = tronco/abdômen; use spine pra sintomas de barriga/quadril). NUNCA invente outro — "belly" já derrubou um render inteiro (18/08/2026).
- Duração 30s = 1 bloco sintoma→gene→sinergia→nota. 60s = 2 blocos. Sempre com hook no início e virada+cta no fim. Cena marcadores só na versão 60s (exatamente 3 itens).
- Genes reais com rsID correto. Sem promessa de cura (CFN): linguagem de investigação, não de tratamento.
- 🔴 A CENA "hook" PRECISA FUNCIONAR SEM CONTEXTO: escreva l1/l2 pensando em quem NUNCA VIU este perfil. Sem depender de post anterior, de série, de bordão ou de saber quem está falando; sem "como eu sempre digo" / "quem me acompanha sabe"; com promessa ESPECÍFICA e OBSERVÁVEL, que a pessoa confere na própria vida. Específico: "Seu exame veio normal e você continua cansada." Sensacionalista (NÃO usar): "o segredo que ninguém te conta". Nada de promessa de resultado.
- LINHA EDITORIAL: o pano de fundo é despertar consciência sobre NUTRIGENÉTICA e microbiota — quem assina o perfil é "detetive da saúde" e investiga com testes. A cena "virada" deve reenquadrar nessa direção — l1 e l2 são as DUAS linhas grandes (ex.: l1 "Não é força de vontade." / l2 "É informação que você ainda não investigou.") e "texto" é o parágrafo de apoio. A cena "cta" é a última e convida pra investigação: l1 é a pergunta principal (ex.: "Quer investigar sua saúde com precisão?") e acao1 a etiqueta em CAIXA ALTA ao lado do ícone de AVIÃO/enviar (ex.: "ME CHAMA NO DIRECT"); l2 é a segunda pergunta, pra quem ainda não vai agir agora (ex.: "Vai querer consultar isso depois?") e acao2 a etiqueta ao lado do ícone de MARCADOR/salvar (ex.: "SALVE ESTE REEL"). Cada etiqueta tem no máximo 18 caracteres e precisa combinar com o gesto do seu ícone. Varie as palavras a cada reel.
- Cores das cenas: varie entre AMBER, MUSTARD, TIFFANY, ROXO, ROSE, CORAL.
`.trim();

export async function gerarReelAnimadoAction(
  tema: string,
  duracao: "30s" | "60s",
): Promise<{ ok: boolean; msg: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, msg: "sessão inválida" };

  const { data: fr } = await supabase
    .from("franqueadas")
    .select("id, instagram_handle, nome_completo, crn_numero, crn_estado, nicho_principal, publico_alvo_descricao")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!fr) return { ok: false, msg: "perfil não encontrado" };
  const f = fr as {
    id: string; instagram_handle: string | null; nome_completo: string | null;
    crn_numero: string | null; crn_estado: string | null;
    nicho_principal: string | null; publico_alvo_descricao: string | null;
  };

  const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      ok: false,
      msg: "Worker de vídeo ainda não configurado (falta GITHUB_ACTIONS_TOKEN na Vercel).",
    };
  }
  if (!tema.trim()) return { ok: false, msg: "descreva o tema do reel" };

  // 1. Agente escreve o SPEC
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  // Assinatura neutra: nome + registro de conselho (sem presumir profissão)
  const assinatura = [
    f.nome_completo,
    f.crn_numero ? `CRN${f.crn_estado ?? ""} ${f.crn_numero}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_SPEC,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          tema,
          duracao,
          assinatura,
          nicho: f.nicho_principal,
          publico: f.publico_alvo_descricao,
        }),
      },
    ],
  });
  const texto = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const jsonMatch = texto.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { ok: false, msg: "agente não gerou o roteiro" };
  let spec: Record<string, unknown>;
  try {
    spec = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    return { ok: false, msg: "roteiro inválido — tente de novo" };
  }
  spec.assinatura = assinatura;

  // 2. Registra e dispara o worker
  const admin = createAdminClient();
  const { data: row, error: insErr } = await admin
    .from("reels_animados")
    .insert({ franqueada_id: f.id, tema, duracao } as never)
    .select("id")
    .single();
  if (insErr || !row) return { ok: false, msg: "falha ao registrar o reel" };
  const reelId = (row as { id: string }).id;

  const destino = `${f.id}/reels/${Date.now()}.mp4`;
  const handle = f.instagram_handle
    ? f.instagram_handle.startsWith("@")
      ? f.instagram_handle
      : `@${f.instagram_handle}`
    : "@nutri";

  const resp = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/render-reel.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          spec_b64: Buffer.from(JSON.stringify(spec)).toString("base64"),
          destino_path: destino,
          handle,
          reel_id: reelId,
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        },
      }),
    },
  );

  if (!resp.ok) {
    await admin.from("reels_animados").update({ status: "erro" } as never).eq("id", reelId);
    const corpo = await resp.text();
    return { ok: false, msg: `falha ao disparar o worker (${resp.status}): ${corpo.slice(0, 120)}` };
  }

  revalidatePath("/dashboard/conteudo");
  return {
    ok: true,
    msg: "🎬 Reel em produção! Fica pronto em ~10 minutos — recarregue a página pra acompanhar.",
  };
}
