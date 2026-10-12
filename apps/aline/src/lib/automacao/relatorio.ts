/**
 * Relatório da manhã do robô do Instagram (pedido da Aline, 12/10/2026:
 * "a sessão que faz os avisos nunca funcionou, de manhã me dá um relatório").
 *
 * Puro: recebe o que o cron leu e devolve assunto + HTML + texto. Diz em voz
 * alta o que precisa DELA (convites, clientes com problema, envios que a Meta
 * recusou), o que chegou sem regra nenhuma (lead que se perde quando o
 * ManyChat sair) e se o token está perto de vencer.
 */
/** Injetado por quem chama (casaPalavraChave de regras.ts): uma régua só de palavra-chave. */
export type Casador = (texto: string, palavras: string[]) => boolean;

export type EsperandoAline = { quem: string; motivo: string | null };
export type ComentarioCurto = { quem: string; texto: string };
export type RegraResumo = { nome: string; ativa: boolean; palavras: string[] };

export type DadosRelatorio = {
  perfil: string;
  entradas: Record<string, number>; // canal → quantidade nas últimas 24 h
  saidas: Record<string, number>; // origem → quantidade
  esperando: EsperandoAline[];
  comentariosCurtos: ComentarioCurto[];
  regras: RegraResumo[];
  tokenVenceEm: string | null;
  casa: Casador;
  agora?: Date;
};

const ROTULO_CANAL: Record<string, string> = {
  comentario: "comentários", dm: "directs", story_reply: "respostas de story", story_mention: "menções em story",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Comentário curto que nenhuma regra (ligada ou não) pegaria. */
export function semRegra(comentarios: ComentarioCurto[], regras: RegraResumo[], casa: Casador): ComentarioCurto[] {
  return comentarios.filter((c) => {
    const t = c.texto.replace(/@[\w.]+/g, "").trim();
    if (!/[\p{L}\p{N}]/u.test(t)) return false; // só emoji ou menção: não é pedido
    return !regras.some((r) => r.palavras.length > 0 && casa(c.texto, r.palavras));
  });
}

/** Regra DESLIGADA que teria respondido alguém: quem respondeu foi o ManyChat (ou ninguém). */
export function pegosPorRegraDesligada(comentarios: ComentarioCurto[], regras: RegraResumo[], casa: Casador): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of comentarios) {
    const r = regras.find((x) => !x.ativa && x.palavras.length > 0 && casa(c.texto, x.palavras));
    if (r) out.set(r.nome, (out.get(r.nome) ?? 0) + 1);
  }
  return out;
}

export function montarRelatorio(d: DadosRelatorio): { assunto: string; html: string; texto: string } {
  const agora = d.agora ?? new Date();
  const falhas = Object.entries(d.saidas).filter(([o]) => o.startsWith("falha_envio") || o.endsWith(":sem_confirmacao"));
  const totalFalhas = falhas.reduce((a, [, n]) => a + n, 0);
  const perdidos = semRegra(d.comentariosCurtos, d.regras, d.casa);
  const desligadas = pegosPorRegraDesligada(d.comentariosCurtos, d.regras, d.casa);
  const diasToken = d.tokenVenceEm ? Math.floor((Date.parse(d.tokenVenceEm) - agora.getTime()) / 86_400_000) : null;

  const precisaDela = d.esperando.length + totalFalhas + (diasToken != null && diasToken <= 7 ? 1 : 0);
  const assunto = precisaDela > 0
    ? `Instagram @${d.perfil}: ${precisaDela} ${precisaDela === 1 ? "coisa precisa" : "coisas precisam"} de você`
    : `Instagram @${d.perfil}: nada precisa de você hoje`;

  const linhas: string[] = [];
  const blocos: string[] = [];
  const bloco = (titulo: string, itens: string[]) => {
    if (itens.length === 0) return;
    linhas.push(titulo, ...itens.map((i) => `- ${i}`), "");
    blocos.push(`<h3 style="margin:18px 0 6px;font:600 15px sans-serif;color:#1A1A2E">${esc(titulo)}</h3><ul style="margin:0;padding-left:18px;font:14px/1.5 sans-serif;color:#333">${itens.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`);
  };

  bloco("Esperando você", d.esperando.map((e) => `${e.quem}${e.motivo ? `: ${e.motivo}` : ""}`));
  bloco("Envios que a Meta recusou ou não confirmou", falhas.map(([o, n]) => `${n}x ${o}`));
  if (diasToken != null && diasToken <= 7) {
    bloco("Conexão do Instagram", [diasToken < 0 ? "O acesso VENCEU. Reconecte no Studio." : `O acesso vence em ${diasToken} dia(s). A renovação é automática; se este aviso voltar amanhã, reconecte no Studio.`]);
  }
  bloco("Comentários que nenhuma regra pega (a pessoa fica sem resposta sem o ManyChat)", perdidos.map((c) => `${c.quem}: "${c.texto}"`));
  bloco("Comentários de regras DESLIGADAS (hoje quem respondeu foi o ManyChat, ou ninguém)", Array.from(desligadas).map(([nome, n]) => `${n}x ${nome}`));

  const entrou = Object.entries(d.entradas).map(([c, n]) => `${n} ${ROTULO_CANAL[c] ?? c}`).join(", ") || "nada";
  const saiu = Object.values(d.saidas).reduce((a, n) => a + n, 0);
  const resumo = `Nas últimas 24 h chegaram ${entrou}. O robô enviou ${saiu} mensagem(ns).`;

  const texto = [resumo, "", ...linhas, "Tudo em studio.scannerdasaude.com/perfis/" + d.perfil + "/automacoes"].join("\n");
  const html = `<div style="max-width:560px;margin:0 auto;padding:20px;background:#fff"><p style="font:14px/1.5 sans-serif;color:#333">${esc(resumo)}</p>${blocos.join("") || `<p style="font:14px sans-serif;color:#333">Nada fora do normal.</p>`}<p style="margin-top:22px;font:13px sans-serif"><a href="https://studio.scannerdasaude.com/perfis/${esc(d.perfil)}/automacoes" style="color:#0ABFBC">Abrir as automações no Studio</a></p></div>`;
  return { assunto, html, texto };
}
