/**
 * Busca notícias de saúde do dia.
 * Usa NewsAPI.org (free tier: 100 req/dia) OU fallback RSS do G1 Bem-Estar.
 */

export type NoticiaSaude = {
  titulo: string;
  resumo?: string;
  fonte: string;
  url: string;
  publicadoEm?: string;
};

/**
 * NewsAPI — saúde + nutrição no Brasil.
 */
export async function buscarNoticiasNewsAPI(): Promise<NoticiaSaude[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];

  try {
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set(
      "q",
      "(nutrição OR saúde OR hormônio OR menopausa OR intestino OR diabetes OR microbiota)",
    );
    url.searchParams.set("language", "pt");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("pageSize", "30");
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 2);
    url.searchParams.set("from", ontem.toISOString().slice(0, 10));

    const res = await fetch(url, {
      headers: { "X-Api-Key": key },
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`NewsAPI ${res.status}`);

    const json = (await res.json()) as {
      articles: Array<{
        title: string;
        description?: string;
        source: { name: string };
        url: string;
        publishedAt?: string;
      }>;
    };

    return (json.articles ?? []).map((a) => ({
      titulo: a.title,
      resumo: a.description ?? undefined,
      fonte: a.source.name,
      url: a.url,
      publicadoEm: a.publishedAt,
    }));
  } catch (e) {
    console.warn("[news] NewsAPI falhou:", e);
    return [];
  }
}

/**
 * Fallback RSS do G1 Bem-Estar (grátis, sem key).
 */
export async function buscarRSSG1(): Promise<NoticiaSaude[]> {
  try {
    const res = await fetch(
      "https://g1.globo.com/rss/g1/bemestar/",
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const xml = await res.text();

    const items: NoticiaSaude[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(xml)) !== null) {
      const bloco = m[1];
      const titulo = bloco.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1];
      const link = bloco.match(/<link>(.*?)<\/link>/)?.[1];
      const desc =
        bloco.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1];
      const pub = bloco.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      if (titulo && link) {
        items.push({
          titulo,
          resumo: desc,
          fonte: "G1 Bem-Estar",
          url: link,
          publicadoEm: pub,
        });
      }
    }

    return items.slice(0, 20);
  } catch (e) {
    console.warn("[news] G1 RSS falhou:", e);
    return [];
  }
}

/**
 * Agrega: NewsAPI (se tiver key) + G1 RSS sempre.
 */
export async function buscarNoticiasSaude(): Promise<NoticiaSaude[]> {
  const [newsapi, g1] = await Promise.all([
    buscarNoticiasNewsAPI(),
    buscarRSSG1(),
  ]);
  return [...newsapi, ...g1];
}
