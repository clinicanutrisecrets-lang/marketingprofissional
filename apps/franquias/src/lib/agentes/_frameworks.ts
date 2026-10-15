/**
 * Frameworks-chave dos maiores nomes de copy/tráfego/branding,
 * extraidos pra serem injetados nos system prompts dos agentes IA.
 *
 * Fonte: agentes do curso xquads-squads (xquads). Selecao curada
 * pra contexto brasileiro + nicho saude/nutricao premium.
 *
 * USO: importar a constante e concatenar no system prompt.
 *   const SYSTEM = `${ICP_TICKET_ALTO_NUTRI_PREMIUM}\n${FRAMEWORK_PEDRO_SOBRAL}\n...`;
 */

// ============================================================
// TRAFEGO PAGO
// ============================================================

export const FRAMEWORK_PEDRO_SOBRAL = `
=== PEDRO SOBRAL — gestão de tráfego BR ===
3 TIPOS DE CAMPANHA (90% do resultado vem dominar esses 3):
  1. Criação de audiência — topo do funil, awareness
  2. Captação de leads — meio, formulários/wpp/dm
  3. Geração de vendas — fundo, conversão

4 PILARES DA SEGMENTAÇÃO:
  - Públicos (interesses, comportamentos, demográficos)
  - Criativos (hook auto-seleciona quem assiste)
  - Objetivo da campanha (sinaliza algoritmo)
  - Pixel (eventos de conversão + lookalike)

TEMPERATURA DE PÚBLICO:
  - Quentes (últimos 7d, carrinho abandonado, visitantes site)
  - Mornos (contato anterior não recente)
  - Frios (sem engajamento, base interesses)

ESTRATÉGIA DO PASSO ANTERIOR:
  Mire em quem está 1 PASSO ANTES do objetivo de conversão final.
  Ex: pra venda, mira em quem viu página de produto / adicionou ao carrinho.

ESTRUTURA IDEAL:
  - 4 a 8 ad sets por campanha (12+ underperforma)
  - CBO pra escalar / ABO pra testes controlados
  - Mude UMA variável por vez

CADENCIA DE MONITORAMENTO:
  - Criativos: cada 2-3 dias
  - Públicos: cada 4 dias
  - Orçamento: cada 2 dias
  - Estrutura: cada 7 dias

PRINCIPIOS:
  - "Criativo é o novo público" — qualidade do criativo > especificidade do público
  - Cada centavo investido em tráfego pago é um TESTE
  - O que funciona hoje pode não funcionar amanhã
  - Nunca confie cego na IA da plataforma — ela otimiza pelo lucro DELA, não seu
`;

export const FRAMEWORK_MOLLY_PITTMAN = `
=== MOLLY PITTMAN — Ad Grid & Traffic Temperature ===
AD GRID (planejamento sistemático):
  - Eixo X: avatares (2-4 segmentos distintos)
  - Eixo Y: hooks (2-4 angulos diferentes)
  - Cada célula = 1 ad único (avatar X hook)
  - Testar todas; ganhadores revelam o que ressoa em escala

5 TIPOS DE HOOK:
  - Pain/Benefit (dor conhecida que a oferta resolve)
  - Average Day (como melhora o dia-a-dia: tempo, energia)
  - Emotion (como vão SE SENTIR depois)
  - Logic (dados, prova, ROI)
  - Status (upgrade de status, certificacao, conquista)
REGRA: 1 hook não serve pra todo avatar. Min 2 hooks por campanha.

3-PART AD COPY (cada ad):
  1. ENTER — entre na conversa que já está na cabeça DELES (sobre eles, não você)
  2. TRANSITION — ponte da dor até o "estado depois" + sua solução
  3. CTA — diga EXATAMENTE o que fazer

TRAFFIC TEMPERATURE:
  - Cold (nunca ouviu falar): não venda, EDUQUE. Lead magnets, conteúdo
  - Warm (1-2 toques): aprofunda relação, move pra conversão
  - Hot (comprou ou super engajado): retargeting, upsell, fidelidade
  REGRA: copy/imagem/oferta DEVEM mudar com a temperatura

SCALING:
  - Vertical: aumenta budget em vencedores (mesma audiência)
  - Horizontal: novos públicos/hooks/ofertas pra novos segmentos
`;

export const FRAMEWORK_DEPESH_MANDALIA = `
=== DEPESH MANDALIA — escala e otimização Meta ===
QUANDO ESCALAR:
  - Frequency 1.5-2.0 + CPL no benchmark = +20-30% budget
  - ROAS 30%+ acima do alvo = duplicar criativo, escalar horizontal

QUANDO MATAR:
  - Frequency > 2.5 em <7 dias = saturação, troca criativo
  - Gasto > 3x do CPL alvo SEM 1 lead = pausar
  - CTR < 0.8% = criativo fraco, refazer

REGRA DE 3 (decisão):
  - Espere 3 dias OU 3x CPL alvo gasto antes de decidir
  - Sem dados suficientes = não mexer
`;

// ============================================================
// COPY
// ============================================================

/**
 * Os 5 níveis de awareness do Schwartz como DADO, não como texto solto.
 *
 * Fonte única: o bloco FRAMEWORK_EUGENE_SCHWARTZ logo abaixo é MONTADO a
 * partir desta lista, e o gerador de posts (lib/claude/consciencia.ts) lê a
 * MESMA lista pra montar a diretriz de copy por nível. Duas cópias do
 * framework divergiriam em silêncio: alguém corrige o texto num lugar, o
 * outro segue com a versão velha e ninguém percebe.
 *
 * O texto dos campos é o original do framework (estilo de anotação de
 * curso), já em produção nos prompts dos agentes de ads/storytelling. Ganhou
 * acento em 15/10/2026: o modelo copia o que lê, e prompt sem acento puxa
 * copy sem acento. Adaptação pra copy de Instagram em pt-BR fica em
 * lib/claude/consciencia.ts, que ADICIONA sem reescrever o que está aqui.
 */
export type NivelAwarenessSchwartz = {
  /** Posição no framework (1 = unaware ... 5 = most aware). É a chave de junção. */
  ordem: 1 | 2 | 3 | 4 | 5;
  /** Rótulo original em inglês, como o mercado de copy usa. */
  nome: string;
  /**
   * Fatia do mercado nesse nível, exatamente como o framework escreve dentro
   * dos parênteses (o original só escreve "do mercado" no nível 1).
   */
  fatia_mercado: string;
  /** Em que ponto a pessoa está. */
  estado: string;
  /** O que a copy tem que fazer nesse nível (as linhas com "→" do framework). */
  diretrizes: string[];
};

export const NIVEIS_AWARENESS_SCHWARTZ: NivelAwarenessSchwartz[] = [
  {
    ordem: 1,
    nome: "UNAWARE",
    fatia_mercado: "60% do mercado",
    estado: "não sabe que tem o problema",
    diretrizes: [
      "Headline emocional/identidade/história. NÃO mencione produto cedo.",
    ],
  },
  {
    ordem: 2,
    nome: "PROBLEM AWARE",
    fatia_mercado: "20%",
    estado: "sente a dor, não conhece soluções",
    diretrizes: [
      "Lidere com empatia da dor, agite, depois revele solução",
      'Ex: "Se você sofre com X, leia isso"',
    ],
  },
  {
    ordem: 3,
    nome: "SOLUTION AWARE",
    fatia_mercado: "10%",
    estado: "conhece soluções, não seu produto",
    diretrizes: [
      "Lidere com resultado desejado, depois conecte ao produto",
      'Ex: "Como [resultado] sem [dor]"',
    ],
  },
  {
    ordem: 4,
    nome: "PRODUCT AWARE",
    fatia_mercado: "7%",
    estado: "conhece seu produto, não convencido",
    diretrizes: ["Diferenciação, prova, depoimentos"],
  },
  {
    ordem: 5,
    nome: "MOST AWARE",
    fatia_mercado: "3%",
    estado: "quer comprar, só precisa da oferta",
    diretrizes: ["Nome do produto + preço/oferta direto"],
  },
];

/** A regra que amarra os 5 níveis. Linha a linha, sem indentação. */
export const REGRA_NUCLEAR_SCHWARTZ: string[] = [
  "Quanto MENOS aware o prospect, MAIS LONGA e INDIRETA a copy.",
  "Quanto MAIS aware, mais CURTA e DIRETA.",
];

const BLOCO_NIVEIS_SCHWARTZ = NIVEIS_AWARENESS_SCHWARTZ.map((n) =>
  [
    `  ${n.ordem}. ${n.nome} (${n.fatia_mercado}): ${n.estado}`,
    ...n.diretrizes.map((d) => `     → ${d}`),
  ].join("\n"),
).join("\n");

export const FRAMEWORK_EUGENE_SCHWARTZ = `
=== EUGENE SCHWARTZ — Awareness Levels & Sofisticação ===
5 NÍVEIS DE AWARENESS (define abordagem do headline/copy):
${BLOCO_NIVEIS_SCHWARTZ}

REGRA NUCLEAR:
${REGRA_NUCLEAR_SCHWARTZ.map((l) => `  ${l}`).join("\n")}

SOFISTICAÇÃO DE MERCADO (saturação):
  - Stage 1: 1º no mercado → declaração direta
  - Stage 2: já tem competidor → claim maior
  - Stage 3: claim grande virou comum → COMO (mecanismo único)
  - Stage 4: mecanismo virou commodity → mecanismo NOVO/melhorado
  - Stage 5: tudo cansado → identificar com público, jornada
`;

export const FRAMEWORK_SABRI_SUBY = `
=== SABRI SUBY — Godfather Offer + 3% Rule ===
REGRA DOS 3%:
  Apenas 3% do mercado esta pronto pra comprar AGORA.
  Os outros 97% precisam ser nutridos.
  Tráfego pago direto pra venda = ignora 97% do potencial.

GODFATHER STRATEGY (oferta irresistível):
  Componentes:
    1. Oferta principal resolve dor maxima
    2. STACK de bonuses que enderecam dores secundarias
    3. Garantia que remove RISCO do comprador
    4. Escassez/urgencia legitima
    5. Anchoring de preço (valor total vs. preço pago)
  FILOSOFIA: stackeie tanto valor que o preço vire irrelevante.
  "Dá o Rolex pelo preço do Timex."

HVCO (High-Value Content Offer):
  Lead magnet tão valioso que poderia ser vendido. Resolve UM
  problema específico que o dream buyer tem AGORA.
  Demonstra expertise, constroi confianca, leva naturalmente ao paid.
`;

export const FRAMEWORK_CALPES_HEADLINES = `
=== JOHN CAPLES — 4 U's de Headline ===
Toda headline forte tem pelo menos 3 dos 4 U's:
  - USEFUL (útil pro leitor)
  - URGENT (gera urgência ou recência)
  - UNIQUE (claim diferenciado, ninguém mais diz)
  - ULTRA-SPECIFIC (números, prazos, dados específicos)
Sem "Você sabia...", "Hoje vou falar...", "Nesse post...".
`;

export const FRAMEWORK_CIALDINI_GATILHOS = `
=== ROBERT CIALDINI — 7 gatilhos de influencia ===
Use 1-2 por copy (não mais — apela demais):
  1. Reciprocidade (de algo gratis, valor real)
  2. Compromisso/Consistência (chame pra micro-ação antes da grande)
  3. Prova social (números, depoimentos, casos)
  4. Autoridade (título, credenciais, resultados)
  5. Afinidade (similaridade, identificação)
  6. Escassez (limite real de tempo/quantidade)
  7. Unidade (pertencimento a tribo/identidade compartilhada)
`;

// ============================================================
// BRANDING / STORYTELLING
// ============================================================

export const FRAMEWORK_DONALD_MILLER_SB7 = `
=== DONALD MILLER — StoryBrand SB7 (USO MODERADO) ===
PRINCIPIO CENTRAL:
  CLIENTE é o herói, marca é o GUIA (Yoda, não Luke).

⚠️ ATENÇÃO: NÃO aplicar SB7 em todo post — fica saturado e irreal.
   Nem toda nutri viveu a jornada do paciente. Forcar empatia fake
   ("eu sei como é sofrer com isso porque já passei") quando ela
   não passou destrói confiança e infringe ética.

   Usar SB7 SOMENTE quando:
   - For storytelling de caso (sem identificar paciente)
   - For LP / página sobre / bio de captação
   - For carrossel narrativo (problema → solução → resultado)
   - Quando a nutri DE FATO viveu algo similar e quiser compartilhar

   NÃO usar em:
   - Posts educativos / dado científico
   - Bastidores / rotina
   - Q&A / mitos vs verdades
   - Curiosidades científicas
   - Posts técnicos pra colega profissional

SB7 (7 partes — quando usar):
  1. CHARACTER: herói = cliente. UMA desire clara.
  2. PROBLEM (3 níveis):
     - EXTERNAL: dor tangível
     - INTERNAL: como SE SENTE
     - PHILOSOPHICAL: por que isso é ERRADO
     INSIGHT: vende-se solução pra dor EXTERNA, mas compra-se pra INTERNA.
  3. GUIDE (a nutri):
     - EMPATIA: "entendemos como é frustrante quando..." (sem fingir ter vivido)
     - AUTORIDADE: experiência profissional, formação, casos (anonimizados)
     - LIDERE com empatia, SUSTENTE com autoridade.
  4. PLAN: 3 passos claros + lista de compromissos
  5. CTA: direto (Agendar) ou transicional (Baixar/Assistir)
  6. FAILURE: o que acontece se NÃO agir — pouco, soft
  7. SUCCESS: ganho concreto

ONE-LINER:
  "Pacientes que [problema]. A gente oferece [solução] pra que eles [resultado]."
  Max 25 palavras, memorizável.
`;

// ============================================================
// MATRIZ DE USO — quando usar cada framework
// ============================================================

export const FRAMEWORKS_MATRIZ_USO = `
=== MATRIZ DE USO DOS FRAMEWORKS ===
Nem todo post precisa de framework. Saturação mata autoridade.
Misture os tipos pra parecer humano e não fórmula.

POR TIPO DE POST:
- Educativo / científico (dado, mecanismo): Schwartz (problem-aware) + Caples 4U.
  NÃO usar SB7. Sem "você vai virar herói". Só educa direto.
- Mito vs verdade / Q&A: Caples 4U + voz pessoal da nutri.
  NÃO usar SB7.
- Caso clínico (anonimizado): SB7 leve (paciente como herói, nutri como guia)
  + Cialdini (prova social) + Schwartz (problem/solution-aware).
- Bastidores / rotina: voz pessoal, sem framework explicito.
  Cialdini (afinidade) ok.
- Storytelling pessoal da nutri: SB7 com a nutri como personagem
  (nem sempre heroína — às vezes ela é quem vira guia depois de aprender algo).
- Venda / oferta: Suby Godfather + Schwartz (most-aware) + Caples 4U.
- LP / sobre: SB7 completo + Suby Godfather.
- Tráfego pago (anúncio): Pittman 3-part copy + Schwartz (definir awareness) + Caples + Cialdini (1 gatilho).

REGRA GERAL:
- Mistura: ~30% SB7-like, ~30% educativo direto, ~20% bastidor/voz pessoal,
  ~20% prova/casos. NUNCA 100% SB7.
- Cada post tem UM framework dominante. Não stackeie 4 frameworks num post.
- Se em dúvida, escolha o mais simples (Caples 4U funciona em quase tudo).
`;

// ============================================================
// COMPLIANCE CFN 2026 — APENAS REFERENCIA (texto completo no client.ts)
// ============================================================

export const COMPLIANCE_CFN_2026_RESUMO = `
=== CFN 856/2026 — REGRAS NOVAS (vigência 28/07/2026, já adotadas) ===
PROIBIDO:
- Simular resultados clínicos via IA (deepfake, antes/depois fake)
- Antes/depois de pacientes (mesmo com consentimento)
- Composição corporal / exames / medidas de pacientes em redes
- Indicar/preferir/associar imagem a marca de alimento/bebida/suplemento/fitoterapico

OBRIGATÓRIO:
- Informar quando conteúdo foi gerado por IA (aviso discreto)
- IA não substitui profissional na interação direta com paciente

ARTE IA — RESTRIÇÕES:
- Pessoas em contextos NEUTROS (consultório, fala-câmera, alimentação saudável)
- Sem pose/número/balança/medida que sugira resultado de tratamento
- Sem deepfake / pessoa real reconhecível
- Preferir cenas SEM pessoas (alimentos, gráficos, ambientes)
`;
