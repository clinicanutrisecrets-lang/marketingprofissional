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

const QUERIES_BASE = [
  "nutrição saúde estudo",
  "alimentação doença pesquisa",
  "microbiota intestinal",
  "saúde intestinal câncer",
];

const QUERIES_POR_NICHO: Record<string, string[]> = {
  emagrecimento: ["obesidade estudo", "emagrecimento saúde metabolismo"],
  esportiva: ["nutrição esportiva desempenho", "suplemento atleta estudo"],
  materno_infantil: ["alimentação infantil estudo", "nutrição gestante"],
  infantil: ["alimentação infantil estudo", "seletividade alimentar criança"],
  hormonal: ["menopausa saúde estudo", "hormônios alimentação"],
  menopausa: ["menopausa saúde estudo", "climatério alimentação"],
  intestinal: ["microbioma intestino estudo", "probióticos pesquisa"],
  oncologia: ["câncer prevenção alimentação", "oncologia nutrição estudo"],
  autoimune: ["doença autoimune alimentação", "inflamação crônica estudo"],
  diabetes: ["diabetes alimentação estudo", "glicemia pesquisa"],
  nutrigenetica: ["genética saúde alimentação", "teste genético nutrição"],
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

function nichoParaChaves(nicho: string): string[] {
  const n = nicho.toLowerCase();
  const chaves: string[] = [];
  for (const [k, qs] of Object.entries(QUERIES_POR_NICHO)) {
    if (n.includes(k.replace("_", " ")) || n.includes(k)) chaves.push(...qs);
  }
  return chaves;
}

/**
 * Busca manchetes dos últimos 14 dias para o nicho. Sempre retorna algo
 * (fallback: queries genéricas de nutrição). Nunca lança erro.
 */
export async function buscarPautasQuentes(params: {
  nichoPrincipal?: string | null;
  nichoSecundario?: string | null;
}): Promise<Manchete[]> {
  const queries = new Set<string>(QUERIES_BASE.slice(0, 2));
  for (const nicho of [params.nichoPrincipal, params.nichoSecundario]) {
    if (nicho) for (const q of nichoParaChaves(nicho)) queries.add(q);
  }
  if (queries.size <= 2) for (const q of QUERIES_BASE) queries.add(q);

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
