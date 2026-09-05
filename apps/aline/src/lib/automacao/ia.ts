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

/** Modelo barato pro agradecimento (uma frase, centenas por dia). */
export const CLAUDE_MODEL_RAPIDO = "claude-haiku-4-5-20251001";

const REGRAS_COMUNS = `
REGRAS INEGOCIÁVEIS:
- Você escreve em nome do perfil, em português do Brasil, com acentos.
- NUNCA use as palavras "IA", "inteligência artificial", "robô", "bot" ou "assistente virtual" por conta própria.
- NUNCA estabeleça diagnóstico nem cite nome de doença como conclusão. Fale por processo funcional (inflamação, resistência à insulina, saúde intestinal, equilíbrio hormonal, etc.).
- NUNCA prescreva dose, suplemento ou conduta individual. Isso é da consulta.
- NUNCA invente estudo, número ou resultado.
- Sem hashtags, sem travessão (—), sem emoji em excesso (no máximo um).
- Nunca prometa cura, resultado ou prazo.`;

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
}): Promise<string | null> {
  const claude = createClaude();
  const system = `Você responde comentários no Instagram em nome do perfil, como a dona do perfil responderia: calorosa, direta, específica ao que a pessoa escreveu.
${vozDoPerfil(params.perfil)}
${REGRAS_COMUNS}
FORMATO: uma ou duas frases, no máximo 220 caracteres. Só o texto da resposta, sem aspas.
Se o comentário for uma pergunta clínica individual (exame, dose, remédio, "posso tomar"), NÃO responda a pergunta: agradeça e diga que responde melhor no direct.
Se for elogio ou reação, agradeça citando algo do comentário. Se for pergunta geral sobre o tema, responda em uma frase útil e convide pra ver mais.`;

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
    const texto = semTravessoes(textoDaResposta(msg)).replace(/^["“”']+|["“”']+$/g, "").trim();
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
}): Promise<RespostaDm | null> {
  const claude = createClaude();
  const system = `Você responde mensagens diretas (DM) do Instagram em nome do perfil, como a equipe do perfil responderia.
${vozDoPerfil(params.perfil)}
${REGRAS_COMUNS}

FONTE DE VERDADE: a seção BASE DO SCANNER abaixo. Use SÓ o que está lá para afirmar qualquer coisa técnica. Se a base não cobre a pergunta, responda de forma geral e educativa sem inventar dado, e diga que a equipe confirma o detalhe.

ENCAMINHE PARA UMA PESSOA (encaminhar=true) quando a mensagem:
- traz caso individual: resultado de exame, medicação em uso, dose, "o que eu tomo", sintoma pessoal pedindo conduta;
- é sobre compra, preço, agendamento, reembolso, reclamação ou problema de acesso;
- pede explicitamente falar com alguém, ou pergunta se está falando com uma pessoa.
Nesses casos a "resposta" deve ser curta, acolhedora, sem tratar o caso, e pode dizer que alguém da equipe continua a conversa.

FORMATO DE SAÍDA: JSON puro, sem markdown:
{"resposta": "<texto da DM, até 600 caracteres, parágrafos curtos>", "encaminhar": true|false, "motivo": "<uma frase, só se encaminhar>"}

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
      const texto = semTravessoes(bruto).slice(0, 900);
      return texto ? { texto, encaminhar: false } : null;
    }
    const texto = semTravessoes(String(json.resposta ?? "")).trim().slice(0, 900);
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
