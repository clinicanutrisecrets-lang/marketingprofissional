/**
 * Definição das 10 etapas do onboarding da nutri franqueada.
 * Cada etapa tem label, descrição curta, campos obrigatórios (pra calcular o %)
 * e componente de formulário correspondente.
 */

export type OnboardingStep = {
  id: number;
  slug: string;
  label: string;
  descricao: string;
  camposObrigatorios: string[];
  camposOpcionais: string[];
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    slug: "identidade",
    label: "Sobre você",
    descricao: "Dados pessoais e profissionais básicos",
    camposObrigatorios: ["nome_completo", "email", "whatsapp", "nome_comercial"],
    camposOpcionais: ["cpf", "crn_numero", "crn_estado", "tagline"],
  },
  {
    id: 2,
    slug: "especialidade",
    label: "Sua especialidade",
    descricao: "Nicho, experiência e público-alvo",
    camposObrigatorios: ["nicho_principal", "publico_alvo_descricao"],
    camposOpcionais: [
      "nicho_secundario",
      "especializacoes",
      "anos_experiencia",
      "diferenciais",
    ],
  },
  {
    id: 3,
    slug: "atendimento",
    label: "Atendimento e valores",
    descricao: "Modalidade, localização e pricing",
    camposObrigatorios: ["modalidade_atendimento", "link_agendamento"],
    camposOpcionais: [
      "cidade",
      "estado",
      "endereco_clinica",
      "bairro",
      "plataforma_agendamento",
      "valor_consulta_inicial",
      "valor_consulta_retorno",
      "aceita_plano_saude",
      "planos_aceitos",
    ],
  },
  {
    id: 4,
    slug: "historia",
    label: "Sua história",
    descricao: "Por que você escolheu a nutrição e casos marcantes",
    camposObrigatorios: ["historia_pessoal", "resultado_transformacao"],
    camposOpcionais: ["descricao_longa", "numero_pacientes_atendidos"],
  },
  {
    id: 5,
    slug: "visual",
    label: "Identidade visual",
    descricao: "Cores, estilo e arquivos de marca",
    camposObrigatorios: ["cor_primaria_hex", "estilo_visual"],
    camposOpcionais: [
      "cor_secundaria_hex",
      "cor_terciaria_hex",
      "fonte_titulo",
      "logo_principal", // arquivo
      "foto_profissional", // arquivo
    ],
  },
  {
    id: 6,
    slug: "redes",
    label: "Redes sociais",
    descricao: "Instagram + outras redes (conectar via OAuth)",
    camposObrigatorios: ["instagram_handle"],
    camposOpcionais: [
      "tiktok_handle",
      "youtube_canal",
      "site_proprio",
      "linktree_ou_similar",
    ],
  },
  {
    id: 7,
    slug: "voz",
    label: "Voz e comunicação",
    descricao: "Tom de conteúdo, palavras-chave, hashtags",
    camposObrigatorios: ["tom_comunicacao"],
    camposOpcionais: [
      "palavras_evitar",
      "palavras_chave_usar",
      "hashtags_favoritas",
      "concorrentes_nao_citar",
    ],
  },
  {
    id: 8,
    slug: "provasocial",
    label: "Depoimentos e prova social",
    descricao: "Cases e validação do seu trabalho",
    camposObrigatorios: [],
    camposOpcionais: ["tem_depoimentos", "depoimentos_formato"],
  },
  {
    id: 9,
    slug: "automacao",
    label: "Configurações de automação",
    descricao: "Aprovação semanal, horários, CTA dos anúncios",
    camposObrigatorios: ["aprovacao_modo", "link_cta_anuncio", "tipo_cta_anuncio"],
    camposOpcionais: [
      "horario_preferido_post",
      "dias_post_semana",
      "frequencia_stories",
      "frequencia_reels",
      "faz_anuncio_pago",
      "budget_anuncio_mensal",
      "objetivo_anuncio",
      "texto_cta_botao",
      "mensagem_inicial_whatsapp",
    ],
  },
  {
    id: 10,
    slug: "revisao",
    label: "Revisão e finalização",
    descricao: "Confira tudo e finalize seu onboarding",
    camposObrigatorios: [],
    camposOpcionais: [],
  },
];

/**
 * Calcula o percentual de onboarding baseado nos campos preenchidos.
 * Obrigatórios valem 70% do peso, opcionais valem 30%.
 */
export function calcularPercentual(
  dadosFranqueada: Record<string, unknown>,
): number {
  let obrigatorios = 0;
  let obrigatoriosPreenchidos = 0;
  let opcionais = 0;
  let opcionaisPreenchidos = 0;

  for (const step of ONBOARDING_STEPS) {
    for (const campo of step.camposObrigatorios) {
      obrigatorios += 1;
      if (isPreenchido(dadosFranqueada[campo])) obrigatoriosPreenchidos += 1;
    }
    for (const campo of step.camposOpcionais) {
      opcionais += 1;
      if (isPreenchido(dadosFranqueada[campo])) opcionaisPreenchidos += 1;
    }
  }

  const pesoObrigatorio = obrigatorios === 0 ? 0 : (obrigatoriosPreenchidos / obrigatorios) * 0.7;
  const pesoOpcional = opcionais === 0 ? 0 : (opcionaisPreenchidos / opcionais) * 0.3;

  return Math.round((pesoObrigatorio + pesoOpcional) * 100);
}

function isPreenchido(valor: unknown): boolean {
  if (valor == null) return false;
  if (typeof valor === "string") return valor.trim().length > 0;
  if (Array.isArray(valor)) return valor.length > 0;
  return true;
}

export const NICHOS_OPCOES = [
  { value: "nutricao_funcional", label: "Funcional / Integrativa" },
  { value: "nutricao_esportiva", label: "Esportiva" },
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "nutricao_oncologica", label: "Oncológica" },
  { value: "materno_infantil", label: "Materno-infantil" },
  { value: "longevidade", label: "Longevidade" },
  { value: "saude_feminina", label: "Saúde feminina" },
  { value: "autoimune_intestino", label: "Autoimune / Intestino" },
  { value: "outro", label: "Outro" },
];

export const ESTILOS_VISUAIS = [
  { value: "clean_moderno", label: "Clean moderno", descricao: "Branco, linhas finas, sans-serif" },
  { value: "calido_natural", label: "Cálido e natural", descricao: "Tons terrosos, orgânico" },
  { value: "premium_escuro", label: "Premium escuro", descricao: "Dark, sofisticado" },
  { value: "colorido_vibrante", label: "Colorido vibrante", descricao: "Cores fortes, energia" },
  { value: "minimalista", label: "Minimalista", descricao: "Muito espaço, poucos elementos" },
  { value: "cientifico_serio", label: "Científico e sério", descricao: "Azul/cinza, institucional" },
];

export const TONS_COMUNICACAO = [
  { value: "cientifico_acessivel", label: "Científico acessível", descricao: "Autoridade com linguagem clara" },
  { value: "empatico_acolhedor", label: "Empático acolhedor", descricao: "Próximo, caloroso" },
  { value: "direto_motivacional", label: "Direto motivacional", descricao: "Enérgico, orientado à ação" },
  { value: "sofisticado_premium", label: "Sofisticado premium", descricao: "Refinado, exclusivo" },
  { value: "leve_descontraido", label: "Leve descontraído", descricao: "Humor, leveza" },
];

export const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];
