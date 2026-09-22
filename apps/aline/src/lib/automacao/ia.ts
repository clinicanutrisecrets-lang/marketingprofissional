/**
 * As duas respostas GERADAS do robô do Instagram:
 *   - agradecer comentário em público (engajamento);
 *   - responder dúvida na DM com a base do Scanner.
 *
 * Regras que valem nas duas (as mesmas da Sofia e da Fernanda): nunca
 * estabelecer diagnóstico (processo funcional, não nome de doença), nunca
 * inventar dado clínico fora do contexto recebido, nunca a palavra "IA",
 * nunca travessão, PT-BR com acento, curto. Caso individual vai pra humana.
 */

import { createClaude, CLAUDE_MODEL } from "@/lib/claude/scripts";
import { semTravessoes } from "@/lib/texto/sem-travessoes";
import type { PerfilInstagram } from "@/lib/instagram/credenciais";
import { blocoRespeitoAoProfissional } from "./conduta-de-terceiro";
import { limparContatosInventados } from "./contato-inventado";

/** Modelo barato pro agradecimento (uma frase, centenas por dia). */
export const CLAUDE_MODEL_RAPIDO = "claude-haiku-4-5-20251001";

const REGRAS_COMUNS = `
REGRAS INEGOCIÁVEIS:
- Você escreve em nome do perfil, em português do Brasil, com acentos.
- NUNCA use as palavras "IA", "inteligência artificial", "robô", "bot" ou "assistente virtual" por conta própria.
- NUNCA estabeleça diagnóstico nem cite nome de doença como conclusão. Fale por processo funcional (inflamação, resistência à insulina, saúde intestinal, equilíbrio hormonal, etc.).
- NUNCA prescreva dose, suplemento ou conduta individual. Isso é da consulta.
- NUNCA invente estudo, número ou resultado.
- NUNCA prometa, em nome dela, trabalho que ELA vai ter que fazer depois: mandar referência,
  buscar estudo, preparar material, responder em particular, retornar o contato. O robô leva
  dois segundos pra prometer e a conta fica com ela. Se não dá pra cumprir sem ela levantar
  um dedo, não prometa.
- NUNCA invente forma de contato. E-mail, telefone, WhatsApp, link, endereço e nome de
  pessoa só podem sair do que está escrito acima. Se não estiver escrito, não existe:
  diga que a equipe responde por aqui mesmo. Um contato inventado manda a pessoa para o
  vazio e ela conclui que ninguém respondeu.
- Sem hashtags, sem travessão (—), sem emoji em excesso (no máximo um).
- Nunca prometa cura, resultado ou prazo.
- NUNCA contradiga, corrija nem avalie a conduta de outro profissional de saúde. Quem acompanha a pessoa conhece o caso dela; você não. Isso vale mesmo quando você acha que a conduta está errada.`;

function vozDoPerfil(perfil: Pick<PerfilInstagram, "nome" | "instagram_handle" | "tom" | "instrucoes_ia" | "regras_especiais">): string {
  return [
    `Perfil: @${perfil.instagram_handle} (${perfil.nome}).`,
    perfil.tom ? `Tom de voz: ${perfil.tom}.` : "",
    perfil.instrucoes_ia ? `Instruções do perfil: ${perfil.instrucoes_ia}` : "",
    perfil.regras_especiais ? `Regras especiais: ${perfil.regras_especiais}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function textoDaResposta(msg: { content: Array<{ type: string; text?: string }> }): string {
  return msg.content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();
}

/* ── Agradecimento em comentário ──────────────────────────────────────── */

export async function gerarAgradecimentoComentario(params: {
  perfil: Pick<PerfilInstagram, "nome" | "instagram_handle" | "tom" | "instrucoes_ia" | "regras_especiais">;
  comentario: string;
  username?: string | null;
  legendaDoPost?: string | null;
  /** blocoOrientacoesDaDona(config): voz, ética e direcionamentos escritos por ela */
  orientacoes?: string;
}): Promise<string | null> {
  const claude = createClaude();
  const system = `Você responde comentários no Instagram em nome do perfil, como a dona do perfil responderia: calorosa, direta, específica ao que a pessoa escreveu.
${vozDoPerfil(params.perfil)}
${params.orientacoes ? `\n${params.orientacoes}\n` : ""}
${REGRAS_COMUNS}
FORMATO: uma ou duas frases, no máximo 220 caracteres. Só o texto da resposta, sem aspas.
Se o comentário for uma pergunta clínica individual (exame, dose, remédio, "posso tomar"), NÃO responda a pergunta: agradeça e diga que responde melhor no direct.
Se for elogio ou reação, agradeça citando algo do comentário. Se for pergunta geral sobre o tema, responda em uma frase útil e convide pra ver mais.
${blocoRespeitoAoProfissional(params.comentario)}`;

  const user = [
    params.legendaDoPost ? `Legenda do post (contexto): ${params.legendaDoPost.slice(0, 400)}` : "",
    `Comentário de ${params.username ? "@" + params.username : "uma pessoa"}: "${params.comentario.slice(0, 500)}"`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const msg = await claude.messages.create({
      model: CLAUDE_MODEL_RAPIDO,
      max_tokens: 200,
      temperature: 0.7,
      system,
      messages: [{ role: "user", content: user }],
    });
    const bruto = semTravessoes(textoDaResposta(msg)).replace(/^["“”']+|["“”']+$/g, "").trim();
    const texto = semContatoInventado(bruto, [system, user].join("\n"), "agradecimento");
    return texto ? texto.slice(0, 300) : null;
  } catch (e) {
    console.error("[automacao/ia] agradecimento falhou:", (e as Error).message);
    return null;
  }
}

/* ── Resposta de DM com a base do Scanner ─────────────────────────────── */

export type RespostaDm = { texto: string; encaminhar: boolean; motivo?: string };

export async function responderDmComScanner(params: {
  perfil: Pick<PerfilInstagram, "nome" | "instagram_handle" | "tom" | "instrucoes_ia" | "regras_especiais">;
  historico: Array<{ direcao: "entrada" | "saida"; texto: string }>;
  pergunta: string;
  nomeContato?: string | null;
  contextoScanner: { blocos: string; disponivel: boolean };
  textoEncaminharHumano: string;
  /** blocoOrientacoesDaDona(config): voz, ética e direcionamentos escritos por ela */
  orientacoes?: string;
}): Promise<RespostaDm | null> {
  const claude = createClaude();
  const system = `Você responde mensagens diretas (DM) do Instagram em nome do perfil, como a equipe do perfil responderia.
${vozDoPerfil(params.perfil)}
${params.orientacoes ? `\n${params.orientacoes}\n` : ""}
${REGRAS_COMUNS}

FONTE DE VERDADE: a seção BASE DO SCANNER abaixo. Use SÓ o que está lá para afirmar qualquer coisa técnica. Se a base não cobre a pergunta, responda de forma geral e educativa sem inventar dado, e diga que a equipe confirma o detalhe.

ENCAMINHE PARA UMA PESSOA (encaminhar=true) quando a mensagem:
- traz caso individual: resultado de exame, medicação em uso, dose, "o que eu tomo", sintoma pessoal pedindo conduta;
- é sobre reembolso, reclamação, problema de acesso ou pagamento que deu errado;
- pede explicitamente falar com alguém, ou pergunta se está falando com uma pessoa.

🔴 PREÇO E AGENDAMENTO NÃO ENCAMINHAM SOZINHOS. Mandam as instruções do perfil
acima: se elas trazem o valor e o contato de quem agenda, responda na hora, com
o que a pessoa ganha e uma pergunta de triagem. Encaminhar quem só queria saber
quanto custa perde a conversa e entope a fila de gente.
Nesses casos a "resposta" deve ser curta, acolhedora, sem tratar o caso, e pode dizer que alguém da equipe continua a conversa.

FORMATO DE SAÍDA: JSON puro, sem markdown:
{"resposta": "<texto da DM, até 600 caracteres, parágrafos curtos>", "encaminhar": true|false, "motivo": "<uma frase, só se encaminhar>"}

${blocoRespeitoAoProfissional(params.pergunta)}
${params.contextoScanner.disponivel && params.contextoScanner.blocos
    ? `BASE DO SCANNER:\n${params.contextoScanner.blocos.slice(0, 6000)}`
    : "BASE DO SCANNER: (nenhum registro encontrado para esta pergunta)"}`;

  const historico = params.historico
    .slice(-8)
    .map((h) => `${h.direcao === "entrada" ? "Pessoa" : "Perfil"}: ${h.texto.slice(0, 400)}`)
    .join("\n");
  const user = [
    params.nomeContato ? `Nome da pessoa: ${params.nomeContato}` : "",
    historico ? `Conversa até aqui:\n${historico}` : "",
    `Mensagem nova da pessoa: "${params.pergunta.slice(0, 1000)}"`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Tudo que o modelo teve na mão. Contato fora disto é invenção.
  const contextoDoModelo = [system, user].join("\n");

  try {
    const msg = await claude.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 700,
      temperature: 0.5,
      system,
      messages: [{ role: "user", content: user }],
    });
    const bruto = textoDaResposta(msg);
    const json = extrairJson(bruto);
    if (!json) {
      // Modelo escreveu prosa em vez de JSON: usa a prosa, sem encaminhar.
      const texto = semContatoInventado(semTravessoes(bruto), contextoDoModelo, "dm").slice(0, 900);
      return texto ? { texto, encaminhar: false } : null;
    }
    const texto = semContatoInventado(semTravessoes(String(json.resposta ?? "")).trim(), contextoDoModelo, "dm").slice(0, 900);
    const encaminhar = json.encaminhar === true;
    return {
      texto: texto || (encaminhar ? params.textoEncaminharHumano : ""),
      encaminhar,
      motivo: typeof json.motivo === "string" ? json.motivo : undefined,
    };
  } catch (e) {
    console.error("[automacao/ia] resposta de DM falhou:", (e as Error).message);
    return null;
  }
}

/**
 * Última peneira antes de o texto sair: contato que o modelo inventou não vai
 * pra pessoa. Só remove o contato — a frase em volta costuma estar certa.
 */
function semContatoInventado(texto: string, contexto: string, onde: string): string {
  const { texto: limpo, removidos } = limparContatosInventados(texto, contexto);
  if (removidos.length > 0) {
    console.warn(
      `[automacao/ia] contato inventado removido (${onde}):`,
      removidos.map((r) => `${r.tipo}=${r.valor}`).join(", "),
    );
  }
  return limpo;
}

function extrairJson(texto: string): Record<string, unknown> | null {
  const ini = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (ini < 0 || fim <= ini) return null;
  try {
    return JSON.parse(texto.slice(ini, fim + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* ── Qual botão a pessoa quis dizer, quando digitou em vez de tocar ────── */

/**
 * "sou farmacêutico" → "Outro profissional"; "sim, sou nutri há 10 anos" →
 * "Sim, sou nutri". Devolve o índice do botão ou null quando a frase não é
 * resposta à pergunta (aí o robô segue o caminho normal).
 */
export async function classificarOpcaoPorTexto(texto: string, rotulos: string[]): Promise<number | null> {
  if (!texto.trim() || rotulos.length === 0) return null;
  const claude = createClaude();
  try {
    const msg = await claude.messages.create({
      model: CLAUDE_MODEL_RAPIDO,
      max_tokens: 10,
      temperature: 0,
      system: `A pessoa recebeu uma pergunta com estas opções numeradas e respondeu digitando. Diga QUAL opção a resposta dela equivale.
Responda SÓ o número da opção (1 a ${rotulos.length}). Se a resposta não corresponde a nenhuma opção, ou é outra pergunta, responda 0.`,
      messages: [
        {
          role: "user",
          content: `Opções:\n${rotulos.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\nResposta digitada: "${texto.slice(0, 300)}"`,
        },
      ],
    });
    const n = Number(textoDaResposta(msg).match(/\d+/)?.[0] ?? "0");
    return n >= 1 && n <= rotulos.length ? n - 1 : null;
  } catch (e) {
    console.error("[automacao/ia] classificar opção falhou:", (e as Error).message);
    return null;
  }
}

/* ── Entender o pedido sem a palavra-chave ────────────────────────────── */

/**
 * A pessoa escreveu um texto que NÃO casou nenhuma palavra-chave. Ela está
 * pedindo algum dos materiais mesmo assim?
 *
 * 🔴 Esta função existe por causa de um problema REAL relatado pela Aline
 * sobre o ManyChat (16/09/2026): *"se a pessoa não clica no botão... ela
 * conversa, ela não apertou só o botão. Ela quis discursar sobre. E aí eu
 * tive que manualmente mandar pra ela."*
 *
 * 🔴 ELA É CONSERVADORA DE PROPÓSITO. Entregar o material errado pra quem não
 * pediu é pior que não entregar: queima a lead E o perfil. O prompt manda
 * responder 0 em qualquer dúvida, e devolver null é o caminho normal — a
 * pessoa segue pro agradecimento/resposta de sempre, como hoje.
 *
 * Recebe as descrições prontas (`descreverRegra`) pra ficar pura de Supabase.
 * Devolve o ÍNDICE na lista recebida, ou null.
 */
export async function escolherRegraPorIntencao(
  texto: string,
  descricoes: string[],
): Promise<number | null> {
  if (!texto.trim() || descricoes.length === 0) return null;
  const claude = createClaude();
  try {
    const msg = await claude.messages.create({
      model: CLAUDE_MODEL_RAPIDO,
      max_tokens: 10,
      temperature: 0,
      system: `A pessoa escreveu no Instagram de uma nutricionista. O perfil entrega materiais automaticamente quando alguém digita uma palavra-chave, mas esta pessoa escreveu com as palavras dela.

Diga se esta mensagem é de alguém que QUER receber um desses materiais, mesmo sem ter digitado a palavra-chave e mesmo tendo escrito um texto longo em vez do comando. Contar o próprio caso e pedir ajuda sobre o assunto do material CONTA como querer.

Responda SÓ o número do material (1 a ${descricoes.length}). Responda 0 se:
- a mensagem não tem relação com nenhum material;
- a pessoa está criticando, discordando ou reclamando do assunto, em vez de pedir ajuda;
- é elogio, emoji, saudação ou comentário solto, sem pedido;
- serviria pra mais de um material e não dá pra saber qual;
- você tem qualquer dúvida. Na dúvida, responda 0.`,
      messages: [
        {
          role: "user",
          content: `Materiais:\n${descricoes.map((d, i) => `${i + 1}. ${d}`).join("\n")}\n\nMensagem da pessoa: "${texto.slice(0, 600)}"`,
        },
      ],
    });
    const n = Number(textoDaResposta(msg).match(/\d+/)?.[0] ?? "0");
    return n >= 1 && n <= descricoes.length ? n - 1 : null;
  } catch (e) {
    // Falha do modelo nunca pode travar o evento: segue o fluxo de hoje.
    console.error("[automacao/ia] escolher regra por intenção falhou:", (e as Error).message);
    return null;
  }
}
