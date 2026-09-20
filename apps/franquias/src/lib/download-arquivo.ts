"use client";

/**
 * Baixar arquivo do Storage de verdade, em UM lugar só.
 *
 * 🔴 O atributo `download` do <a> só funciona same-origin, e as artes moram no
 * Storage do Supabase (outro domínio). O navegador ignora o `download` e, com
 * target="_blank", ou abre a imagem numa aba ou é barrado como popup: pra
 * Juliana o botão simplesmente "não fazia nada" (12/08/2026). Buscando o
 * arquivo e criando um blob local, o download acontece.
 *
 * Estava escrito dentro do SugestaoCard; virou lib quando a tela "Aprovar
 * semana" passou a baixar arte também — duas cópias divergem calado, e a que
 * divergisse repetiria exatamente o bug acima.
 */
export async function baixarArquivo(url: string, nome: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
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
