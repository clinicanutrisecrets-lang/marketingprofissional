"use client";

/**
 * Copiar texto pra área de transferência, em UM lugar só.
 *
 * 🔴 A Juliana e a Daiane (27/10/2026, computador: Mac e Android) clicavam em
 * "Copiar legenda" e nada ia pra área de transferência, sem aviso nenhum. O
 * Marketing abre DENTRO do Scanner (iframe de outro domínio), e ali o navegador
 * pode recusar `navigator.clipboard` mesmo com `allow="clipboard-write"` no
 * iframe (Safari ignora esse atributo; o Chrome exige o foco e o clique
 * frescos). O `catch` engolia a recusa e a tela ficava calada.
 *
 * Agora: tenta o caminho moderno; recusado, cai no antigo (textarea
 * selecionado + `execCommand("copy")`), que vale dentro de iframe enquanto o
 * clique ainda é recente. Se os dois falharem, devolve `false` e a TELA avisa
 * pra copiar à mão: nunca mais silêncio.
 */
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* recusado: tenta o caminho antigo abaixo */
  }
  return copiarPorSelecao(texto);
}

function copiarPorSelecao(texto: string): boolean {
  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  // Fora da tela, sem rolar a página nem abrir teclado no celular.
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "-9999px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  const focoAntes = document.activeElement as HTMLElement | null;
  try {
    area.select();
    area.setSelectionRange(0, texto.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    focoAntes?.focus?.();
  }
}

/** Aviso único pra quando o navegador recusa as duas formas de copiar. */
export const AVISO_COPIAR_A_MAO =
  "O navegador não deixou copiar sozinho. Selecione o texto e copie com Ctrl+C (no Mac, Cmd+C).";
