import "server-only";

/**
 * Radar de pautas — busca manchetes recentes no Google News RSS (grátis,
 * sem chave) relacionadas ao nicho da nutricionista, para o agente de
 * conteúdo transformar notícia quente em pauta técnica de autoridade.
 *
 * Ex.: onda de notícias sobre câncer colorretal em famosos → pauta sobre
 * nutrigenética (família GST), crucíferas, fibras/Fusobacterium na
 * microbiota, chá verde, carne vermelha tostada.
 */

export type Manchete = {
  titulo: string;
  fonte: string;
  dataPub: string;
};

// 🔴 Rede genérica, usada só quando o nicho não resolve nada. NÃO coloque
// assunto de especialidade aqui: "saúde intestinal câncer" morava nesta lista
// e foi de onde saiu o post sobre câncer colorretal no perfil de uma
// profissional de saúde hormonal feminina (Juliana, 15/08). Assunto de
// oncologia pertence ao nicho de oncologia, e está lá embaixo.
const QUERIES_BASE = [
  "nutrição saúde estudo",
  "alimentação doença pesquisa",
  "microbiota intestinal",
  "nutrigenética alimentação estudo",
];

// Chaveado pelos valores REAIS do cadastro (NICHOS_OPCOES em
// lib/onboarding/steps.ts). O mapa antigo usava nomes livres ("hormonal",
// "intestinal", "oncologia") que não casavam com o que o onboarding grava:
// de 4 nichos em uso na base, 3 não davam match nenhum e caíam no genérico.
// Ao acrescentar nicho novo no onboarding, acrescente aqui também — sem isso
// a profissional recebe pauta de fora da área dela.
const QUERIES_POR_NICHO: Record<string, string[]> = {
  nutricao_funcional: ["nutrição funcional estudo", "inflamação crônica alimentação"],
  nutricao_esportiva: ["nutrição esportiva desempenho", "suplemento atleta estudo"],
  emagrecimento: ["obesidade estudo", "emagrecimento saúde metabolismo"],
  nutricao_oncologica: ["câncer prevenção alimentação", "oncologia nutrição estudo"],
  materno_infantil: ["alimentação infantil estudo", "nutrição gestante"],
  longevidade: ["longevidade alimentação estudo", "envelhecimento saudável pesquisa"],
  saude_feminina: ["saúde da mulher hormônios estudo", "endometriose SOP alimentação", "fertilidade nutrição pesquisa"],
  autoimune_intestino: ["doença autoimune alimentação", "microbioma intestino estudo"],
  // Chaves legadas — contas antigas gravaram esses valores.
  esportiva: ["nutrição esportiva desempenho", "suplemento atleta estudo"],
  infantil: ["alimentação infantil estudo", "seletividade alimentar criança"],
  hormonal: ["menopausa saúde estudo", "hormônios alimentação"],
  menopausa: ["menopausa saúde estudo", "climatério alimentação"],
  intestinal: ["microbioma intestino estudo", "probióticos pesquisa"],
  oncologia: ["câncer prevenção alimentação", "oncologia nutrição estudo"],
  autoimune: ["doença autoimune alimentação", "inflamação crônica estudo"],
  diabetes: ["diabetes alimentação estudo", "glicemia pesquisa"],
  nutrigenetica: ["genética saúde alimentação", "teste genético nutrição"],
  saude_integrativa: ["saúde integrativa estudo", "medicina integrativa alimentação"],
};


function extrairTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return (m?.[1] ?? "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

async function buscarRss(query: string): Promise<Manchete[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:14d&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ScannerdaSaude/1.0)" },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.split("<item>").slice(1, 8);
    return items.map((raw) => ({
      titulo: extrairTag(raw, "title"),
      fonte: extrairTag(raw, "source"),
      dataPub: extrairTag(raw, "pubDate"),
    })).filter((m) => m.titulo.length > 10);
  } catch {
    return [];
  }
}

export function nichoParaChaves(nicho: string): string[] {
  const n = nicho.toLowerCase().trim();
  // Exato primeiro: é o caso normal (o onboarding grava o valor da lista).
  if (QUERIES_POR_NICHO[n]) return [...QUERIES_POR_NICHO[n]];
  // Só então tenta por aproximação, pra contas antigas com texto livre.
  const chaves: string[] = [];
  for (const [k, qs] of Object.entries(QUERIES_POR_NICHO)) {
    if (n.includes(k.replace(/_/g, " ")) || n.includes(k)) chaves.push(...qs);
  }
  return chaves;
}

export { QUERIES_POR_NICHO };

/**
 * Busca manchetes dos últimos 14 dias para o nicho. Sempre retorna algo
 * (fallback: queries genéricas de nutrição). Nunca lança erro.
 */
export async function buscarPautasQuentes(params: {
  nichoPrincipal?: string | null;
  nichoSecundario?: string | null;
}): Promise<Manchete[]> {
  // 🔴 Genérico é FALLBACK, nunca tempero (Aline 2026-08-21): as duas buscas
  // genéricas entravam pra TODO nicho, e é delas que saem as manchetes
  // nacionais do momento (GLP-1, menopausa, câncer, lipedema…). Resultado:
  // Aline (funcional), Vivi e Aju (nichos diferentes) recebendo os MESMOS
  // assuntos. Nicho com busca própria agora usa SÓ as buscas do nicho; o
  // genérico só entra quando o nicho não resolve nada.
  const queries = new Set<string>();
  for (const nicho of [params.nichoPrincipal, params.nichoSecundario]) {
    if (!nicho) continue;
    const chaves = nichoParaChaves(nicho);
    if (!chaves.length) {
      // Cair no genérico em SILÊNCIO foi o que fez uma profissional de saúde
      // feminina receber pauta de oncologia: o nicho dela não existia no mapa
      // e ninguém ficou sabendo. Nicho sem busca própria agora aparece no log.
      console.error(
        "[trends] nicho sem buscas próprias — pauta vai sair genérica. Acrescente em QUERIES_POR_NICHO:",
        nicho,
      );
    }
    for (const q of chaves) queries.add(q);
  }
  if (queries.size === 0) for (const q of QUERIES_BASE) queries.add(q);

  const resultados = await Promise.allSettled(
    Array.from(queries).slice(0, 5).map(buscarRss),
  );
  const manchetes: Manchete[] = [];
  const vistos = new Set<string>();
  for (const r of resultados) {
    if (r.status !== "fulfilled") continue;
    for (const m of r.value) {
      const key = m.titulo.slice(0, 60).toLowerCase();
      if (!vistos.has(key)) {
        vistos.add(key);
        manchetes.push(m);
      }
    }
  }
  return manchetes.slice(0, 20);
}
