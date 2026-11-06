import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createAlineClient } from "@/lib/supabase/server";
import { lerConfig } from "@/lib/automacao/config";
import { algumaChaveDeResposta } from "@/lib/automacao/seguranca";
import { montarPainel, type ContatoPainel, type MensagemPainel } from "@/lib/automacao/painel";
import { alternarSilenciarContato, marcarContatoAtendido } from "@/lib/automacao/actions";
import { ConversasView } from "./ConversasView";

export const dynamic = "force-dynamic";

/**
 * Painel de conversas (Aline, 06/11/2026): "eu olho as conversas todo dia,
 * tem que fazer um painel pra mim no Studio". Lógica em lib/automacao/painel.ts.
 */
export default async function ConversasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect("/login");

  const aline = createAlineClient();
  const { data: perfil } = await aline.from("perfis").select("id, nome, automacao_config, cor_primaria").eq("slug", slug).maybeSingle();
  if (!perfil) notFound();
  const pf = perfil as { id: string; nome: string; automacao_config: unknown; cor_primaria: string | null };

  const desde = new Date(Date.now() - 72 * 3600_000).toISOString();
  const [msgsRes, esperandoRes, regrasRes] = await Promise.all([
    aline.from("ig_mensagens").select("id, contato_id, canal, direcao, texto, origem, criado_em")
      .eq("perfil_id", pf.id).gte("criado_em", desde).order("criado_em", { ascending: false }).limit(800),
    aline.from("ig_contatos").select("id").eq("perfil_id", pf.id).eq("precisa_humano", true).limit(200),
    aline.from("ig_regras").select("id", { count: "exact", head: true }).eq("perfil_id", pf.id).eq("ativa", true),
  ]);
  // 🔴 Erro de leitura NÃO vira painel vazio: "nada urgente" com o banco fora
  // do ar é exatamente a mentira que não pode aparecer aqui.
  const erro = msgsRes.error ?? esperandoRes.error ?? regrasRes.error;
  if (erro) {
    return (
      <main className="min-h-screen bg-aline-bg p-6">
        <p className="mx-auto max-w-3xl rounded-xl bg-red-50 p-4 text-red-800">Erro ao carregar as conversas ({erro.message}). Recarregue a página.</p>
      </main>
    );
  }
  const mensagens = (msgsRes.data ?? []) as MensagemPainel[];
  const ids = Array.from(new Set([
    ...mensagens.map((m) => m.contato_id).filter((x): x is string => !!x),
    ...((esperandoRes.data ?? []) as Array<{ id: string }>).map((c) => c.id),
  ]));
  let contatos: ContatoPainel[] = [];
  if (ids.length) {
    const { data, error } = await aline.from("ig_contatos")
      .select("id, username, nome, precisa_humano, precisa_humano_motivo, silenciado, aline_falou_em, ultima_msg_recebida_em, cliente_situacao")
      .in("id", ids.slice(0, 500));
    if (error) {
      return (
        <main className="min-h-screen bg-aline-bg p-6">
          <p className="mx-auto max-w-3xl rounded-xl bg-red-50 p-4 text-red-800">Erro ao carregar os contatos ({error.message}). Recarregue a página.</p>
        </main>
      );
    }
    contatos = (data ?? []) as ContatoPainel[];
  }

  const config = lerConfig(pf.automacao_config);
  return (
    <ConversasView
      perfilNome={pf.nome}
      painel={montarPainel(contatos, mensagens)}
      cor={pf.cor_primaria || "#0BB8A8"}
      roboLigado={algumaChaveDeResposta(config) || (regrasRes.count ?? 0) > 0}
      atendi={(id) => marcarContatoAtendido.bind(null, slug, id)}
      alternarRobo={(id, silenciado) => alternarSilenciarContato.bind(null, slug, id, silenciado)}
      voltar={<Link href={`/perfis/${slug}/automacoes`} className="mb-3 inline-block text-sm text-aline-text/60 underline">Automações e regras</Link>}
    />
  );
}
