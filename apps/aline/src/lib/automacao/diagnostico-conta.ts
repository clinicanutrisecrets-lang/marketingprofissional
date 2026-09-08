/**
 * Diagnóstico da conexão: diz o que o token da conta ALCANÇA hoje, uma
 * chamada por capacidade, sem escrever nada. Serve pra saber se falta
 * reconectar (permissão nova não entra em token velho).
 */

import { carregarPerfilPorSlug, credenciaisDoPerfil } from "@/lib/instagram/credenciais";
import { insightsDaMidia, listarComentarios, listarConversas, listarMidiasDetalhadas, obterMe } from "@/lib/instagram/api";

export type Capacidade = { nome: string; ok: boolean; detalhe: string };

export async function diagnosticoConta(slug: string): Promise<{ perfil: string; capacidades: Capacidade[] }> {
  const perfil = await carregarPerfilPorSlug(slug);
  if (!perfil) throw new Error("Perfil não encontrado");
  const acesso = await credenciaisDoPerfil(perfil);
  if (!acesso.cred) return { perfil: slug, capacidades: [{ nome: "conexão", ok: false, detalhe: acesso.motivo }] };
  const cred = acesso.cred;
  const capacidades: Capacidade[] = [];

  const testar = async (nome: string, fn: () => Promise<string>) => {
    try {
      capacidades.push({ nome, ok: true, detalhe: await fn() });
    } catch (e) {
      capacidades.push({ nome, ok: false, detalhe: (e as Error).message.slice(0, 300) });
    }
  };

  await testar("conta (/me)", async () => {
    const me = await obterMe(cred);
    return `@${me.username ?? "?"} · id ${me.user_id ?? me.id}`;
  });

  let primeiroPostId: string | null = null;
  await testar("posts", async () => {
    const m = await listarMidiasDetalhadas(cred, 5);
    primeiroPostId = m[0]?.id ?? null;
    return `${m.length} post(s) lidos; mais recente ${m[0]?.timestamp?.slice(0, 10) ?? "?"}`;
  });

  await testar("métricas do post (insights)", async () => {
    if (!primeiroPostId) throw new Error("sem post pra testar");
    const i = await insightsDaMidia(cred, primeiroPostId);
    const campos = Object.entries(i).map(([k, v]) => `${k}=${v}`).join(", ");
    return campos || "respondeu vazio";
  });

  await testar("comentários", async () => {
    if (!primeiroPostId) throw new Error("sem post pra testar");
    const c = await listarComentarios(cred, primeiroPostId, 5);
    return `${c.length} comentário(s) no post mais recente`;
  });

  await testar("conversas do direct", async () => {
    const c = await listarConversas(cred, 10);
    const comData = c.filter((x) => x.updated_time).map((x) => x.updated_time!.slice(0, 10)).sort();
    return `${c.length} conversa(s)` + (comData.length ? `; da mais antiga ${comData[0]} à mais recente ${comData[comData.length - 1]}` : "");
  });

  return { perfil: slug, capacidades };
}
