import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createBrowserSupabase(
  url: string = process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
) {
  return createBrowserClient<Database>(url, anonKey);
}
