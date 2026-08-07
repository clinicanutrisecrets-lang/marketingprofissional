"use server";

import { createClient } from "@/lib/supabase/server";
import { gerarPostVenda, type PostVendaGerado } from "@/lib/claude/generate";
import type { ContextoFranqueada, TipoPost } from "@/lib/claude/prompts";
import { sincronizarProdutosScanner } from "./sync";
import { carregarProdutosContexto, formatarPrecoBR } from "./contexto";
import { revalidatePath } from "next/cache";

export type ProdutoScannerLista = {
  id: string;
  produto_id: string;
  nome: string;
  tipo: string | null;
  descricao: string | null;
  preco_texto: string | null;
  checkout_url: string;
  sincronizado_em: string | null;
};

/**
 * Lista os produtos ativos da nutri (cache produtos_scanner) pra tela
 * Posts de venda. Distingue erro de lista vazia — a UI mostra "erro ao
 * carregar" em vez de fingir catálogo vazio.
 */
export async function listarProdutosScanner(): Promise<
  | { ok: true; produtos: ProdutoScannerLista[]; temVinculo: boolean }
  | { ok: false; erro: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticada" };

  const { data: f, error: fErr } = await supabase
    .from("franqueadas")
    .select("id, scanner_saas_user_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (fErr) return { ok: false, erro: fErr.message };
  if (!f) return { ok: false, erro: "Franqueada não encontrada" };

  const fr = f as { id: string; scanner_saas_user_id: string | null };

  const { data, error } = await supabase
    .from("produtos_scanner")
    .select("id, produto_id, nome, tipo, descricao, preco_centavos, checkout_url, sincronizado_em")
    .eq("franqueada_id", fr.id)
    .eq("ativo", true)
    .order("nome");

  if (error) return { ok: false, erro: error.message };

  const produtos: ProdutoScannerLista[] = (data ?? []).map((p) => {
    const row = p as {
      id: string;
      produto_id: string;
      nome: string;
      tipo: string | null;
      descricao: string | null;
      preco_centavos: number | null;
      checkout_url: string;
      sincronizado_em: string | null;
    };
    return {
      id: row.id,
      produto_id: row.produto_id,
      nome: row.nome,
      tipo: row.tipo,
      descricao: row.descricao,
      preco_texto: formatarPrecoBR(row.preco_centavos) ?? null,
      checkout_url: row.checkout_url,
      sincronizado_em: row.sincronizado_em,
    };
  });

  return { ok: true, produtos, temVinculo: !!fr.scanner_saas_user_id };
}

/** Botão "Atualizar produtos" — puxa o catálogo atual do Scanner. */
export async function atualizarProdutosScanner(): Promise<
  { ok: true; total: number } | { ok: false; erro: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticada" };

  const { data: f } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!f) return { ok: false, erro: "Franqueada não encontrada" };

  const resultado = await sincronizarProdutosScanner((f as { id: string }).id);
  if (!resultado.ok) {
    const mensagens: Record<string, string> = {
      sem_vinculo_scanner:
        "Sua conta ainda não está vinculada ao Scanner. Entre pelo menu Marketing Profissional do Scanner da Saúde pelo menos uma vez.",
      plano_nao_elegivel:
        "Os produtos do Scanner Tratamentos são exclusivos do Consultório de Precisão Avançado.",
      scanner_indisponivel:
        "O Scanner não respondeu agora. Tenta de novo em alguns minutos.",
    };
    return { ok: false, erro: mensagens[resultado.motivo] ?? `Não foi possível sincronizar (${resultado.motivo}).` };
  }

  revalidatePath("/dashboard/posts-venda");
  return { ok: true, total: resultado.total };
}

/**
 * Gera o post de venda de UM produto. Devolve a copy pra nutri revisar —
 * o agendamento é um passo separado (criarPostManual, fluxo já existente).
 */
export async function gerarPostVendaAction(params: {
  produtoId: string;
  tipo: TipoPost;
  incluirPreco: boolean;
}): Promise<{ ok: true; post: PostVendaGerado } | { ok: false; erro: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticada" };

  const { data: f, error: fErr } = await supabase
    .from("franqueadas")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (fErr || !f) return { ok: false, erro: fErr?.message ?? "Franqueada não encontrada" };
  const fr = f as Record<string, unknown>;

  const { data: p, error: pErr } = await supabase
    .from("produtos_scanner")
    .select("nome, tipo, descricao, preco_centavos, checkout_url")
    .eq("id", params.produtoId)
    .eq("franqueada_id", fr.id as string)
    .eq("ativo", true)
    .maybeSingle();
  if (pErr) return { ok: false, erro: pErr.message };
  if (!p) return { ok: false, erro: "Produto não encontrado — atualiza a lista e tenta de novo." };

  const produto = p as {
    nome: string;
    tipo: string | null;
    descricao: string | null;
    preco_centavos: number | null;
    checkout_url: string;
  };

  const contexto: ContextoFranqueada = {
    nome_comercial: fr.nome_comercial as string,
    nicho_principal: fr.nicho_principal as string,
    publico_alvo_descricao: fr.publico_alvo_descricao as string,
    diferenciais: fr.diferenciais as string,
    tom_comunicacao: fr.tom_comunicacao as string,
    palavras_chave_usar: fr.palavras_chave_usar as string[],
    palavras_evitar: fr.palavras_evitar as string,
    hashtags_favoritas: fr.hashtags_favoritas as string[],
    link_agendamento: fr.link_agendamento as string,
  };
  contexto.produtos = await carregarProdutosContexto(supabase, fr.id as string);

  try {
    const post = await gerarPostVenda(
      contexto,
      {
        nome: produto.nome,
        tipo: produto.tipo ?? undefined,
        descricao: produto.descricao ?? undefined,
        preco_texto: formatarPrecoBR(produto.preco_centavos),
        checkout_url: produto.checkout_url,
      },
      params.tipo,
      params.incluirPreco,
    );
    return { ok: true, post };
  } catch (e) {
    console.error("[posts-venda] geração falhou:", e);
    return { ok: false, erro: "A geração falhou. Tenta de novo — se persistir, avisa o suporte." };
  }
}
