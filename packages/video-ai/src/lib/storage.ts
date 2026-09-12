import fs from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";
import { cfg, exigirFal, temSupabase } from "./config.ts";
import { log } from "./log.ts";

let cliente: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!temSupabase()) throw new Error("Supabase não configurado (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).");
  if (!cliente) {
    cliente = createClient(cfg.supabaseUrl!, cfg.supabaseServiceKey!, { auth: { persistSession: false } });
  }
  return cliente;
}

/** Bucket PRIVADO: o dataset são fotos e vídeos dela; a fal lê por URL assinada. */
export async function garantirBucket(): Promise<void> {
  const sb = supabaseAdmin();
  const { data } = await sb.storage.getBucket(cfg.bucket);
  if (data) return;
  const { error } = await sb.storage.createBucket(cfg.bucket, { public: false });
  if (error && !/already exists/i.test(error.message)) throw new Error(`Não consegui criar o bucket ${cfg.bucket}: ${error.message}`);
  log.ok(`Bucket ${cfg.bucket} criado (privado).`);
}

export const VALIDADE_URL_SEG = 7 * 24 * 3600;

export async function subirParaSupabase(arquivoLocal: string, pathRemoto: string, contentType: string): Promise<{ path: string; url: string }> {
  const sb = supabaseAdmin();
  await garantirBucket();
  const corpo = fs.readFileSync(arquivoLocal);
  const { error } = await sb.storage.from(cfg.bucket).upload(pathRemoto, corpo, { contentType, upsert: true });
  if (error) throw new Error(`Upload falhou (${pathRemoto}): ${error.message}`);
  const url = await urlAssinada(pathRemoto);
  return { path: pathRemoto, url };
}

export async function urlAssinada(pathRemoto: string): Promise<string> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.storage.from(cfg.bucket).createSignedUrl(pathRemoto, VALIDADE_URL_SEG);
  if (error || !data?.signedUrl) throw new Error(`Não consegui assinar ${pathRemoto}: ${error?.message ?? "sem URL"}`);
  return data.signedUrl;
}

/** Sem Supabase: o próprio storage da fal guarda o pacote (URL da CDN deles). */
export async function subirParaFal(arquivoLocal: string, contentType: string): Promise<string> {
  fal.config({ credentials: exigirFal() });
  const corpo = fs.readFileSync(arquivoLocal);
  const blob = new Blob([corpo], { type: contentType });
  return fal.storage.upload(blob);
}
