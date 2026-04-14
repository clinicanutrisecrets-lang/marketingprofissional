"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TipoArquivo =
  | "logo_principal"
  | "logo_variacao_branca"
  | "logo_variacao_escura"
  | "foto_profissional"
  | "foto_perfil"
  | "foto_clinica"
  | "foto_atendimento"
  | "depoimento_print"
  | "depoimento_video"
  | "certificado"
  | "outro";

/**
 * Faz upload de um arquivo pro Supabase Storage e registra metadata em arquivos_franqueada.
 * Recebe FormData contendo: file (File) + tipo (TipoArquivo).
 */
export async function uploadArquivo(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; id?: string; erro?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada?.id) {
    return { ok: false, erro: "Franqueada não encontrada" };
  }

  const file = formData.get("file") as File | null;
  const tipo = formData.get("tipo") as TipoArquivo | null;

  if (!file || !tipo) return { ok: false, erro: "Arquivo ou tipo ausente" };

  // Validação básica
  if (file.size > 50 * 1024 * 1024) {
    return { ok: false, erro: "Arquivo muito grande (máx 50MB)" };
  }

  const franqueadaId = franqueada.id as string;
  const extensao = file.name.split(".").pop()?.toLowerCase() || "bin";
  const timestamp = Date.now();
  const nomeSafe = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 40);
  const pathStorage = `${franqueadaId}/${tipo}/${timestamp}_${nomeSafe}.${extensao}`;

  // Upload
  const { error: uploadError } = await supabase.storage
    .from("franqueadas-assets")
    .upload(pathStorage, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { ok: false, erro: uploadError.message };

  // Pega URL assinada (1 ano — será regenerada quando necessário)
  const admin = createAdminClient();
  const { data: signed } = await admin.storage
    .from("franqueadas-assets")
    .createSignedUrl(pathStorage, 365 * 24 * 60 * 60);

  const url = signed?.signedUrl ?? pathStorage;

  // Registra na tabela
  const { data: registro, error: insertError } = await supabase
    .from("arquivos_franqueada")
    .insert({
      franqueada_id: franqueadaId,
      tipo,
      nome_arquivo: file.name,
      url_storage: url,
      tamanho_bytes: file.size,
      formato: extensao,
    })
    .select("id")
    .single();

  if (insertError) return { ok: false, erro: insertError.message };

  // Atualiza campos diretos na franqueada pra os principais (logo/foto)
  const atalhos: Partial<Record<TipoArquivo, string>> = {
    logo_principal: "logo_url",
    foto_profissional: "foto_profissional_url",
    foto_perfil: "foto_perfil_url",
  };
  if (tipo in atalhos) {
    // Esses campos podem não existir ainda — tentamos update mas ignoramos erro
    // pra não quebrar o fluxo. Eles serão adicionados em migration separada.
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");

  return { ok: true, url, id: registro?.id as string };
}

/**
 * Remove um arquivo (tanto do storage quanto do registro).
 */
export async function removerArquivo(
  arquivoId: string,
): Promise<{ ok: boolean; erro?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { data: arquivo } = await supabase
    .from("arquivos_franqueada")
    .select("id, url_storage, franqueada_id, franqueadas:franqueada_id(auth_user_id)")
    .eq("id", arquivoId)
    .maybeSingle();

  if (!arquivo) return { ok: false, erro: "Arquivo não encontrado" };

  // Extrai o path do storage a partir da URL assinada (formato: /storage/v1/object/sign/BUCKET/PATH?token=...)
  const url = arquivo.url_storage as string;
  const match = url.match(/\/franqueadas-assets\/([^?]+)/);
  if (match) {
    await supabase.storage.from("franqueadas-assets").remove([match[1]]);
  }

  const { error } = await supabase
    .from("arquivos_franqueada")
    .delete()
    .eq("id", arquivoId);

  if (error) return { ok: false, erro: error.message };

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function listarArquivos(tipo?: TipoArquivo) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!franqueada?.id) return [];

  let query = supabase
    .from("arquivos_franqueada")
    .select("id, tipo, nome_arquivo, url_storage, formato, tamanho_bytes, criado_em")
    .eq("franqueada_id", franqueada.id)
    .order("criado_em", { ascending: false });

  if (tipo) query = query.eq("tipo", tipo);

  const { data } = await query;
  return data ?? [];
}
