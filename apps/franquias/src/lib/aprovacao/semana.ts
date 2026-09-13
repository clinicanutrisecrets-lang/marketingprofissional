/**
 * A tela "Aprovar semana": qual semana ela mostra, e o que "aprovado" quer
 * dizer.
 *
 * 🔴 O caso que originou este arquivo (Juliana, 13/09/2026): ela gerou a
 * semana de 14/09 à mão numa terça, clicou em "Aprovar tudo" — e a semana
 * DESAPARECEU da tela. A busca da página pegava só aprovação com status
 * `aguardando` ou `aprovada_com_edicoes`, e não existe nenhuma outra tela no
 * app da nutri que liste esses posts. Os 13 posts estavam salvos, com arte e
 * legenda, e ela não tinha como chegar neles.
 * Pior: a tela caía na aprovação anterior que sobrou do onboarding dela — uma
 * de 17/08 com ZERO posts —, mostrava o estado vazio "Nenhuma semana
 * aguardando aprovação" e o botão "Gerar semana agora" batia na semana de
 * 14/09, que já existia. Ela lia "já existe aprovação pra essa semana" e
 * concluía, com razão, que o app estava quebrado.
 *
 * Decisão da Aline (13/09): **aprovado NÃO é "sumiu"**. Aprovar quer dizer
 * "não quero mais alterar nada" — e a semana aprovada fica na tela, pronta
 * pra ela baixar as artes, copiar as legendas e postar no Instagram dela.
 *
 * Tudo aqui é puro (sem React e sem Supabase) porque a MESMA régua vale na
 * página (servidor), na view (cliente) e no motor de geração.
 */

/** Aprovação que a nutri ainda pode editar. */
export const STATUS_EM_REVISAO = ["aguardando", "aprovada_com_edicoes"] as const;

/** Aprovação fechada pela nutri: sem mais edição, pronta pra baixar e postar. */
export const STATUS_FECHADA = "aprovada_integral";

/** Aprovação descartada — o motor pode gerar a semana de novo por cima. */
export const STATUS_RECUSADA = "recusada";

export type AprovacaoCandidata = {
  id: string;
  semana_ref: string;
  status: string | null;
  /** Posts REAIS contados em posts_agendados — nunca a coluna total_posts. */
  posts: number;
};

function norm(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

/** true quando a nutri já fechou a semana (não edita mais, só baixa). */
export function aprovacaoFechada(status: string | null | undefined): boolean {
  return norm(status) === STATUS_FECHADA;
}

/** true quando ainda há o que revisar/aprovar. */
export function aprovacaoEmRevisao(status: string | null | undefined): boolean {
  return (STATUS_EM_REVISAO as readonly string[]).includes(norm(status));
}

/**
 * 🔴 Aprovação SEM post é resíduo de geração que falhou, não semana.
 * A linha nasce antes dos posts (`gerarPostsDaSemana` insere a aprovação e só
 * depois gera um por um), então uma falha no meio deixa a carcaça pra trás —
 * e era ela que mandava a tela pro estado vazio e travava a regeneração
 * daquela semana pra sempre.
 */
export function aprovacaoVazia(c: Pick<AprovacaoCandidata, "posts">): boolean {
  return (c.posts ?? 0) <= 0;
}

/** Semanas que a nutri pode abrir: têm post e não foram recusadas. */
export function semanasVisiveis<T extends AprovacaoCandidata>(candidatas: T[]): T[] {
  return candidatas
    .filter((c) => !aprovacaoVazia(c) && norm(c.status) !== STATUS_RECUSADA)
    .slice()
    .sort((a, b) => (a.semana_ref < b.semana_ref ? 1 : a.semana_ref > b.semana_ref ? -1 : 0));
}

/**
 * A semana que a tela abre por padrão: primeiro a que ainda espera revisão
 * (é o que exige ação dela), depois a mais recente já aprovada. Semana
 * aprovada NUNCA é escondida — só perde a vez pra uma pendente.
 */
export function escolherAprovacao<T extends AprovacaoCandidata>(
  candidatas: T[],
  idPedido?: string | null,
): T | null {
  const visiveis = semanasVisiveis(candidatas);
  if (idPedido) {
    const pedida = visiveis.find((c) => c.id === idPedido);
    if (pedida) return pedida;
  }
  return visiveis.find((c) => aprovacaoEmRevisao(c.status)) ?? visiveis[0] ?? null;
}

/** "14/09" — rótulo curto de semana pra chip e frase. */
export function rotuloSemanaCurto(semanaRef: string): string {
  const [, mes, dia] = semanaRef.split("-");
  return dia && mes ? `${dia}/${mes}` : semanaRef;
}

/**
 * O que o motor responde quando a semana pedida já está montada. Diz QUAL
 * semana, quantos posts e em que estado — o texto antigo ("Já existe
 * aprovação pra essa semana (status: aprovada_integral)") não dizia nem de
 * que semana falava, e mandava a nutri procurar defeito onde não havia.
 */
export function mensagemSemanaJaMontada(args: {
  semanaRef: string;
  status: string | null;
  posts: number;
}): string {
  const semana = rotuloSemanaCurto(args.semanaRef);
  const quantos = `${args.posts} ${args.posts === 1 ? "post" : "posts"}`;
  return aprovacaoFechada(args.status)
    ? `A semana de ${semana} já está montada (${quantos}) e você já aprovou. Ela continua aqui nesta tela, pronta pra baixar.`
    : `A semana de ${semana} já está montada (${quantos}) e está aqui nesta tela esperando a sua revisão.`;
}

/**
 * A legenda como ela vai pro Instagram: texto, CTA e hashtags com "#".
 * O CTA só entra se ainda não estiver dentro da legenda (o gerador às vezes
 * já o escreve no fim, e colar duas vezes é o tipo de detalhe que a nutri
 * teria que apagar à mão em todo post).
 */
export function legendaParaCopiar(p: {
  copy_legenda?: string | null;
  copy_cta?: string | null;
  hashtags?: string[] | null;
}): string {
  const legenda = (p.copy_legenda ?? "").trim();
  const cta = (p.copy_cta ?? "").trim();
  const tags = (p.hashtags ?? [])
    .map((h) => (h ?? "").trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .join(" ");
  const partes = [legenda];
  if (cta && !legenda.toLowerCase().includes(cta.toLowerCase())) partes.push(cta);
  if (tags) partes.push(tags);
  return partes.filter(Boolean).join("\n\n");
}

const EXTENSOES = new Set(["png", "jpg", "jpeg", "webp", "mp4", "mov", "gif"]);

/**
 * Nome do arquivo baixado: tipo + data do post. A nutri baixa a semana
 * inteira de uma vez, e "image.png" sete vezes na pasta de Downloads não
 * diz a nenhum deles quando é pra postar.
 */
export function nomeArquivoDaArte(
  p: { tipo_post?: string | null; data_hora_agendada?: string | null },
  url: string,
): string {
  const tipo = (p.tipo_post ?? "post").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const dia = (p.data_hora_agendada ?? "").slice(0, 10) || "sem-data";
  const semQuery = url.split(/[?#]/, 1)[0] ?? "";
  const ext = (semQuery.split(".").pop() ?? "").toLowerCase();
  return `${tipo}-${dia}.${EXTENSOES.has(ext) ? ext : "png"}`;
}

/**
 * A publicação automática só existe quando a conta tem Instagram ligado
 * (token direto válido) ou perfil no Publer.
 *
 * 🔴 Medido em 13/09/2026: NENHUMA conta tem token. Então prometer "seus
 * posts serão publicados no horário agendado" — o que a tela dizia ao
 * aprovar — era falso pra todo mundo: o cron de publicação pega o post
 * aprovado, não tem por onde publicar e o devolve pra "aprovado" em
 * silêncio. Quem posta é a nutri, e a tela tem que dizer isso.
 */
export function publicacaoAutomaticaLigada(
  f: {
    instagram_conta_id?: string | null;
    instagram_access_token?: string | null;
    instagram_token_expiry?: string | null;
    publer_profile_id?: string | null;
  },
  agora: Date = new Date(),
): boolean {
  if (f.publer_profile_id) return true;
  if (!f.instagram_conta_id || !f.instagram_access_token) return false;
  if (!f.instagram_token_expiry) return true;
  return new Date(f.instagram_token_expiry).getTime() > agora.getTime();
}
