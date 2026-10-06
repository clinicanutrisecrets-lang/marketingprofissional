/**
 * O planejamento visto como o Instagram mostra: a grade.
 *
 * A Aline pedia isso desde setembro ("cadê lá no estúdio pra eu ver geral como
 * vai ficar"). A tela de aprovação mostra UMA semana por vez, e uma semana por
 * vez não responde a pergunta dela, que é sobre o conjunto.
 *
 * 🔴 Só entra na grade o que o Instagram põe na grade: foto, carrossel e reel.
 * Story não vira quadradinho no perfil, então aparece numa faixa à parte. Jogar
 * story na grade mostraria um feed que nunca vai existir.
 */

export type PostFeed = {
  id: string;
  tipo: string;
  status: string;
  semana_ref: string | null;
  data_hora_agendada: string | null;
  data_hora_postada: string | null;
  pilar: string | null;
  angulo: string | null;
  copy_legenda: string | null;
  criado_em: string;
  midia_url?: string | null;
};

const TIPOS_DE_GRADE = new Set(["feed_imagem", "feed_carrossel", "reels"]);

export function ehDeGrade(tipo: string): boolean {
  return TIPOS_DE_GRADE.has(tipo);
}

/**
 * A data que vale pra posicionar o post no feed: o que já foi ao ar manda,
 * depois o que está agendado, e só então a semana de referência (que é o
 * planejado sem hora marcada).
 */
export function dataDoPost(p: PostFeed): string | null {
  return p.data_hora_postada ?? p.data_hora_agendada ?? p.semana_ref ?? null;
}

/** Ordem do perfil: o mais recente no canto de cima, como o Instagram mostra. */
export function ordenarParaFeed(posts: PostFeed[]): PostFeed[] {
  return [...posts].sort((a, b) => {
    const da = dataDoPost(a);
    const db = dataDoPost(b);
    // Sem data nenhuma vai pro fim: é rascunho sem lugar marcado no feed.
    if (!da && !db) return a.criado_em < b.criado_em ? 1 : -1;
    if (!da) return 1;
    if (!db) return -1;
    if (da === db) return a.criado_em < b.criado_em ? 1 : -1;
    return da < db ? 1 : -1;
  });
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** "2026-10-06..." vira a chave "2026-10". Data torta não derruba a tela. */
export function chaveDoMes(iso: string | null): string | null {
  if (!iso || iso.length < 7) return null;
  const m = iso.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(m) ? m : null;
}

export function rotuloDoMes(chave: string): string {
  const [ano, mes] = chave.split("-");
  const i = Number(mes) - 1;
  return `${MESES[i] ?? mes} de ${ano}`;
}

export type GrupoMes = { chave: string; rotulo: string; posts: PostFeed[] };

export function agruparPorMes(posts: PostFeed[]): GrupoMes[] {
  const grupos = new Map<string, PostFeed[]>();
  const semData: PostFeed[] = [];
  for (const p of ordenarParaFeed(posts)) {
    const k = chaveDoMes(dataDoPost(p));
    if (!k) { semData.push(p); continue; }
    const atual = grupos.get(k);
    if (atual) atual.push(p); else grupos.set(k, [p]);
  }
  const saida: GrupoMes[] = [...grupos.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([chave, posts]) => ({ chave, rotulo: rotuloDoMes(chave), posts }));
  if (semData.length > 0) {
    saida.push({ chave: "sem-data", rotulo: "sem data marcada", posts: semData });
  }
  return saida;
}

export function rotuloTipo(tipo: string): string {
  if (tipo === "feed_carrossel") return "carrossel";
  if (tipo === "feed_imagem") return "foto";
  if (tipo === "reels") return "reel";
  if (tipo === "stories_sequencia") return "sequência de stories";
  if (tipo === "stories") return "story";
  return tipo;
}

export type Selo = { texto: string; classe: string };

/**
 * O estado em palavra de gente. `aguardando_midia` e `gerando` viram "em
 * produção" porque pra ela é a mesma espera: ainda não dá pra olhar.
 */
export function seloDoStatus(status: string): Selo {
  if (status === "postado") return { texto: "no ar", classe: "bg-emerald-100 text-emerald-800" };
  if (status === "agendado") return { texto: "agendado", classe: "bg-sky-100 text-sky-800" };
  if (status === "aprovado") return { texto: "aprovado", classe: "bg-sky-100 text-sky-800" };
  if (status === "aguardando_aprovacao") return { texto: "esperando você", classe: "bg-amber-100 text-amber-900" };
  if (status === "gerando" || status === "aguardando_midia") return { texto: "em produção", classe: "bg-slate-100 text-slate-700" };
  if (status === "erro") return { texto: "deu erro", classe: "bg-rose-100 text-rose-800" };
  if (status === "cancelado") return { texto: "cancelado", classe: "bg-slate-100 text-slate-500" };
  return { texto: status, classe: "bg-slate-100 text-slate-700" };
}

/** Primeira linha da legenda, pra dar nome ao quadradinho. */
export function tituloDoPost(p: PostFeed, max = 70): string {
  const bruto = (p.copy_legenda ?? "").split("\n").map((l) => l.trim()).find((l) => l.length > 0);
  if (!bruto) return p.pilar ? `(${p.pilar})` : "(sem legenda ainda)";
  const limpo = bruto.replace(/\s+/g, " ");
  return limpo.length <= max ? limpo : `${limpo.slice(0, max - 1).trimEnd()}…`;
}

export function dataCurta(iso: string | null): string {
  if (!iso || iso.length < 10) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a.slice(2)}`;
}

/**
 * O acervo que a Aline mandou apagar em 06/10/2026: post que nasceu antes de a
 * limpeza ser combinada, nunca foi ao ar e segue esperando aprovação.
 *
 * 🔴 `data_hora_postada` é a trava que importa. Post que já foi ao ar é
 * histórico do perfil e não se apaga, qualquer que seja o status dele.
 */
export const CORTE_ACERVO_ANTIGO = "2026-10-06T00:00:00.000Z";

export function ehAcervoAntigo(p: PostFeed, corteIso: string): boolean {
  if (p.data_hora_postada) return false;
  if (p.status !== "aguardando_aprovacao") return false;
  return p.criado_em < corteIso;
}
