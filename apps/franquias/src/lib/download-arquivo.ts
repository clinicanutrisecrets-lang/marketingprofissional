"use client";

import { enderecoDeDownload, urlArtePermitida } from "./arte-download";

/**
 * Baixar arte, em UM lugar só.
 *
 * Histórico: o atributo `download` do <a> só vale no mesmo domínio, e as artes
 * moram no Storage do Supabase (outro domínio) — por isso, em 12/08/2026, o
 * botão passou a buscar o arquivo e salvar por um link `blob:`. Dentro do
 * Scanner (iframe de outro domínio) esse caminho também falhou, calado
 * (27/10/2026, Daiane no Android). Agora o link aponta pra
 * `/api/arte/baixar`, do próprio Marketing, que devolve o arquivo como anexo:
 * mesmo domínio, link comum, sem blob. Ver `arte-download.ts`.
 *
 * Devolve `true` quando o download foi disparado (o navegador cuida do resto).
 */
export async function baixarArquivo(url: string, nome: string): Promise<boolean> {
  const propria = url.startsWith("/") && !url.startsWith("//");
  if (!propria && !urlArtePermitida(url, process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    // Endereço que a rota não aceita (fora do Storage do Marketing): fica no
    // caminho antigo, que ao menos funciona fora do Scanner.
    return baixarPorBlob(url, nome);
  }
  try {
    const a = document.createElement("a");
    a.href = enderecoDeDownload(url, nome);
    a.download = nome;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Vários downloads em sequência (carrossel, "Baixar as N artes"): um
    // respiro entre eles pra o navegador não juntar nem cancelar.
    await new Promise((r) => setTimeout(r, 400));
    return true;
  } catch {
    return false;
  }
}

async function baixarPorBlob(url: string, nome: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const objectUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoga depois pra não cancelar o download em curso no Safari.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return true;
  } catch {
    return false;
  }
}
