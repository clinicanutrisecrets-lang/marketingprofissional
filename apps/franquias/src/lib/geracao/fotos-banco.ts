/**
 * "Minhas fotos": o banco de fotos da profissional que o pacote da semana usa
 * na capa do carrossel e no post de feed.
 *
 * Por quê (Aline, 05/10/2026, depois do "achei feio a semana" da Daiane e do
 * Gleryston): desde 25/09 a arte da semana sai só tipográfica (fundo na cor da
 * marca + título). Ficou limpa, mas sem imagem fica com cara de slide. A ideia
 * da Juliana: um banco de fotos dela, dos pratos, do consultório, que o
 * pacote puxa como capa. Sem foto no banco, a arte segue tipográfica.
 *
 * A seleção é pura (dá pra testar); baixar fica em `baixarFotoDoBanco`.
 */

/**
 * O que entra no banco. `foto_post` é o tipo da tela "Minhas fotos"; as
 * fotos da clínica e a profissional, que algumas já subiram no cadastro,
 * entram junto. Logo e depoimento não.
 */
export const TIPOS_FOTO_BANCO = [
  "foto_post",
  "foto_clinica",
  "foto_atendimento",
  "foto_profissional",
  "foto_comida",
] as const;

/**
 * Foto de comida não passa pela leitura automática (Aline, 14/10/2026): é ali
 * que ela erra (acerola lida como tomate), não há rosto pra proteger no corte,
 * e quem sabe o que é o prato é a profissional, que escreve o nome. As fotos
 * dela e do consultório continuam sendo lidas: é a leitura que acha o rosto.
 */
export function precisaLeituraAutomatica(tipo: string | null | undefined): boolean {
  return tipo !== "foto_comida";
}

export type FotoDoBanco = { id: string; url_storage: string };

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * A fila de fotos da semana. A ordem de base é a de envio (mais antiga
 * primeiro); a semana decide de onde a fila começa, pra a mesma foto não abrir
 * toda semana. Os posts consomem a fila em sequência, então dentro da semana
 * não repete enquanto houver foto nova.
 */
export function filaDaSemana<T extends { id: string }>(fotos: T[], semanaRef: string): T[] {
  if (fotos.length === 0) return [];
  const inicio = hash(semanaRef) % fotos.length;
  return [...fotos.slice(inicio), ...fotos.slice(0, inicio)];
}

/** O caminho no bucket a partir da URL gravada (assinada ou pública). */
export function caminhoNoBucket(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  return { bucket: m[1]!, path: decodeURIComponent(m[2]!) };
}

/** Os posts da semana que levam foto do banco. */
export function tipoLevaFotoDoBanco(tipo: string): boolean {
  return tipo === "feed_carrossel" || tipo === "feed_imagem";
}

// ————— Escolha da foto pelo assunto do slide (Aline, 14/10/2026) —————
//
// "Se o profissional sobe foto dele ali na parte minha biblioteca, o sistema
// consegue usar adequadamente no slide que tem condizente?" Dois níveis:
//  1. o TIPO que ela escolhe ao subir já diz algo (atendimento, clínica,
//     perfil), de graça;
//  2. ao subir, o sistema DESCREVE a foto e marca os assuntos e a altura do
//     rosto (lib/arquivos/descrever-foto.ts).
// O slide pega a foto cujos assuntos batem com o texto dele. Sem nenhuma que
// bata, vale o caminho de sempre (rodízio na capa, foto do Drive no carrossel
// da consulta).

/** O vocabulário fechado de assuntos de foto (o descritor só pode usar estes). */
export const ASSUNTOS_FOTO = [
  "profissional", // ela aparece
  "atendimento", // consulta com paciente
  "consultorio", // ambiente de atendimento, sem gente
  "prato", // comida pronta
  "ingrediente", // alimento cru, feira, compras
  "cozinha", // preparando comida
  "kit", // kit de teste
  "coleta", // coletando a amostra
  "exame", // papéis, laudo, tubos
  "suplemento",
  "atividade", // movimento, treino
  "bem_estar", // descanso, sono, natureza, pessoa tranquila
] as const;
export type AssuntoFoto = (typeof ASSUNTOS_FOTO)[number];

/** O que o tipo escolhido no envio já diz sobre a foto (nível 1). */
export function assuntosDoTipo(tipo: string | null | undefined): AssuntoFoto[] {
  if (tipo === "foto_atendimento") return ["atendimento", "profissional"];
  if (tipo === "foto_profissional") return ["profissional"];
  if (tipo === "foto_clinica") return ["consultorio"];
  if (tipo === "foto_comida") return ["prato", "ingrediente", "cozinha"];
  return [];
}

// Palavra do slide → assuntos que combinam. Palavra inteira, sem acento.
const PISTAS: Array<[RegExp, AssuntoFoto[]]> = [
  [/\b(consulta|consultorio|atendimento|atendo|escuto|avaliacao|conversa|leitura|devolutiva|correlacao|interpretacao)\b/, ["atendimento", "profissional", "consultorio"]],
  [/\b(eu|comigo|profissional|nutricionista)\b/, ["profissional"]],
  [/\b(prato|receita|refeicao|cafe da manha|almoco|jantar|lanche|cardapio|comer|comida|alimentacao)\b/, ["prato", "cozinha", "ingrediente"]],
  [/\b(feira|mercado|compras|ingrediente|ingredientes|verdura|verduras|fruta|frutas|legume|legumes)\b/, ["ingrediente", "prato"]],
  [/\b(cozinha|cozinhar|preparo|preparar)\b/, ["cozinha", "prato"]],
  [/\b(kit|coleta|cotonete|saliva|bochecha|amostra)\b/, ["coleta", "kit"]],
  [/\b(exame|exames|sangue|laudo|resultado|marcador|marcadores)\b/, ["exame", "atendimento"]],
  [/\b(suplemento|suplementos|suplementacao|capsula|capsulas)\b/, ["suplemento"]],
  [/\b(treino|exercicio|movimento|caminhada|academia)\b/, ["atividade"]],
  [/\b(sono|dormir|descanso|estresse|ansiedade|calma)\b/, ["bem_estar"]],
];

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Os assuntos que o texto de um slide pede, em ordem de importância. */
export function assuntosDoTexto(texto: string): AssuntoFoto[] {
  const t = semAcento(texto ?? "");
  const out: AssuntoFoto[] = [];
  for (const [re, as] of PISTAS) if (re.test(t)) for (const a of as) if (!out.includes(a)) out.push(a);
  return out;
}

export type FotoComAssuntos = {
  id: string;
  url_storage: string;
  tipo?: string | null;
  assuntos?: string[] | null;
  foco_y?: number | string | null;
  /** O que a profissional escreveu sobre a foto ("suco de acerola"). */
  descricao?: string | null;
};

const PALAVRAS_VAZIAS = new Set(["com", "sem", "para", "pra", "uma", "umas", "uns", "dos", "das", "meu", "minha", "feito", "feita", "receita", "prato"]);

/** As palavras do nome que ela escreveu e que valem pra casar com o texto. */
export function palavrasDoNome(nome: string | null | undefined): string[] {
  return [
    ...new Set(
      semAcento(nome ?? "")
        .split(/[^a-z0-9]+/)
        .filter((p) => p.length >= 4 && !PALAVRAS_VAZIAS.has(p)),
    ),
  ];
}

/** Todos os assuntos de uma foto: os do tipo + os da descrição. */
export function assuntosDaFoto(f: FotoComAssuntos): AssuntoFoto[] {
  const validos = new Set<string>(ASSUNTOS_FOTO);
  const daDescricao = (f.assuntos ?? []).filter((a): a is AssuntoFoto => validos.has(a));
  return [...new Set([...assuntosDoTipo(f.tipo), ...daDescricao])];
}

/**
 * A foto que melhor combina com o texto, entre as ainda não usadas. Pontua
 * pela ordem do que o texto pede (o 1º assunto pesa mais). Devolve null
 * quando nenhuma combina: aí o chamador segue o caminho de sempre.
 */
export function melhorFotoParaTexto<T extends FotoComAssuntos>(
  fotos: T[],
  texto: string,
  usadas: Set<string> = new Set(),
  exigir?: AssuntoFoto[],
): T | null {
  const pede = assuntosDoTexto(texto);
  const algumNome = fotos.some((f) => palavrasDoNome(f.descricao).length > 0);
  if (pede.length === 0 && !exigir?.length && !algumNome) return null;
  let melhor: T | null = null;
  let melhorNota = 0;
  for (const f of fotos) {
    if (usadas.has(f.id)) continue;
    const tem = assuntosDaFoto(f);
    if (exigir?.length && !exigir.some((a) => tem.includes(a))) continue;
    let nota = 0;
    pede.forEach((a, i) => {
      if (tem.includes(a)) nota += pede.length - i;
    });
    if (exigir?.length) nota += 1;
    // O texto do slide cita o que está na foto ("acerola"): essa foto vence.
    const t = ` ${semAcento(texto ?? "").replace(/[^a-z0-9]+/g, " ")} `;
    const citadas = palavrasDoNome(f.descricao).filter((p) => t.includes(` ${p} `) || t.includes(` ${p}s `)).length;
    if (citadas) nota += 10 * citadas;
    if (nota > melhorNota) {
      melhor = f;
      melhorNota = nota;
    }
  }
  return melhor;
}

/** A altura do rosto gravada pelo descritor, se for um número válido. */
export function focoDaFoto(f: FotoComAssuntos): number | undefined {
  const n = typeof f.foco_y === "string" ? Number(f.foco_y) : f.foco_y;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1 ? n : undefined;
}
