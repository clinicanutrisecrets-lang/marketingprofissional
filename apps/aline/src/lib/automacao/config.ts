/** Chaves gerais do robô por perfil (aline.perfis.automacao_config). */

export type AutomacaoConfig = {
  /** Agradece em público todo comentário sem regra (texto gerado). */
  agradecer_comentarios: boolean;
  /** Responde DM sem regra consultando a base do Scanner. */
  responder_dm_scanner: boolean;
  /** Resposta pública quando o comentário é pergunta clínica individual. */
  texto_convite_direct: string;
  /** Texto enviado na DM quando o robô decide passar pra uma pessoa. */
  texto_encaminhar_humano: string;
};

export const CONFIG_PADRAO: AutomacaoConfig = {
  agradecer_comentarios: false,
  responder_dm_scanner: false,
  texto_convite_direct: "Obrigada pela pergunta! Isso depende do seu caso, então te respondo melhor no direct. Me chama lá 💬",
  texto_encaminhar_humano: "Obrigada pela mensagem! Alguém da equipe continua essa conversa com você em breve.",
};

export function lerConfig(bruto: unknown): AutomacaoConfig {
  const c = (bruto ?? {}) as Partial<Record<keyof AutomacaoConfig, unknown>>;
  return {
    agradecer_comentarios: c.agradecer_comentarios === true,
    responder_dm_scanner: c.responder_dm_scanner === true,
    texto_convite_direct:
      typeof c.texto_convite_direct === "string" && c.texto_convite_direct.trim()
        ? c.texto_convite_direct
        : CONFIG_PADRAO.texto_convite_direct,
    texto_encaminhar_humano:
      typeof c.texto_encaminhar_humano === "string" && c.texto_encaminhar_humano.trim()
        ? c.texto_encaminhar_humano
        : CONFIG_PADRAO.texto_encaminhar_humano,
  };
}
