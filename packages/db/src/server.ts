import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type CookieStore = {
  getAll: () => { name: string; value: string }[];
  set?: (name: string, value: string, options?: unknown) => void;
};

/**
 * Server client usando cookies (para Server Components + Route Handlers).
 * Passe o cookieStore do `next/headers` ou do NextRequest.
 */
export function createServerSupabase(cookieStore: CookieStore) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set?.(name, value, options);
            });
          } catch {
            // Server Components — middleware trata
          }
        },
      },
    },
  );
}

/**
 * Admin client (service role) — bypassa RLS.
 * APENAS no servidor. Nunca expor no cliente.
 */
export function createAdminSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
