"use client";

import { useEffect } from "react";

/**
 * Resgata o link de recuperação de senha que cai na porta errada.
 *
 * O Supabase só redireciona pra URLs que estão na lista de permitidas; se a
 * `/nova-senha` não estiver lá, ele manda a pessoa pro Site URL levando o
 * token no fragmento (#access_token=...&type=recovery). Sem isto ela cai na
 * home, não vê nada acontecer e o link parece quebrado.
 *
 * Este componente só observa o fragmento: se for um link de recuperação e a
 * pessoa não estiver na /nova-senha, encaminha pra lá preservando o token.
 * Assim o fluxo funciona mesmo com a lista de URLs desatualizada, e continua
 * correto quando ela for configurada (aí o link já chega direto e este código
 * nunca dispara).
 */
export function RecuperacaoRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes("type=recovery")) return;
    if (window.location.pathname.startsWith("/nova-senha")) return;
    window.location.replace(`/nova-senha${hash}`);
  }, []);

  return null;
}
