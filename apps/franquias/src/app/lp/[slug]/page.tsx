import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { gerarLP } from "@/lib/claude/generate";
import { LPView } from "./LPView";

export const revalidate = 3600; // cacheia 1h

type PageProps = { params: Promise<{ slug: string }> };

async function buscarFranqueadaPorSlug(slug: string) {
  const admin = createAdminClient();
  // slug pode ser instagram_handle ou nome-comercial-slugificado
  const { data } = await admin
    .from("franqueadas")
    .select("*")
    .or(`instagram_handle.eq.${slug},nome_comercial.ilike.${slug.replace(/-/g, " ")}`)
    .eq("onboarding_completo", true)
    .maybeSingle();

  return data as Record<string, unknown> | null;
}

async function buscarArquivoUrl(franqueadaId: string, tipo: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("arquivos_franqueada")
    .select("url_storage")
    .eq("franqueada_id", franqueadaId)
    .eq("tipo", tipo)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { url_storage?: string } | null)?.url_storage ?? null;
}

export default async function LPPage({ params }: PageProps) {
  const { slug } = await params;

  const franqueada = await buscarFranqueadaPorSlug(slug);
  if (!franqueada) notFound();

  const franqueadaId = franqueada.id as string;

  // Tenta gerar LP — se não tiver ANTHROPIC_API_KEY configurada, mostra fallback
  let lp: Awaited<ReturnType<typeof gerarLP>> | null = null;
  try {
    lp = await gerarLP({
      nome_comercial: franqueada.nome_comercial as string,
      nicho_principal: franqueada.nicho_principal as string,
      publico_alvo_descricao: franqueada.publico_alvo_descricao as string,
      diferenciais: franqueada.diferenciais as string,
      historia_pessoal: franqueada.historia_pessoal as string,
      resultado_transformacao: franqueada.resultado_transformacao as string,
      tom_comunicacao: franqueada.tom_comunicacao as string,
      cidade: franqueada.cidade as string,
      estado: franqueada.estado as string,
      valor_consulta_inicial: franqueada.valor_consulta_inicial as number,
      link_agendamento: franqueada.link_agendamento as string,
    });
  } catch (e) {
    console.warn("LP fallback (Claude não disponível):", e);
  }

  const logoUrl = await buscarArquivoUrl(franqueadaId, "logo_principal");
  const fotoUrl = await buscarArquivoUrl(franqueadaId, "foto_profissional");

  return (
    <LPView
      franqueada={franqueada}
      lp={lp}
      logoUrl={logoUrl}
      fotoUrl={fotoUrl}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const franqueada = await buscarFranqueadaPorSlug(slug);
  if (!franqueada) return { title: "Página não encontrada" };
  const nome = franqueada.nome_comercial || franqueada.nome_completo;
  return {
    title: `${nome} — Nutrição de Precisão`,
    description:
      (franqueada.tagline as string) ||
      (franqueada.descricao_longa as string)?.slice(0, 160),
  };
}
