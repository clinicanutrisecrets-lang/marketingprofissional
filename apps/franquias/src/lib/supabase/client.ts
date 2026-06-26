import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

export function createClient() {
  // Fallbacks evitam que o @supabase/ssr (>=0.10) lance durante o prerender
  // quando as envs NEXT_PUBLIC ainda não estão disponíveis. Em runtime/produção
  // os valores reais são inlinados no bundle e usados normalmente.
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
  );
}
