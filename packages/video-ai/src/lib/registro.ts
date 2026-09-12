import fs from "node:fs";
import { ARQUIVO_LORAS } from "./config.ts";
import { temSupabase } from "./config.ts";
import { log } from "./log.ts";
import type { RegistroLora } from "./regras.ts";
import { supabaseAdmin } from "./storage.ts";

export function lerRegistro(): RegistroLora[] {
  if (!fs.existsSync(ARQUIVO_LORAS)) return [];
  return JSON.parse(fs.readFileSync(ARQUIVO_LORAS, "utf8")) as RegistroLora[];
}

/** loras.json é a fonte de verdade local e vai pro git; a tabela é o espelho. */
export function gravarRegistro(item: RegistroLora): void {
  const lista = lerRegistro().filter((r) => r.id !== item.id);
  lista.push(item);
  fs.writeFileSync(ARQUIVO_LORAS, JSON.stringify(lista, null, 2) + "\n");
}

/** Best-effort: sem Supabase, ou sem a migração aplicada, só avisa. */
export async function espelharNoBanco(item: RegistroLora): Promise<void> {
  if (!temSupabase()) return;
  try {
    const sb = supabaseAdmin();
    const { error } = await sb.schema("aline").from("video_loras").upsert(
      {
        id: item.id,
        nome: item.nome,
        dataset: item.dataset,
        modo: item.modo,
        passos: item.passos,
        learning_rate: item.learning_rate,
        trigger: item.trigger,
        lora_url: item.lora_url,
        lora_storage_path: item.lora_storage_path ?? null,
        config_url: item.config_url ?? null,
        request_id: item.request_id,
        custo_estimado_usd: item.custo_estimado_usd,
        pacote_url: item.pacote_url,
        criado_em: item.criado_em,
      },
      { onConflict: "id" },
    );
    if (error) log.aviso(`Registro salvo em loras.json, mas a tabela aline.video_loras recusou: ${error.message} (aplicou a migração 013_video_ai.sql?)`);
  } catch (e) {
    log.aviso(`Registro salvo em loras.json; espelho no banco falhou: ${(e as Error).message}`);
  }
}
