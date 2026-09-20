import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

/**
 * 🔴 TODA chamada à Supabase sai SEM cache (11/09/2026 — o "Marketing fora do ar").
 *
 * No Next 14.2 o `fetch` global dentro de uma rota GET é cacheado por padrão
 * (Data Cache da Vercel), e `export const dynamic = "force-dynamic"` NÃO desliga
 * isso: ele só marca a rota como dinâmica. O cache do fetch só é desligado
 * quando `revalidate` vira 0 — e isso acontece quando `cookies()`/`headers()`
 * são chamados ANTES do fetch. O admin client não lê cookie nenhum, então no
 * `/sso` a resposta do `POST /admin/generate_link` (o magic link que abre a
 * sessão) ficava guardada: a SEGUNDA entrada da mesma nutri recebia o hash já
 * consumido na primeira, e o `verifyOtp` devolvia "Email link is invalid or
 * has expired". Medido: 47 falhas, 4 pessoas, de 11/08 a 11/09 — sempre "a
 * primeira entrada funciona, as seguintes caem" (Juliana: entrou 09:46:08 e
 * falhou 09:46:27, 19 segundos depois).
 *
 * Nada que venha da Supabase pode sair de cache — leitura de banco cacheada é
 * dado velho sem aviso, e magic link cacheado é login que não abre. Por isso o
 * `cache: "no-store"` fica AQUI, na fábrica dos dois clients, e vale para toda
 * rota de uma vez, em vez de cada rota lembrar de declarar `fetchCache`.
 */
const fetchSemCache: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchSemCache },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — safe to ignore, middleware handles refresh
          }
        },
      },
    },
  );
}

/**
 * Cliente admin (service role) — usa APENAS em rotas de servidor,
 * nunca expor no cliente. Bypassa RLS.
 */
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: { fetch: fetchSemCache },
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}
