import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderCard, ILUSTRACOES_DISPONIVEIS, type CardLayout, type Dimensoes, type IlustracaoId } from "@scanner/ai-image";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Editor de arte: renderiza um card sob demanda com os textos digitados
 * pela nutri e, opcionalmente, uma FOTO DELA (upload) na tirinha do topo.
 * Retorna o PNG direto — o front usa como preview e como download.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });

  const { data: franqueada } = await supabase
    .from("franqueadas")
    .select("id, nome_comercial, nome_completo, instagram_handle, cor_primaria_hex")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!franqueada) return NextResponse.json({ erro: "sem franqueada" }, { status: 403 });
  const f = franqueada as {
    id: string;
    nome_comercial: string | null;
    nome_completo: string | null;
    instagram_handle: string | null;
    cor_primaria_hex: string | null;
  };

  // Logo do onboarding entra automaticamente quando a nutri não sobe outra
  const { data: logoRow } = await supabase
    .from("arquivos_franqueada")
    .select("url_storage")
    .eq("franqueada_id", f.id)
    .eq("tipo", "logo_principal")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const logoUrlOnboarding = (logoRow as { url_storage?: string } | null)?.url_storage;

  const form = await request.formData();
  const headline = String(form.get("headline") ?? "").trim();
  if (!headline) return NextResponse.json({ erro: "headline obrigatório" }, { status: 400 });

  const eyebrow = String(form.get("eyebrow") ?? "").trim();
  const subtitle = String(form.get("subtitle") ?? "").trim();
  const cta = String(form.get("cta") ?? "").trim();
  const formato = String(form.get("formato") ?? "feed");
  const esquema = Number(form.get("esquema") ?? -1);

  const dimensoes: Dimensoes = formato === "stories" ? "1080x1920" : formato === "retrato" ? "1080x1350" : "1080x1080";

  let fotoBuffer: Buffer | undefined;
  const foto = form.get("foto");
  if (foto && foto instanceof File && foto.size > 0) {
    if (foto.size > 15 * 1024 * 1024) {
      return NextResponse.json({ erro: "foto acima de 15MB" }, { status: 400 });
    }
    fotoBuffer = Buffer.from(await foto.arrayBuffer());
  }

  let logoBuffer: Buffer | undefined;
  const logo = form.get("logo");
  if (logo && logo instanceof File && logo.size > 0) {
    if (logo.size > 8 * 1024 * 1024) {
      return NextResponse.json({ erro: "logo acima de 8MB" }, { status: 400 });
    }
    logoBuffer = Buffer.from(await logo.arrayBuffer());
  }

  const corFundoRaw = String(form.get("corFundo") ?? "").trim();
  const corFundoHex = /^#[0-9a-fA-F]{6}$/.test(corFundoRaw) ? corFundoRaw : undefined;

  const fotoPosRaw = String(form.get("fotoPos") ?? "centro");
  const fotoPosicao =
    fotoPosRaw === "topo" || fotoPosRaw === "base" ? fotoPosRaw : ("centro" as const);

  const itens = String(form.get("itens") ?? "").trim();
  const layoutRaw = String(form.get("layout") ?? "auto");
  let layout: CardLayout;
  if (layoutRaw === "citacao") layout = "citacao";
  else if (layoutRaw === "lista") layout = "lista";
  else if (layoutRaw === "editorial") layout = "editorial";
  else layout = fotoBuffer ? "foto" : "hero";

  const ilustracaoRaw = String(form.get("ilustracao") ?? "");
  const ilustracao = ILUSTRACOES_DISPONIVEIS.some((i) => i.id === ilustracaoRaw)
    ? (ilustracaoRaw as IlustracaoId)
    : undefined;

  const salvar = String(form.get("salvar") ?? "") === "1";

  try {
    const buffer = await renderCard({
      layout,
      dimensoes,
      brand: {
        nomeMarca: f.instagram_handle || f.nome_comercial || f.nome_completo || "",
        corPrimariaHex: f.cor_primaria_hex || "#2F5D50",
        logoUrl: logoBuffer ? undefined : logoUrlOnboarding,
      },
      conteudo: { headline, eyebrow, subtitle, cta, corpo: itens || undefined },
      fotoBuffer,
      fotoPosicao,
      schemeIndex: esquema >= 0 && esquema <= 2 ? esquema : undefined,
      corFundoHex,
      logoBuffer,
      ilustracao,
    });

    if (salvar) {
      const path = `${f.id}/editor/${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("franqueadas-assets")
        .upload(path, buffer, { contentType: "image/png", upsert: false });
      if (upErr) {
        return NextResponse.json({ erro: `salvar falhou: ${upErr.message}` }, { status: 500 });
      }
      const { data: signed } = await supabase.storage
        .from("franqueadas-assets")
        .createSignedUrl(path, 365 * 24 * 60 * 60);
      const url = signed?.signedUrl ?? path;
      await supabase.from("artes_geradas").insert({
        franqueada_id: f.id,
        url,
        path,
        params: { layout, formato, esquema, corFundoHex, headline },
      } as never);
      return NextResponse.json({ ok: true, url });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "falha ao renderizar" },
      { status: 500 },
    );
  }
}
