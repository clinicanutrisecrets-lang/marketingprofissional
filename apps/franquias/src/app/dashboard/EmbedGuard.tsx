"use client";

import { useEffect } from "react";
import { EMBED_COOKIE } from "@/lib/embed/destino";

/**
 * Só existe no modo embutido. Se a página NÃO está dentro de um iframe (a
 * nutri abriu app.scannerdasaude.com direto, numa aba, com o cookie de embed
 * ainda vivo), apaga o cookie e recarrega — senão ela ficaria sem barra
 * lateral, sem Sair e sem rodapé numa aba onde não há moldura do Scanner.
 *
 * O `window.top` pode lançar em iframe cross-origin; qualquer exceção conta
 * como "está embutido" (é o caso em que o acesso é negado).
 */
export function EmbedGuard() {
  useEffect(() => {
    let dentroDeIframe = true;
    try {
      dentroDeIframe = window.self !== window.top;
    } catch {
      dentroDeIframe = true;
    }
    if (dentroDeIframe) return;
    document.cookie = `${EMBED_COOKIE}=; path=/; max-age=0`;
    window.location.reload();
  }, []);
  return null;
}
