"use server";
import { createClient } from "@/lib/supabase/server";
import { gerarRoteiroVideo } from "@/lib/agentes/roteiro-video";

export async function gerarRoteiroAnuncio(params: {
  tema_criativo: string;
  objetivo_negocio: string;
  copy_headline?: string;
  copy_texto?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado" };

  const { data: f } = await supabase
    .from("franqueadas")
    .select(
      "nome_completo, nicho_principal, publico_alvo_descricao, historia_pessoal, diferenciais, cidade",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!f) return { ok: false, erro: "Perfil não encontrado" };
  const franq = f as {
    nome_completo: string;
    nicho_principal: string | null;
    publico_alvo_descricao: string | null;
    historia_pessoal: string | null;
    diferenciais: string | null;
    cidade: string | null;
  };

  return gerarRoteiroVideo({
    franqueada: {
      nome_completo: franq.nome_completo,
      nicho_principal: franq.nicho_principal ?? "nutrição clínica",
      publico_alvo_descricao:
        franq.publico_alvo_descricao ?? "adultos interessados em saúde",
      historia_pessoal: franq.historia_pessoal ?? undefined,
      diferenciais: franq.diferenciais ?? undefined,
      cidade: franq.cidade ?? undefined,
    },
    anuncio: params,
  });
}
