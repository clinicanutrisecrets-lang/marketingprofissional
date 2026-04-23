import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { LPViewNutri } from "./LPViewNutri";

export const revalidate = 3600;

type PageProps = { params: Promise<{ slug: string }> };

async function buscarFranqueadaPorSlug(slug: string) {
  const admin = createAdminClient();
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

export default async function NutriLPPage({ params }: PageProps) {
  const { slug } = await params;
  const franqueada = await buscarFranqueadaPorSlug(slug);
  if (!franqueada) notFound();

  const franqueadaId = franqueada.id as string;
  const logoUrl = await buscarArquivoUrl(franqueadaId, "logo_principal");
  const fotoUrl = await buscarArquivoUrl(franqueadaId, "foto_profissional");

  return <LPViewNutri franqueada={franqueada} logoUrl={logoUrl} fotoUrl={fotoUrl} />;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const franqueada = await buscarFranqueadaPorSlug(slug);
  if (!franqueada) return { title: "Página não encontrada" };
  const nome = franqueada.nome_comercial || franqueada.nome_completo;
  return {
    title: `${nome} — Nutrição de Precisão`,
    description: `Existe um mapa do seu metabolismo. Quando você o enxerga, a melhor versão da sua saúde aparece.`,
  };
}
