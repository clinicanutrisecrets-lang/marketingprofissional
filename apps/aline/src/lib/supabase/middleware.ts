import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
        setAll(cookiesToSet) {
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

      // Só super_admin acessa Studio Aline
      const { data: admin } = await supabase
        .from("admins")
        .select("papel")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      const adminRow = admin as { papel?: string } | null;
      if (!adminRow || adminRow.papel !== "super_admin") {
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
