/**
 * Google Trends — busca termos em alta no Brasil
 * Usa API não-oficial (web endpoint do Google). Pode quebrar se o Google mudar.
 */

type TrendTerm = { termo: string; volume?: string; trafego?: number };

/**
 * Busca trending searches do dia no Brasil.
 * Endpoint daily trends — retorna top 20 termos.
 */
export async function buscarTrendsBR(): Promise<TrendTerm[]> {
  try {
    const url =
      "https://trends.google.com/trends/api/dailytrends?hl=pt-BR&tz=180&geo=BR&ns=15";

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) throw new Error(`Google Trends HTTP ${res.status}`);

    let text = await res.text();
    // Google prefixa o JSON com )]}' pra evitar hijacking
    text = text.replace(/^\)\]\}',?\n?/, "");

    const json = JSON.parse(text);
    const dias = json?.default?.trendingSearchesDays ?? [];

    const termos: TrendTerm[] = [];
    for (const dia of dias.slice(0, 1)) {
      for (const t of dia.trendingSearches ?? []) {
        termos.push({
          termo: t?.title?.query ?? "",
          volume: t?.formattedTraffic,
          trafego: parseInt(t?.formattedTraffic?.replace(/\D/g, "") ?? "0"),
        });
      }
    }

    return termos.filter((t) => t.termo);
  } catch (e) {
    console.warn("[google-trends] falhou:", e);
    return [];
  }
}

/**
 * Versão filtrada pra temas de saúde/nutrição — keyword matching básico.
 * Claude faz o filtro fino depois.
 */
export async function buscarTrendsSaude(): Promise<TrendTerm[]> {
  const todos = await buscarTrendsBR();

  const keywordsSaude = [
    "saude",
    "saúde",
    "nutri",
    "diabetes",
    "colesterol",
    "obesidade",
    "hormonio",
    "hormônio",
    "vitamina",
    "intestino",
    "emagrece",
    "dieta",
    "menopausa",
    "tireoide",
    "tireóide",
    "cortisol",
    "insulina",
    "alimento",
    "proteína",
    "proteina",
    "fibra",
    "jejum",
    "metabolismo",
    "imunidade",
    "ansiedade",
    "sono",
    "depressão",
    "depressao",
    "cancer",
    "câncer",
    "ozempic",
    "mounjaro",
    "sibutramina",
  ];

  return todos.filter((t) =>
    keywordsSaude.some((k) => t.termo.toLowerCase().includes(k)),
  );
}
