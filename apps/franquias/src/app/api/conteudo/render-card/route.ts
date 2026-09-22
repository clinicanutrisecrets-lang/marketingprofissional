import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  renderCardDetalhado,
  normalizarFotoLugar,
  normalizarFotoTamanho,
  type CardLayout,
  type ConteudoPeca,
  type Dimensoes,
} from "@scanner/ai-image";
import { ctaDoSlide, semLink, temLink } from "@/lib/criativo/texto-arte";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Editor de arte: renderiza um card sob demanda com os textos digitados
 * pela nutri e, opcionalmente, uma FOTO DELA (upload) — no lugar e tamanho
 * que ela escolher (topo, base ou ao lado; pequena, média ou grande).
 * Retorna o PNG direto — o front usa como preview e como download. Quando a
 * foto encolheu, não coube ou o layout não a usa, o motivo vai no header
 * `x-aviso-foto` (URL-encoded) pra tela nunca descartar foto em silêncio.
 *
 * Sem ilustração em traço (Aline, 12/09/2026): o campo `ilustracao` deixou
 * de existir — se um cliente antigo mandar, é ignorado.
 */

/** Header ASCII-safe com o aviso da foto (o corpo da resposta é o PNG). */
function headerAviso(aviso: string | null): Record<string, string> {
  return aviso ? { "x-aviso-foto": encodeURIComponent(aviso) } : {};
}
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
  const headline = semLink(String(form.get("headline") ?? ""));
  if (!headline) return NextResponse.json({ erro: "headline obrigatório" }, { status: 400 });

  const eyebrow = semLink(String(form.get("eyebrow") ?? ""));
  const subtitle = semLink(String(form.get("subtitle") ?? ""));
  const cta = semLink(String(form.get("cta") ?? ""));
  // 🔴 Link nunca vira pixel (Aline, 22/09/2026): no Instagram o link escrito
  // na arte não é clicável. Ele sai daqui e a tela avisa, em vez de sumir com
  // o endereço em silêncio e a nutri publicar achando que está lá.
  const removeuLink = [
    String(form.get("headline") ?? ""),
    String(form.get("eyebrow") ?? ""),
    String(form.get("subtitle") ?? ""),
    String(form.get("cta") ?? ""),
    String(form.get("itens") ?? ""),
    String(form.get("slides") ?? ""),
  ].some(temLink);
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
  // Onde a foto entra e que tamanho tem — escolha da nutri (12/09/2026).
  // Valor desconhecido cai no padrão de sempre (topo + média).
  const fotoLugar = normalizarFotoLugar(String(form.get("fotoLugar") ?? ""));
  const fotoTamanho = normalizarFotoTamanho(String(form.get("fotoTamanho") ?? ""));

  const itens = semLink(String(form.get("itens") ?? ""));
  const layoutRaw = String(form.get("layout") ?? "auto");
  let layout: CardLayout;
  if (layoutRaw === "citacao") layout = "citacao";
  else if (layoutRaw === "lista") layout = "lista";
  else if (layoutRaw === "editorial") layout = "editorial";
  else layout = fotoBuffer ? "foto" : "hero";

  // Onde a foto entra no carrossel: "sem" (padrão), "inicio" (capa) ou
  // "fim" (slide de CTA). Pedido da Aline — repetir a foto nos 8 slides
  // ficaria pesado, mas ter a cara da nutri na abertura ou no convite final
  // é justamente o que dá conexão.
  const fotoCarrossel = String(form.get("fotoCarrossel") ?? "sem");

  const salvar = String(form.get("salvar") ?? "") === "1";

  const brandCard = {
    nomeMarca: f.instagram_handle || f.nome_comercial || f.nome_completo || "",
    corPrimariaHex: f.cor_primaria_hex || "#2F5D50",
    logoUrl: logoBuffer ? undefined : logoUrlOnboarding,
  };

  // ——— CARROSSEL: capa + slides de conteúdo + CTA final ———
  if (layoutRaw === "carrossel") {
    const blocos = String(form.get("slides") ?? "")
      .split(/\n\s*---\s*\n/)
      .map((b) => semLink(b))
      .filter(Boolean)
      .slice(0, 8);
    // 🔴 A CAPA NÃO LEVA CTA (Aline, 22/09/2026). Ela é o slide que para o
    // scroll; convite de ação ali queima o espaço mais caro do carrossel — e
    // o CTA ainda aparecia DUAS vezes, porque o último slide já é o dele.
    const conteudos: ConteudoPeca[] = [
      { headline, eyebrow, subtitle },
      ...blocos.map((b) => {
        const [primeira, ...resto] = b.split("\n");
        return { headline: (primeira ?? "").trim(), corpo: resto.join("\n").trim(), eyebrow };
      }),
    ];
    if (cta) conteudos.push({ headline: cta, eyebrow, subtitle: "" });

    // Quem decide em que slide o CTA aparece é a lib, não este arquivo: a
    // mesma régua vale pro Creatomate e pro Bannerbear, e três cópias dela
    // divergiriam caladas. Aqui ela é aplicada slide a slide — a capa recebe
    // "" e some com o convite, o último recebe o texto.
    const total = conteudos.length;
    for (let i = 0; i < total; i++) {
      const doSlide = ctaDoSlide({ cta, indice: i, total });
      conteudos[i] = { ...conteudos[i]!, cta: doSlide || undefined };
    }

    try {
      const buffers: Buffer[] = [];
      let avisoFoto: string | null = null;
      // Foto pedida pra um slide que não existe (ex.: "no slide final" sem
      // frase de CTA) — avisar, nunca sumir com a foto em silêncio.
      const temSlideFinal = conteudos.length > 1 && !!cta;
      if (fotoBuffer && fotoCarrossel === "fim" && !temSlideFinal) {
        avisoFoto = "Escreva a frase manuscrita pra existir o slide final — sem ela a foto não entrou.";
      }
      for (let i = 0; i < conteudos.length; i++) {
        const ehCapa = i === 0;
        const ehUltimo = i === conteudos.length - 1 && temSlideFinal;
        const levaFoto =
          !!fotoBuffer &&
          ((fotoCarrossel === "inicio" && ehCapa) || (fotoCarrossel === "fim" && ehUltimo));
        const r = await renderCardDetalhado({
          layout: levaFoto ? "foto" : ehCapa || ehUltimo ? "hero" : "conteudo",
          fotoBuffer: levaFoto ? fotoBuffer : undefined,
          fotoPosicao,
          fotoLugar,
          fotoTamanho,
          dimensoes: "1080x1350",
          brand: brandCard,
          conteudo: conteudos[i]!,
          schemeIndex: ehCapa || ehUltimo ? 0 : 1,
          corFundoHex,
          // Logo em TODOS os slides (antes só na capa — os miolos saíam sem
          // marca nenhuma). Sem upload, o renderer cai na logo do onboarding.
          logoBuffer,
        });
        if (levaFoto && r.avisoFoto) avisoFoto = r.avisoFoto;
        buffers.push(r.buffer);
      }

      if (salvar) {
        const urls: string[] = [];
        for (let i = 0; i < buffers.length; i++) {
          const path = `${f.id}/editor/${Date.now()}_slide${i + 1}.png`;
          const { error: upErr } = await supabase.storage
            .from("franqueadas-assets")
            .upload(path, buffers[i]!, { contentType: "image/png", upsert: false });
          if (upErr) continue;
          const { data: signed } = await supabase.storage
            .from("franqueadas-assets")
            .createSignedUrl(path, 365 * 24 * 60 * 60);
          const url = signed?.signedUrl ?? path;
          urls.push(url);
          await supabase.from("artes_geradas").insert({
            franqueada_id: f.id,
            url,
            path,
            params: { layout: "carrossel", formato: "retrato", headline: `${headline} (slide ${i + 1}/${buffers.length})` },
          } as never);
        }
        return NextResponse.json({ ok: true, urls, avisoFoto, removeuLink });
      }

      return NextResponse.json({
        ok: true,
        avisoFoto,
        removeuLink,
        slides: buffers.map((b) => `data:image/png;base64,${b.toString("base64")}`),
      });
    } catch (e) {
      return NextResponse.json(
        { erro: e instanceof Error ? e.message : "falha ao renderizar carrossel" },
        { status: 500 },
      );
    }
  }

  try {
    const { buffer, avisoFoto } = await renderCardDetalhado({
      layout,
      dimensoes,
      brand: brandCard,
      conteudo: { headline, eyebrow, subtitle, cta, corpo: itens || undefined },
      fotoBuffer,
      fotoPosicao,
      fotoLugar,
      fotoTamanho,
      schemeIndex: esquema >= 0 && esquema <= 2 ? esquema : undefined,
      corFundoHex,
      logoBuffer,
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
        params: { layout, formato, esquema, corFundoHex, headline, fotoLugar, fotoTamanho },
      } as never);
      return NextResponse.json({ ok: true, url, avisoFoto });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "image/png",
        "cache-control": "no-store",
        ...headerAviso(avisoFoto),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "falha ao renderizar" },
      { status: 500 },
    );
  }
}
