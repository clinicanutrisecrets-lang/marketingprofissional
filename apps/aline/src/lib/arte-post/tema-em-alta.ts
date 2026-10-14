/**
 * Post de tema em alta no Studio (Aline, 13/10/2026: "olha o tipo de post que
 * falo de ver o que está em alta e transformarmos na nossa visão de conteúdo e
 * descrição, saber que a Netflix lançou documentário de intestino").
 *
 * Ela escreve o que está em alta (o assunto que todo mundo está comentando) e
 * o Studio faz o post pela leitura dela: a capa amarra o assunto à vida de
 * quem lê, e o miolo leva pra Fábrica da Saúde com a curadoria do Scanner.
 *
 * 🔴 O assunto em alta é GANCHO, não fonte. O post nunca afirma nada sobre o
 * documentário, a reportagem ou o lançamento além do que ela escreveu, não
 * diz que assistiu, não critica nem endossa e não cita número dele. O conteúdo
 * clínico sai só da curadoria (mesma regra dos outros posts).
 *
 * Puro de propósito: o teste roda com node.
 */

export const PILAR_TEMA_EM_ALTA = "tema_em_alta";
const PREFIXO = "tema_em_alta: ";

export const MAX_PAUTA = { tema: 400, capa: 90, assunto: 120 } as const;

/** Onde o assunto em alta fica guardado no post (coluna prompt_usado). */
export function gravarTemaEmAlta(tema: string): string {
  return `${PREFIXO}${tema.trim().slice(0, MAX_PAUTA.tema)}`;
}

export function temaEmAltaDoPost(promptUsado: string | null | undefined): string | null {
  const p = (promptUsado ?? "").trim();
  if (!p.startsWith(PREFIXO)) return null;
  const t = p.slice(PREFIXO.length).trim();
  return t || null;
}

/**
 * A legenda provisória: capa na primeira linha (é o que a grade mostra) e o
 * ângulo embaixo. Tem o formato de esqueleto, então a montagem da arte troca
 * pela legenda pronta.
 */
export function legendaProvisoria(capa: string, tema: string): string {
  return `${capa.trim()}\nO ângulo: tema em alta, "${tema.trim().slice(0, 250)}".`;
}

export const MOLDE_TEMA_EM_ALTA = [
  "ESTE É UM POST DE TEMA EM ALTA: o assunto que todo mundo está comentando vira a porta de entrada, e o post leva pra leitura da profissional.",
  "MOLDE (um passo por slide no máximo, nesta ordem):",
  "1. A capa já vem pronta: use exatamente o texto dado.",
  "2. O assunto em alta em UMA frase, só com o que está no TEMA dado. Nada além disso sobre ele.",
  "3. A VALIDAÇÃO: se ela se reconheceu no assunto, não fez nada errado. O que funcionou pra alguém do documentário (ou da notícia) pode não ser o caminho dela.",
  "4. O tchan: a leitura da Fábrica da Saúde, com a curadoria do Scanner. Por que o mesmo conselho geral serve pra uma pessoa e não pra outra (o que cada corpo tem de próprio).",
  "5. UMA MINI SOLUÇÃO PARA CADA TIPO: três ou quatro perfis, cada um com algo pra fazer hoje, de graça.",
  "6. O que é da consulta: a pergunta que sobrou. Nunca \"procure um profissional\".",
  "7. O envio nomeia uma pessoa pelo TRAÇO (\"manda pra quem viu o documentário e ficou pensando no próprio intestino\").",
  "",
  "REGRAS DO TEMA EM ALTA:",
  "- O assunto em alta é gancho, não fonte. Não afirme nada sobre ele que não esteja no TEMA dado: sem título, sem fala, sem número, sem conclusão.",
  "- Não diga que assistiu ou leu. Não critique nem endosse o conteúdo dele.",
  "- Não opine sobre remédio, procedimento ou conduta médica citada no assunto: fale do que a nutrição observa e faz.",
  "- A legenda abre com a capa, conta o assunto em uma frase e vira pra leitura da Fábrica da Saúde.",
  "O fim é DESEJO, não frustração.",
  "A Fábrica da Saúde em todo texto, sempre colada na tradução. Nunca a palavra sozinha.",
].join("\n");

/** Ferramenta da pauta: a capa e o assunto clínico que a curadoria vai procurar. */
export const FERRAMENTA_PAUTA = {
  name: "pauta_tema_em_alta",
  description: "Devolve a capa do post e o assunto de saúde que liga o tema em alta à curadoria.",
  input_schema: {
    type: "object" as const,
    properties: {
      capa: {
        type: "string",
        description: `A capa do carrossel, até ${MAX_PAUTA.capa} caracteres. Amarra o assunto em alta à vida de quem lê, com a palavra que a pessoa usa. Sem travessão, sem nome de doença como diagnóstico.`,
      },
      assunto: {
        type: "string",
        description: `O assunto de saúde em palavras de curadoria (sistema, nutriente, marcador ou processo), até ${MAX_PAUTA.assunto} caracteres. Ex.: "microbiota intestinal e eixo intestino cérebro".`,
      },
    },
    required: ["capa", "assunto"],
  },
};

function limpo(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

export function validarTemaDigitado(tema: string): { ok: true; tema: string } | { ok: false; motivo: string } {
  const t = limpo(tema);
  if (t.length < 12) return { ok: false, motivo: "Escreva o que está em alta em uma frase (ex.: a Netflix lançou um documentário sobre intestino)." };
  if (t.length > MAX_PAUTA.tema) return { ok: false, motivo: `O tema passou de ${MAX_PAUTA.tema} caracteres. Resuma em uma ou duas frases.` };
  return { ok: true, tema: t };
}

export function validarPauta(bruto: unknown): { ok: true; capa: string; assunto: string } | { ok: false; motivo: string } {
  const b = (bruto ?? {}) as Record<string, unknown>;
  const capa = limpo(b.capa);
  const assunto = limpo(b.assunto);
  if (!capa) return { ok: false, motivo: "capa vazia" };
  if (capa.length > MAX_PAUTA.capa) return { ok: false, motivo: `capa com ${capa.length} caracteres (máximo ${MAX_PAUTA.capa})` };
  if (!assunto) return { ok: false, motivo: "assunto vazio" };
  if (assunto.length > MAX_PAUTA.assunto) return { ok: false, motivo: `assunto com ${assunto.length} caracteres (máximo ${MAX_PAUTA.assunto})` };
  if (/[—–]/.test(capa)) return { ok: false, motivo: "capa com travessão" };
  if (/(?<![\p{L}])IA(?![\p{L}])/u.test(capa) || /intelig[êe]ncia artificial/i.test(capa)) return { ok: false, motivo: "capa cita IA" };
  return { ok: true, capa, assunto };
}

/** Amanhã às 18h30 de Brasília (21h30 UTC), no formato do input de data. */
export function dataPadraoAmanha(agora = new Date()): string {
  const d = new Date(agora.getTime() + 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/** "2026-10-20" vira o horário de publicação do calendário (18h30 BRT). */
export function agendamentoDoDia(dia: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const iso = `${dia}T21:30:00.000Z`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** A segunda-feira da semana do dia (é a semana_ref dos posts do calendário). */
export function segundaDaSemana(dia: string): string {
  const d = new Date(`${dia}T12:00:00.000Z`);
  const dow = d.getUTCDay(); // 0 domingo
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  return d.toISOString().slice(0, 10);
}
