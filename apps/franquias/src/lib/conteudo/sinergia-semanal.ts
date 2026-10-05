import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createClaude, CLAUDE_MODEL_COPY, COMPLIANCE_CFN_BR, REGRA_SEM_TRAVESSAO } from "@/lib/claude/client";
import { comAgenteDeCopy, type PublicoDaCopy } from "@/lib/claude/copy-agent";
import { logarCusto } from "@/lib/custos/log";
import type { createAdminClient } from "@/lib/supabase/server";
import {
  conferirConteudo,
  GENES_SINERGIA,
  type ConteudoSinergia,
  type ReceitaSinergia,
} from "@/lib/geracao/sinergia";

const REPO = "clinicanutrisecrets-lang/marketingprofissional";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Busca no Scanner a receita da semana (foto + receita real), já fora das que
 * a conta usou. `texto` são as queixas e o público da conta: o Scanner lê o
 * tema dali.
 */
export async function buscarReceitaSinergia(p: {
  texto: string;
  usadas: string[];
  semente: string;
}): Promise<{ ok: true; receita: ReceitaSinergia } | { ok: false; motivo: string }> {
  const secret = process.env.MARKETING_WEBHOOK_SECRET;
  if (!secret) return { ok: false, motivo: "sem MARKETING_WEBHOOK_SECRET" };
  const base = process.env.SCANNER_SAAS_URL ?? "https://scannerdasaude.com";
  const q = new URLSearchParams({
    texto: p.texto.slice(0, 600),
    usadas: p.usadas.join(","),
    semente: p.semente,
  });
  try {
    const res = await fetch(`${base}/api/integrations/marketing/sinergia?${q}`, {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, motivo: `scanner_http_${res.status}` };
    const j = (await res.json()) as { receita?: ReceitaSinergia };
    if (!j.receita?.ingredientes?.length) return { ok: false, motivo: "receita vazia" };
    return { ok: true, receita: j.receita };
  } catch (e) {
    return { ok: false, motivo: `scanner_indisponivel: ${(e as Error).message}` };
  }
}

const TAREFA = `
TAREFA: escrever o carrossel de SINERGIA NUTRICIONAL da semana (7 slides) a partir de UMA receita real que vem no pedido.

Sinergia = nutrientes que rendem mais juntos, no mesmo prato. O carrossel mostra três nutrientes DA RECEITA, o que cada um faz, e onde cada um conversa com microbiota, nutrigenética e exame de sangue.

🔴 REGRAS DE FIDELIDADE (o post é rejeitado se violar):
- Os três nutrientes saem de ingredientes QUE ESTÃO na lista da receita. "onde" diz em qual ingrediente ("no salmão", "na lentilha"). Nunca cite ingrediente que não está na lista.
- Os passos resumem o MODO DE PREPARO que veio, na ordem, sem acrescentar etapa, ingrediente nem tempo que não esteja lá. Ignore texto que claramente não é desta receita (título de outra receita colado no fim).
- "ingredientes_idx": os ÍNDICES (começando em 0) das linhas da lista que vão no slide, até 6, pulando cabeçalho ("Ingredientes guacamole") e opcional. Você NÃO reescreve ingrediente.
- "titulo_receita": o título da receita com acentos e maiúsculas corrigidos. Só acento e maiúscula: mesmas palavras.
- Nutrigenética: cite UM gene por linha, só desta lista: ${GENES_SINERGIA.join(", ")}. Diga o que a variante muda no aproveitamento do nutriente, sem afirmar que a leitora tem a variante. Sem gene desta lista que faça sentido, deixe "nutrigenetica" vazio.
- Exame: nomes de marcadores que acompanham o nutriente (ex.: "Homocisteína e folato sérico"). SEM número, faixa ou unidade.
- Microbiota: só o que é estabelecido (fibra fermentada vira butirato, polifenol alimenta tal grupo). Sem nome de cepa inventado.
- Nada de dose, de "tome", de promessa de resultado, de cura, de "trata". Nome de doença só como referência, nunca afirmando que a leitora tem.
- "trocas": até 3 trocas de ingrediente com a mesma função no prato (ex.: "Sardinha no lugar do salmão"). Pode ficar vazio.

TAMANHOS MÁXIMOS (o slide tem espaço fixo): tema 60 · subtitulo 110 · trio 50 · explicacao 200 · nome 28 · onde 28 · texto do nutriente 180 · microbiota/nutrigenetica/exame 140 cada · passo 120 · troca 50 · fecho 70.

O TEMA puxa a queixa da conta quando a receita conversa com ela (ex.: "Sinergia nutricional para a saúde hormonal"); quando não conversa, fale do benefício da própria receita. Nunca force.

LEGENDA do post (Instagram): 4 a 7 parágrafos curtos, abre com gancho que funciona sem contexto, explica a sinergia em linguagem de leiga, termina convidando a salvar e compartilhar. "cta": uma frase curta de convite pra falar com a profissional. "hashtags": 6 a 10.

Responda APENAS JSON válido, sem markdown:
{"titulo_receita":"","tema":"","subtitulo":"","trio":"A • B • C","explicacao":"","nutrientes":[{"nome":"","onde":"","texto":"","microbiota":"","nutrigenetica":"","exame":""}],"ingredientes_idx":[0,1,2],"passos":["","",""],"trocas":[""],"fecho":"","legenda":"","cta":"","hashtags":[""]}
`;

export async function escreverSinergia(p: {
  franqueadaId: string;
  receita: ReceitaSinergia;
  nicho: string | null;
  /** O público declarado no onboarding: fronteira da copy ("não atende" vira proibição). */
  publico: PublicoDaCopy | null;
  publicoTexto: string | null;
  queixas: string | null;
}): Promise<{ ok: true; conteudo: ConteudoSinergia; avisos: string[] } | { ok: false; motivo: string }> {
  const system = comAgenteDeCopy(TAREFA, {
    publico: p.publico ?? undefined,
    extras: [COMPLIANCE_CFN_BR, REGRA_SEM_TRAVESSAO],
  });
  const pedido = {
    receita: {
      titulo: p.receita.titulo,
      tipo: p.receita.tipo,
      ingredientes: p.receita.ingredientes.map((l, i) => `${i}: ${l}`),
      modo_preparo: p.receita.modo_preparo,
      compostos_marcados_pela_curadoria: p.receita.compostos,
    },
    conta: { nicho: p.nicho, publico: p.publicoTexto, queixas_da_semana: p.queixas },
  };
  // Duas tentativas: a conferência recusa resposta fora do formato.
  let ultimo = "";
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const anthropic = createClaude();
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL_COPY,
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: JSON.stringify(pedido) }],
    });
    await logarCusto({
      franqueadaId: p.franqueadaId,
      servico: "claude",
      operacao: "sinergia_semanal",
      modelo: CLAUDE_MODEL_COPY,
      uso: msg.usage,
    });
    const texto = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const m = texto.match(/\{[\s\S]*\}/);
    if (!m) {
      ultimo = "sem JSON";
      continue;
    }
    let bruto: unknown;
    try {
      bruto = JSON.parse(m[0]);
    } catch {
      ultimo = "JSON inválido";
      continue;
    }
    const c = conferirConteudo(bruto, p.receita);
    if (c.ok) return c;
    ultimo = c.motivo;
  }
  return { ok: false, motivo: ultimo };
}

export type MarcaSinergia = {
  cor: string;
  cor2: string;
  logo_url: string | null;
  handle: string;
  rodape: string;
};

/** Dispara o worker que desenha os 7 slides e os 3 stories e liga aos posts. */
export async function dispararRenderSinergia(p: {
  franqueadaId: string;
  conteudo: ConteudoSinergia;
  fotoUrl: string;
  marca: MarcaSinergia;
  carrosselPostId: string;
  storyPostIds: string[];
}): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const token = process.env.GITHUB_ACTIONS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, motivo: "falta GITHUB_ACTIONS_TOKEN" };
  const payload = {
    conteudo: p.conteudo,
    foto_url: p.fotoUrl,
    marca: p.marca,
    destino: `${p.franqueadaId}/sinergia/${Date.now()}`,
    carrossel_post_id: p.carrosselPostId,
    story_post_ids: p.storyPostIds,
  };
  const resp = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/render-sinergia.yml/dispatches`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: process.env.CORTE_IA_WORKFLOW_REF || "main",
      inputs: {
        payload_b64: Buffer.from(JSON.stringify(payload)).toString("base64"),
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
        supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      },
    }),
  });
  if (!resp.ok) {
    const corpo = await resp.text().catch(() => "");
    return { ok: false, motivo: `worker ${resp.status}: ${corpo.slice(0, 120)}` };
  }
  return { ok: true };
}

/** Chaves de foto que a conta já usou, da mais antiga à mais nova. */
export async function chavesUsadas(admin: Admin, franqueadaId: string): Promise<string[]> {
  const { data } = await admin
    .from("posts_agendados")
    .select("sinergia_chave, criado_em")
    .eq("franqueada_id", franqueadaId)
    .not("sinergia_chave", "is", null)
    .order("criado_em", { ascending: true })
    .limit(500);
  const vistas = new Set<string>();
  for (const r of (data ?? []) as { sinergia_chave: string | null }[]) {
    if (r.sinergia_chave) vistas.add(r.sinergia_chave);
  }
  return [...vistas];
}
