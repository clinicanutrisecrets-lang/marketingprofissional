import { request } from "undici";
import { config } from "../config.js";

const ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

export type PubmedArticle = {
  pmid: string;
  title: string;
  abstract: string;
  journal: string;
  year: string;
  authors: string[];
  doi?: string;
};

function authParams(): string {
  const p = new URLSearchParams();
  p.set("tool", "studio-aline-whatsapp-bot");
  p.set("email", config.ncbi.email);
  if (config.ncbi.apiKey) p.set("api_key", config.ncbi.apiKey);
  return p.toString();
}

/** Busca até `retmax` PMIDs em PubMed ordenados por relevância, últimos 10 anos. */
export async function search(query: string, retmax = 8): Promise<string[]> {
  const url = `${ESEARCH}?db=pubmed&retmode=json&sort=relevance&retmax=${retmax}&term=${encodeURIComponent(
    `${query} AND ("last 10 years"[dp])`
  )}&${authParams()}`;

  const { body, statusCode } = await request(url);
  if (statusCode >= 400) {
    throw new Error(`PubMed ESearch falhou: HTTP ${statusCode}`);
  }
  const data = (await body.json()) as {
    esearchresult?: { idlist?: string[] };
  };
  return data.esearchresult?.idlist ?? [];
}

/** Baixa abstracts em XML e extrai campos-chave. Zero libs de parse — regex simples. */
export async function fetchArticles(pmids: string[]): Promise<PubmedArticle[]> {
  if (pmids.length === 0) return [];
  const url = `${EFETCH}?db=pubmed&id=${pmids.join(",")}&rettype=abstract&retmode=xml&${authParams()}`;
  const { body, statusCode } = await request(url);
  if (statusCode >= 400) throw new Error(`PubMed EFetch falhou: HTTP ${statusCode}`);
  const xml = await body.text();
  return parsePubmedXml(xml);
}

function parsePubmedXml(xml: string): PubmedArticle[] {
  const articles: PubmedArticle[] = [];
  const blocks = xml.split("<PubmedArticle>").slice(1);

  for (const blk of blocks) {
    const pmid = pick(blk, /<PMID[^>]*>([^<]+)<\/PMID>/);
    const title = stripTags(pick(blk, /<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/));
    // Alguns abstracts são estruturados em <AbstractText Label="BACKGROUND">...
    const abstractMatches = [...blk.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)];
    const abstract = abstractMatches.map((m) => stripTags(m[1] ?? "")).join("\n\n");
    const journal = stripTags(pick(blk, /<Title>([\s\S]*?)<\/Title>/));
    const year =
      pick(blk, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) ||
      pick(blk, /<PubMedPubDate[^>]*>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const authors = [
      ...blk.matchAll(/<Author[^>]*>[\s\S]*?<LastName>([^<]+)<\/LastName>[\s\S]*?<Initials>([^<]+)<\/Initials>/g),
    ].map((m) => `${m[1]} ${m[2]}`);
    const doi = pick(blk, /<ArticleId IdType="doi">([^<]+)<\/ArticleId>/);

    if (pmid && title) {
      articles.push({ pmid, title, abstract, journal, year, authors, doi: doi || undefined });
    }
  }
  return articles;
}

function pick(s: string, re: RegExp): string {
  const m = s.match(re);
  return m?.[1]?.trim() ?? "";
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x2013;/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Conveniência: busca + fetch num único passo. */
export async function searchAndFetch(query: string, count = 6): Promise<PubmedArticle[]> {
  const pmids = await search(query, count);
  const articles = await fetchArticles(pmids);
  // Filtra abstracts vazios (reviews curtas, cartas) — não servem pra grounding
  return articles.filter((a) => a.abstract.length > 300);
}
