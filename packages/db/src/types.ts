/**
 * Tipos do banco Supabase.
 * Regenerar com: pnpm supabase gen types typescript --project-id mfldshdxulqxskwcoxrl
 *
 * Por enquanto, referenciamos o arquivo existente em apps/franquias.
 * Próxima iteração: mover a geração pra um script do monorepo.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Placeholder — apps usam os tipos próprios em src/lib/types/database.ts
// enquanto a geração unificada não é configurada.
export type Database = {
  __InternalSupabase: { PostgrestVersion: string };
  public: {
    Tables: Record<string, unknown>;
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
    CompositeTypes: Record<string, unknown>;
  };
};
