import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas protegidas da franqueada.
  //
  // 🔴 /onboarding?token=… é EXCEÇÃO: o link de convite do Scanner chega com
  // a pessoa deslogada, e a própria página valida o token e oferece o acesso
  // por link mágico. Sem esta exceção o middleware mandava pro /login pedindo
  // "a senha que você recebeu" — senha que nunca foi enviada — e o convite
  // virava beco sem saída (foi o que travou a Juliana). O token é um UUID que
  // só permite pedir um link pro e-mail já cadastrado, não dá acesso sozinho.
  const convitePorToken =
    pathname.startsWith("/onboarding") && !!request.nextUrl.searchParams.get("token");

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
    if (!user && !convitePorToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // English mirror — protected dashboard routes
  if (pathname.startsWith("/en/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/en/login";
      return NextResponse.redirect(url);
    }
  }

  // Rotas protegidas do admin
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
