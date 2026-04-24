import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Se env vars nao configuradas, deixa passar (pra login page pelo menos renderizar)
  if (!supabaseUrl || !supabaseAnon) {
    console.error("[middleware] Supabase env vars ausentes");
    return response;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    // Rotas protegidas
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/perfis")) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }

      // Checa admin via service_role pra não depender de RLS no middleware
      // (evita problemas de propagação de JWT em edge runtime).
      // Seguro: o user já foi validado via getUser() acima.
      if (!serviceKey) {
        console.error("[middleware] SUPABASE_SERVICE_ROLE_KEY ausente");
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("forbidden", "1");
        return NextResponse.redirect(url);
      }

      const admin = createJsClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: adminData, error: adminErr } = await admin
        .from("admins")
        .select("papel")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (adminErr) {
        console.error("[middleware] erro lendo admins:", adminErr);
      }

      const adminRow = adminData as { papel?: string } | null;
      if (!adminRow || adminRow.papel !== "super_admin") {
        console.error("[middleware] forbidden", {
          userId: user.id,
          email: user.email,
          adminRow,
        });
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("forbidden", "1");
        return NextResponse.redirect(url);
      }
    }

    return response;
  } catch (e) {
    console.error("[middleware] erro:", e);
    return response;
  }
}
