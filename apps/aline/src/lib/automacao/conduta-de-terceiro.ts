/**
 * Quando a pessoa cita o profissional que cuida dela.
 *
 * 🔴 REGRA DA ALINE (13/09): NÃO CONTESTAR O PROFISSIONAL DE QUEM COMENTA.
 * Palavras dela: *"não quero polêmica. Se o nutri daquela paciente ou o
 * seguidor falou, ele sabe o contexto daquele paciente — então eu não mudaria
 * nem contestaria. Responderia sobre o contexto: que é legal levar o
 * questionamento com respeito para quem cuida de você e já sabe a sua
 * individualidade."*
 *
 * O risco aqui não é a resposta ficar ruim, é ela ficar BOA e errada: o robô
 * tem a literatura geral e não tem o exame, a medicação, a fase da vida nem o
 * histórico daquela pessoa. Discordar publicamente de uma conduta com um terço
 * da informação expõe a paciente, o colega e o perfil — e vira briga nos
 * comentários, que é exatamente o que ela não quer.
 *
 * 🔴 A DETECÇÃO É O GATILHO, NÃO A RESPOSTA. Instrução em prompt é pedido, não
 * garantia: quando a menção aparece, o bloco entra no system como ordem, em vez
 * de esperar o modelo lembrar sozinho.
 */

/** Quem cuida da pessoa. Só profissão de saúde que PRESCREVE ou conduz caso. */
const PROFISSIONAL = [
  "nutri", "nutris", "nutricionista", "nutricionistas", "nutrologo", "nutrologa",
  "medico", "medica", "doutor", "doutora", "dr", "dra", "clinico", "clinica",
  "endocrino", "endocrinologista", "ginecologista", "gastro", "gastroenterologista",
  "psiquiatra", "cardiologista", "pediatra", "dermatologista", "reumatologista",
  "fisioterapeuta", "psicologo", "psicologa", "terapeuta", "enfermeiro", "enfermeira",
  "farmaceutico", "farmaceutica", "personal", "coach", "profissional",
];

/**
 * Posse: "MEU nutri", "a MINHA médica", "o nutri DELA".
 * 🔴 Sem isso, todo post que fala "o nutricionista investiga" seria tratado
 * como menção a conduta de terceiro e a resposta sairia desviando do nada.
 */
const POSSE = [
  "meu", "minha", "meus", "minhas",
  "dele", "dela", "deles", "delas",
  "do meu", "da minha",
  "nosso", "nossa",
];

/** O que o profissional fez. Só verbo de CONDUTA, não de opinião solta. */
const CONDUTA = [
  "passou", "passei com", "mandou", "falou", "disse", "receitou", "prescreveu",
  "indicou", "orientou", "pediu", "tirou", "cortou", "suspendeu", "aumentou",
  "diminuiu", "trocou", "receita", "prescricao", "prescrição", "conduta",
  "me proibiu", "proibiu", "liberou", "recomendou", "sugeriu",
];

/**
 * Fronteira de palavra que funciona com acento.
 * 🔴 `\b` do JavaScript NÃO casa antes de "á": "á" não é `\w`, então `\bárea`
 * nunca casa. A mordida já aconteceu no guard de financeiro da Fernanda.
 */
function achaTermo(texto: string, termo: string): boolean {
  const t = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\d])${t}(?![\\p{L}\\d])`, "iu").test(texto);
}

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export type MencaoTerceiro = {
  /** Cita um profissional que cuida da pessoa. */
  mencionaProfissional: boolean;
  /** Cita a CONDUTA desse profissional (é aqui que a polêmica nasce). */
  citaConduta: boolean;
  /** Termos que dispararam, pro log e pro simulador. */
  termos: string[];
};

export function lerMencaoDeTerceiro(texto: string): MencaoTerceiro {
  const t = semAcento(String(texto || ""));
  const termos: string[] = [];

  const prof = PROFISSIONAL.filter((p) => achaTermo(t, semAcento(p)));
  // a posse tem que estar na MESMA frase que a profissão, senão
  // "minha barriga incha, o nutricionista investiga isso" entraria.
  const frases = t.split(/[.!?\n;]+/);
  const comPosse = prof.some((p) =>
    frases.some((f) => achaTermo(f, semAcento(p)) && POSSE.some((q) => achaTermo(f, semAcento(q)))),
  );
  if (comPosse) termos.push(...prof);

  const cond = CONDUTA.filter((c) => achaTermo(t, semAcento(c)));
  const citaConduta =
    comPosse &&
    prof.some((p) =>
      frases.some((f) => achaTermo(f, semAcento(p)) && cond.some((c) => achaTermo(f, semAcento(c)))),
    );
  if (citaConduta) termos.push(...cond);

  return { mencionaProfissional: comPosse, citaConduta, termos: [...new Set(termos)] };
}

/**
 * O bloco que entra no system prompt quando a pessoa cita quem cuida dela.
 * Devolve "" quando não há menção, pra não gastar contexto nem mudar o tom
 * das respostas normais.
 */
export function blocoRespeitoAoProfissional(texto: string): string {
  const m = lerMencaoDeTerceiro(texto);
  if (!m.mencionaProfissional) return "";

  const conduta = m.citaConduta
    ? `
A pessoa citou UMA CONDUTA desse profissional (o que ele passou, mandou, tirou ou receitou).
- NÃO diga que está certo nem que está errado. Você não tem o exame, a medicação, a fase da vida nem o histórico dela, e quem acompanha tem.
- NÃO ofereça alternativa, dose, substituição nem "o que eu faria".
- NÃO use "mas", "porém", "na verdade", "o correto é", "não é bem assim", "cuidado com isso": em resposta a uma conduta de colega, qualquer um desses lê como contestação pública.`
    : "";

  return `
🔴 A PESSOA CITOU O PROFISSIONAL QUE CUIDA DELA. Aqui a regra da dona do perfil é absoluta: não contestar, não corrigir, não dar segunda opinião.
${conduta}
O QUE FAZER: acolher, e devolver o questionamento para quem acompanha ela, com respeito e sem ironia. A ideia a passar, com as suas palavras: quem cuida dela conhece a individualidade dela, e levar essa dúvida para essa pessoa é o melhor caminho.
Pode falar do TEMA em geral (como aquele processo funciona no corpo), desde que não vire comparação com o que o profissional dela fez.

EXEMPLOS DO TOM CERTO (não copie a frase, copie a direção):
- "Que bom que você tem alguém acompanhando de perto. Leva essa dúvida pra ela na próxima consulta: ela conhece a sua individualidade, e é aí que essa conversa rende."
- "Cada história pede uma leitura diferente, e quem já te acompanha tem o seu contexto na mão. Vale levar exatamente essa pergunta pra ela."

EXEMPLOS DO QUE NUNCA ESCREVER:
- "Na verdade não é bem assim, o glúten só precisa sair se..." (contesta)
- "Estranho ele ter pedido isso." (desautoriza)
- "No meu consultório eu faria diferente." (compara)
`;
}
