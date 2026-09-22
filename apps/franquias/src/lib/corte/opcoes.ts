/**
 * As escolhas da nutri na hora de mandar o vídeo pra edição: filtro de imagem
 * e estilo de legenda. Pedido da Aline (21/09/2026).
 *
 * 🔴 Este arquivo é a fonte única dos nomes. Os mesmos identificadores vivem
 * em `packages/video-filtro/engine/presets.py` e
 * `packages/corte-ia/legenda_estilos.py` — nome escrito duas vezes diverge
 * calado, e aqui o sintoma seria a nutri escolher "completo" e receber o
 * vídeo sem filtro nenhum, sem erro em lugar algum.
 * `opcoes.test.ts` compara os dois lados.
 */

export const FILTROS = [
  {
    id: "nenhum",
    rotulo: "Sem filtro",
    ajuda: "A imagem sai como a câmera gravou.",
  },
  {
    id: "pele",
    rotulo: "Pele",
    ajuda: "Suaviza a textura da pele, dá contraste ao cabelo e clareia os dentes. Não desenha nada no rosto, serve pra qualquer pessoa.",
  },
  {
    id: "completo",
    rotulo: "Completo",
    ajuda: "Tudo do Pele, mais batom vinho e delineador levantado (o olho de gatinho).",
  },
] as const;

export type FiltroId = (typeof FILTROS)[number]["id"];
export const FILTRO_PADRAO: FiltroId = "nenhum";

export const ESTILOS_LEGENDA = [
  {
    id: "classica",
    rotulo: "Clássica",
    ajuda: "Letra grossa em caixa alta, palavra falada em âmbar.",
  },
  {
    id: "editorial",
    rotulo: "Editorial",
    ajuda: "Serifada, caixa mista, palavra falada em Tiffany. Mais calma.",
  },
  {
    id: "impacto",
    rotulo: "Impacto",
    ajuda: "Tudo em bloco, sem pílula. Pra vídeo curto e direto.",
  },
] as const;

export type EstiloLegendaId = (typeof ESTILOS_LEGENDA)[number]["id"];
export const ESTILO_PADRAO: EstiloLegendaId = "classica";

/**
 * Teto por origem. A gravação no teleprompter continua em 1 minuto (é o
 * formato do reel); o arquivo que ela já gravou no celular pode ser maior,
 * porque não foi feito pensando nisso.
 *
 * 🔴 O teto do upload NÃO é só gosto: cada minuto a mais é minuto de worker,
 * e com filtro ligado o custo por quadro multiplica. 3 minutos é onde ainda
 * fecha dentro do timeout de 90 min do workflow com folga.
 */
export const UPLOAD_MAX_SEG = 180;
export const UPLOAD_MAX_MB = 100;

export function filtroValido(v: unknown): FiltroId {
  const s = String(v ?? "").trim().toLowerCase();
  return (FILTROS.find((f) => f.id === s)?.id ?? FILTRO_PADRAO) as FiltroId;
}

export function estiloValido(v: unknown): EstiloLegendaId {
  const s = String(v ?? "").trim().toLowerCase();
  return (ESTILOS_LEGENDA.find((e) => e.id === s)?.id ?? ESTILO_PADRAO) as EstiloLegendaId;
}

/** Quanto tempo avisar que vai demorar, por escolha. Número honesto importa:
 *  quem espera 4 minutos e recebe em 20 acha que quebrou. */
export function estimativaMinutos(duracaoSeg: number, filtro: FiltroId): [number, number] {
  const base: [number, number] = [3, 5];
  if (filtro === "nenhum") return base;
  // ~0,7 s de processamento por quadro a 25 fps
  const extra = Math.ceil((duracaoSeg * 25 * 0.7) / 60);
  return [base[0] + extra, base[1] + Math.ceil(extra * 1.6)];
}
