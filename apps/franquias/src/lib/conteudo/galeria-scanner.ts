import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { linkAssinadoOuCaminho } from "@/lib/storage/link-assinado";
import { caminhoDaGaleriaValido, MAX_SLIDES_GALERIA, nomeDoSlide } from "./galeria-scanner-regras";

/**
 * O carrossel do Scanner também fica na "Minha galeria" (Aline, 07/11/2026:
 * "faz o carrossel salvar na galeria também").
 *
 * O carrossel é montado no navegador, dentro do Scanner, e antes só baixava o
 * zip. Agora o Scanner pede aqui, pelo canal assinado de sempre
 * (SCANNER_WEBHOOK_SECRET), um endereço de envio por slide; o navegador sobe
 * cada PNG direto pro Storage deste app (não passa pela Vercel, que limita o
 * tamanho do corpo) e o Scanner confirma, e aí cada slide vira uma linha de
 * `artes_geradas`, igual ao carrossel do Editor de arte.
 */

const BUCKET = "franqueadas-assets";

type Admin = ReturnType<typeof createAdminClient>;

/** Mesma ordem do /sso e do conteudo-pronto: vínculo direto, depois e-mail. */
export async function franqueadaDoScanner(admin: Admin, scannerUserId: string, email: string): Promise<string | null> {
  if (scannerUserId) {
    const { data, error } = await admin.from("franqueadas").select("id").eq("scanner_saas_user_id", scannerUserId).maybeSingle();
    if (error) console.error("[galeria-scanner] vínculo não lido", error.message);
    const id = (data as { id: string } | null)?.id;
    if (id) return id;
  }
  if (email) {
    const { data, error } = await admin.from("franqueadas").select("id").eq("email", email).maybeSingle();
    if (error) console.error("[galeria-scanner] e-mail não lido", error.message);
    return (data as { id: string } | null)?.id ?? null;
  }
  return null;
}

export async function prepararSlides(
  admin: Admin,
  franqueadaId: string,
  quantos: number,
): Promise<{ ok: true; envios: Array<{ path: string; uploadUrl: string }> } | { ok: false; erro: string }> {
  const n = Math.floor(Number(quantos));
  if (!(n >= 1 && n <= MAX_SLIDES_GALERIA)) return { ok: false, erro: "quantidade de slides inválida" };
  const lote = Date.now();
  const envios: Array<{ path: string; uploadUrl: string }> = [];
  for (let i = 0; i < n; i++) {
    const path = nomeDoSlide(franqueadaId, lote, i);
    const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[galeria-scanner] envio não preparado", path, error?.message);
      return { ok: false, erro: "não consegui preparar o envio" };
    }
    envios.push({ path, uploadUrl: data.signedUrl });
  }
  return { ok: true, envios };
}

/** Os slides chegaram: grava na galeria, na ordem. Só caminho desta conta, e só o que existe no Storage. */
export async function confirmarSlides(
  admin: Admin,
  franqueadaId: string,
  paths: unknown,
  titulo: string,
): Promise<{ ok: true; salvos: number } | { ok: false; erro: string }> {
  const lista = Array.isArray(paths) ? paths.map(String) : [];
  if (!lista.length || lista.length > MAX_SLIDES_GALERIA) return { ok: false, erro: "slides inválidos" };
  if (!lista.every((p) => caminhoDaGaleriaValido(franqueadaId, p))) return { ok: false, erro: "slide de outra conta" };

  const pasta = lista[0]!.split("/").slice(0, -1).join("/");
  const { data: existentes, error: errLista } = await admin.storage.from(BUCKET).list(pasta, { limit: 1000 });
  if (errLista) return { ok: false, erro: "não consegui conferir os slides" };
  const nomes = new Set((existentes ?? []).map((o) => o.name));
  const faltando = lista.filter((p) => !nomes.has(p.split("/").pop()!));
  if (faltando.length) return { ok: false, erro: `${faltando.length} slide(s) não chegaram` };

  const titulo80 = String(titulo || "Carrossel").replace(/\s+/g, " ").trim().slice(0, 120) || "Carrossel";
  const linhas = [];
  for (let i = 0; i < lista.length; i++) {
    const url = await linkAssinadoOuCaminho(admin.storage.from(BUCKET), lista[i]!);
    linhas.push({
      franqueada_id: franqueadaId,
      url,
      path: lista[i],
      params: {
        layout: "carrossel",
        formato: "retrato",
        origem: "scanner-carrossel",
        headline: `${titulo80} (slide ${i + 1}/${lista.length})`,
      },
    });
  }
  const { error } = await admin.from("artes_geradas").insert(linhas as never);
  if (error) {
    console.error("[galeria-scanner] galeria não gravada", franqueadaId, error.message);
    return { ok: false, erro: "não consegui gravar na galeria" };
  }
  return { ok: true, salvos: linhas.length };
}
