/**
 * Lê o que a dona do perfil já escreveu no próprio Instagram (legendas e as
 * respostas que ELA deu em comentários) e monta um retrato do jeito de falar,
 * que ela revisa na tela. DMs antigas a Meta não entrega pela API — só o que
 * chegar pelo webhook daqui pra frente.
 */

import { createAlineClient } from "@/lib/supabase/server";
import { listarComentarios, listarMidias } from "@/lib/instagram/api";
import { carregarPerfilPorSlug, credenciaisDoPerfil } from "@/lib/instagram/credenciais";
import { createClaude, CLAUDE_MODEL } from "@/lib/claude/scripts";
import { semTravessoes } from "@/lib/texto/sem-travessoes";
import { lerConfig } from "./config";

export type ResultadoVoz = { voz: string; legendas: number; respostas: number };

export async function mapearVoz(slug: string): Promise<ResultadoVoz> {
  const perfil = await carregarPerfilPorSlug(slug);
  if (!perfil) throw new Error("Perfil não encontrado");
  const acesso = await credenciaisDoPerfil(perfil);
  if (!acesso.cred) throw new Error(acesso.motivo);

  const midias = await listarMidias(acesso.cred, 25);
  const legendas = midias.map((m) => (m.caption ?? "").trim()).filter((c) => c.length > 40);

  const dona = (perfil.instagram_username ?? perfil.instagram_handle).toLowerCase().replace(/^@/, "");
  const trocas: string[] = [];
  for (const m of midias.slice(0, 12)) {
    let comentarios;
    try {
      comentarios = await listarComentarios(acesso.cred, m.id, 30);
    } catch {
      continue;
    }
    for (const c of comentarios) {
      for (const r of c.replies?.data ?? []) {
        if ((r.username ?? "").toLowerCase() === dona && r.text) {
          trocas.push(`Pessoa (@${c.username ?? "?"}): "${(c.text ?? "").slice(0, 200)}"\nEla: "${r.text.slice(0, 300)}"`);
        }
      }
    }
    if (trocas.length >= 40) break;
  }

  if (legendas.length === 0 && trocas.length === 0) {
    throw new Error("Não achei legendas nem respostas suas em comentários pra ler. Publique algo ou responda comentários e tente de novo.");
  }

  const claude = createClaude();
  const msg = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 900,
    temperature: 0.3,
    system: `Você é uma editora que descreve o jeito de escrever de uma pessoa a partir de textos dela, pra que outra pessoa consiga escrever igual.
Escreva em português do Brasil, sem travessão, em tópicos curtos (no máximo 12), cobrindo: tom, como ela começa e termina, vocabulário e expressões que repete, uso de emoji (quais e quanto), como ela trata quem escreve (você, amiga, nome), como ela responde elogio, como responde dúvida, o que ela evita. Inclua 3 a 5 frases curtas dela como exemplo literal. Nada de elogiar; descreva.`,
    messages: [
      {
        role: "user",
        content: [
          legendas.length ? `LEGENDAS (${legendas.length}):\n` + legendas.slice(0, 15).map((l) => `- ${l.slice(0, 700)}`).join("\n") : "",
          trocas.length ? `RESPOSTAS DELA EM COMENTÁRIOS (${trocas.length}):\n` + trocas.slice(0, 40).join("\n\n") : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  });
  const voz = semTravessoes(
    msg.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { text: string }).text)
      .join("")
      .trim(),
  );
  if (!voz) throw new Error("A leitura voltou vazia. Tente de novo.");

  const aline = createAlineClient();
  const config = lerConfig(perfil.automacao_config);
  const { error } = await aline
    .from("perfis")
    .update({ automacao_config: { ...config, voz } })
    .eq("id", perfil.id);
  if (error) throw new Error(error.message);

  return { voz, legendas: legendas.length, respostas: trocas.length };
}
