import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
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

  // Rotas protegidas
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/perfis")
  ) {
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
}
