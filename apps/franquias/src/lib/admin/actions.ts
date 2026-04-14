"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: admin } = await supabase
    .from("admins")
    .select("id, papel")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!admin) throw new Error("Sem permissão");
  return admin;
}

export async function atualizarFranqueadaAdmin(
  franqueadaId: string,
  campos: Record<string, unknown>,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from("franqueadas")
      .update({ ...campos, atualizado_em: new Date().toISOString() })
      .eq("id", franqueadaId);
    if (error) return { ok: false, erro: error.message };
    revalidatePath(`/admin/franqueadas/${franqueadaId}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro" };
  }
}

export async function salvarNotaInterna(
  franqueadaId: string,
  nota: string,
): Promise<{ ok: boolean }> {
  return atualizarFranqueadaAdmin(franqueadaId, { nota_interna_admin: nota });
}

export async function pausarFranqueada(franqueadaId: string, motivo: string) {
  return atualizarFranqueadaAdmin(franqueadaId, {
    status: "pausado",
    nota_interna_admin: motivo,
  });
}

export async function reativarFranqueada(franqueadaId: string) {
  return atualizarFranqueadaAdmin(franqueadaId, { status: "ativo" });
}

export async function resetarTokenInstagram(franqueadaId: string) {
  return atualizarFranqueadaAdmin(franqueadaId, {
    instagram_access_token: null,
    instagram_token_expiry: null,
    instagram_conta_id: null,
  });
}

/**
 * Gera URLs assinadas frescas para todos os arquivos de uma franqueada
 * e retorna em formato pronto pra gerar ZIP no cliente.
 */
export async function listarArquivosParaZip(franqueadaId: string) {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, arquivos: [] };
  }

  const admin = createAdminClient();

  const { data: arquivos } = await admin
    .from("arquivos_franqueada")
    .select("id, tipo, nome_arquivo, url_storage, formato")
    .eq("franqueada_id", franqueadaId);

  if (!arquivos) return { ok: true, arquivos: [] };

  // Regenera URLs assinadas (1 hora de validade pro download)
  const comUrls = await Promise.all(
    arquivos.map(async (a) => {
      const match = (a.url_storage as string).match(/\/franqueadas-assets\/([^?]+)/);
      if (!match) return { ...a, url_fresh: a.url_storage as string };
      const { data } = await admin.storage
        .from("franqueadas-assets")
        .createSignedUrl(match[1], 3600);
      return { ...a, url_fresh: data?.signedUrl ?? (a.url_storage as string) };
    }),
  );

  return { ok: true, arquivos: comUrls };
}

/**
 * Tipo de alerta que o admin deve atuar.
 */
export type AlertaAdmin = {
  franqueadaId: string;
  nome: string;
  tipo: "token_expirando" | "token_expirado" | "onboarding_parado" | "status_pausado";
  mensagem: string;
  urgencia: "urgente" | "normal";
};

export async function listarAlertas(): Promise<AlertaAdmin[]> {
  try {
    await assertAdmin();
  } catch {
    return [];
  }

  const admin = createAdminClient();
  const { data: franqueadas } = await admin
    .from("franqueadas")
    .select(
      "id, nome_completo, status, instagram_token_expiry, onboarding_completo, onboarding_percentual, atualizado_em",
    );

  if (!franqueadas) return [];

  const alertas: AlertaAdmin[] = [];
  const agora = Date.now();
  const umDia = 24 * 60 * 60 * 1000;

  for (const f of franqueadas) {
    const expiry = f.instagram_token_expiry
      ? new Date(f.instagram_token_expiry as string).getTime()
      : null;

    if (expiry && expiry < agora) {
      alertas.push({
        franqueadaId: f.id as string,
        nome: f.nome_completo as string,
        tipo: "token_expirado",
        mensagem: "Token Instagram expirado — posts pausados",
        urgencia: "urgente",
      });
    } else if (expiry && expiry - agora < 7 * umDia) {
      const dias = Math.round((expiry - agora) / umDia);
      alertas.push({
        franqueadaId: f.id as string,
        nome: f.nome_completo as string,
        tipo: "token_expirando",
        mensagem: `Token Instagram expira em ${dias} dias`,
        urgencia: "urgente",
      });
    }

    const desde = f.atualizado_em
      ? (agora - new Date(f.atualizado_em as string).getTime()) / umDia
      : 0;

    if (!f.onboarding_completo && desde > 3) {
      alertas.push({
        franqueadaId: f.id as string,
        nome: f.nome_completo as string,
        tipo: "onboarding_parado",
        mensagem: `Onboarding ${f.onboarding_percentual ?? 0}% — parado há ${Math.round(desde)} dias`,
        urgencia: desde > 7 ? "urgente" : "normal",
      });
    }

    if (f.status === "pausado") {
      alertas.push({
        franqueadaId: f.id as string,
        nome: f.nome_completo as string,
        tipo: "status_pausado",
        mensagem: "Franqueada com status pausado",
        urgencia: "normal",
      });
    }
  }

  return alertas.sort((a, b) => {
    if (a.urgencia === b.urgencia) return 0;
    return a.urgencia === "urgente" ? -1 : 1;
  });
}
