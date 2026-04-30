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
=== PEDRO SOBRAL — gestao de trafego BR ===
3 TIPOS DE CAMPANHA (90% do resultado vem dominar esses 3):
  1. Criacao de audiencia — topo do funil, awareness
  2. Captacao de leads — meio, formularios/wpp/dm
  3. Geracao de vendas — fundo, conversao

4 PILARES DA SEGMENTACAO:
  - Publicos (interesses, comportamentos, demograficos)
  - Criativos (hook auto-seleciona quem assiste)
  - Objetivo da campanha (sinaliza algoritmo)
  - Pixel (eventos de conversao + lookalike)

TEMPERATURA DE PUBLICO:
  - Quentes (ultimos 7d, carrinho abandonado, visitantes site)
  - Mornos (contato anterior nao recente)
  - Frios (sem engajamento, base interesses)

ESTRATEGIA DO PASSO ANTERIOR:
  Mire em quem esta 1 PASSO ANTES do objetivo de conversao final.
  Ex: pra venda, mira em quem viu pagina de produto / adicionou ao carrinho.

ESTRUTURA IDEAL:
  - 4 a 8 ad sets por campanha (12+ underperforma)
  - CBO pra escalar / ABO pra testes controlados
  - Mude UMA variavel por vez

CADENCIA DE MONITORAMENTO:
  - Criativos: cada 2-3 dias
  - Publicos: cada 4 dias
  - Orcamento: cada 2 dias
  - Estrutura: cada 7 dias

PRINCIPIOS:
  - "Criativo eh o novo publico" — qualidade do criativo > especificidade do publico
  - Cada centavo investido em trafego pago eh um TESTE
  - O que funciona hoje pode nao funcionar amanha
  - Nunca confie cego na IA da plataforma — ela otimiza pelo lucro DELA, nao seu
`;

export const FRAMEWORK_MOLLY_PITTMAN = `
=== MOLLY PITTMAN — Ad Grid & Traffic Temperature ===
AD GRID (planejamento sistematico):
  - Eixo X: avatares (2-4 segmentos distintos)
  - Eixo Y: hooks (2-4 angulos diferentes)
  - Cada celula = 1 ad unico (avatar X hook)
  - Testar todas; ganhadores revelam o que ressoa em escala

5 TIPOS DE HOOK:
  - Pain/Benefit (dor conhecida que a oferta resolve)
  - Average Day (como melhora o dia-a-dia: tempo, energia)
  - Emotion (como vao SE SENTIR depois)
  - Logic (dados, prova, ROI)
  - Status (upgrade de status, certificacao, conquista)
REGRA: 1 hook nao serve pra todo avatar. Min 2 hooks por campanha.

3-PART AD COPY (cada ad):
  1. ENTER — entre na conversa que ja esta na cabeca DELES (sobre eles, nao voce)
  2. TRANSITION — ponte da dor ate o "estado depois" + sua solucao
  3. CTA — diga EXATAMENTE o que fazer

TRAFFIC TEMPERATURE:
  - Cold (nunca ouviu falar): nao venda, EDUQUE. Lead magnets, conteudo
  - Warm (1-2 toques): aprofunda relacao, move pra conversao
  - Hot (comprou ou super engajado): retargeting, upsell, fidelidade
  REGRA: copy/imagem/oferta DEVEM mudar com a temperatura

SCALING:
  - Vertical: aumenta budget em vencedores (mesma audiencia)
  - Horizontal: novos publicos/hooks/ofertas pra novos segmentos
`;

export const FRAMEWORK_DEPESH_MANDALIA = `
=== DEPESH MANDALIA — escala e otimizacao Meta ===
QUANDO ESCALAR:
  - Frequency 1.5-2.0 + CPL no benchmark = +20-30% budget
  - ROAS 30%+ acima do alvo = duplicar criativo, escalar horizontal

QUANDO MATAR:
  - Frequency > 2.5 em <7 dias = saturacao, troca criativo
  - Gasto > 3x do CPL alvo SEM 1 lead = pausar
  - CTR < 0.8% = criativo fraco, refazer

REGRA DE 3 (decisao):
  - Espere 3 dias OU 3x CPL alvo gasto antes de decidir
  - Sem dados suficientes = nao mexer
`;

// ============================================================
// COPY
// ============================================================

export const FRAMEWORK_EUGENE_SCHWARTZ = `
=== EUGENE SCHWARTZ — Awareness Levels & Sofisticacao ===
5 NIVEIS DE AWARENESS (define abordagem do headline/copy):
  1. UNAWARE (60% do mercado): nao sabe que tem o problema
     → Headline emocional/identidade/historia. NAO mencione produto cedo.
  2. PROBLEM AWARE (20%): sente a dor, nao conhece solucoes
     → Lidere com empatia da dor, agite, depois revele solucao
     → Ex: "Se voce sofre com X, leia isso"
  3. SOLUTION AWARE (10%): conhece solucoes, nao seu produto
     → Lidere com resultado desejado, depois conecte ao produto
     → Ex: "Como [resultado] sem [dor]"
  4. PRODUCT AWARE (7%): conhece seu produto, nao convencido
     → Diferenciacao, prova, depoimentos
  5. MOST AWARE (3%): quer comprar, so precisa da oferta
     → Nome do produto + preco/oferta direto

REGRA NUCLEAR:
  Quanto MENOS aware o prospect, MAIS LONGA e INDIRETA a copy.
  Quanto MAIS aware, mais CURTA e DIRETA.

SOFISTICACAO DE MERCADO (saturacao):
  - Stage 1: 1o no mercado → declaracao direta
  - Stage 2: ja tem competidor → claim maior
  - Stage 3: claim grande virou comum → COMO (mecanismo unico)
  - Stage 4: mecanismo virou commodity → mecanismo NOVO/melhorado
  - Stage 5: tudo cansado → identificar com publico, jornada
`;

export const FRAMEWORK_SABRI_SUBY = `
=== SABRI SUBY — Godfather Offer + 3% Rule ===
REGRA DOS 3%:
  Apenas 3% do mercado esta pronto pra comprar AGORA.
  Os outros 97% precisam ser nutridos.
  Trafego pago direto pra venda = ignora 97% do potencial.

GODFATHER STRATEGY (oferta irresistivel):
  Componentes:
    1. Oferta principal resolve dor maxima
    2. STACK de bonuses que enderecam dores secundarias
    3. Garantia que remove RISCO do comprador
    4. Escassez/urgencia legitima
    5. Anchoring de preco (valor total vs. preco pago)
  FILOSOFIA: stackeie tanto valor que o preco vire irrelevante.
  "Da o Rolex pelo preco do Timex."

HVCO (High-Value Content Offer):
  Lead magnet tao valioso que poderia ser vendido. Resolve UM
  problema especifico que o dream buyer tem AGORA.
  Demonstra expertise, constroi confianca, leva naturalmente ao paid.
`;

export const FRAMEWORK_CALPES_HEADLINES = `
=== JOHN CAPLES — 4 U's de Headline ===
Toda headline forte tem pelo menos 3 dos 4 U's:
  - USEFUL (util pro leitor)
  - URGENT (gera urgencia ou recencia)
  - UNIQUE (claim diferenciado, ninguem mais diz)
  - ULTRA-SPECIFIC (numeros, prazos, dados especificos)
Sem "Voce sabia...", "Hoje vou falar...", "Nesse post...".
`;

export const FRAMEWORK_CIALDINI_GATILHOS = `
=== ROBERT CIALDINI — 7 gatilhos de influencia ===
Use 1-2 por copy (nao mais — apela demais):
  1. Reciprocidade (de algo gratis, valor real)
  2. Compromisso/Consistencia (chame pra micro-acao antes da grande)
  3. Prova social (numeros, depoimentos, casos)
  4. Autoridade (titulo, credenciais, resultados)
  5. Afinidade (similaridade, identificacao)
  6. Escassez (limite real de tempo/quantidade)
  7. Unidade (pertencimento a tribo/identidade compartilhada)
`;

// ============================================================
// BRANDING / STORYTELLING
// ============================================================

export const FRAMEWORK_DONALD_MILLER_SB7 = `
=== DONALD MILLER — StoryBrand SB7 (USO MODERADO) ===
PRINCIPIO CENTRAL:
  CLIENTE eh o heroi, marca eh o GUIA (Yoda, nao Luke).

⚠️ ATENCAO: NAO aplicar SB7 em todo post — fica saturado e irreal.
   Nem toda nutri viveu a jornada do paciente. Forcar empatia fake
   ("eu sei como eh sofrer com isso porque ja passei") quando ela
   nao passou destroi confianca e infringe etica.

   Usar SB7 SOMENTE quando:
   - For storytelling de caso (sem identificar paciente)
   - For LP / pagina sobre / bio de captacao
   - For carrossel narrativo (problema → solucao → resultado)
   - Quando a nutri DE FATO viveu algo similar e quiser compartilhar

   NAO usar em:
   - Posts educativos / dado cientifico
   - Bastidores / rotina
   - Q&A / mitos vs verdades
   - Curiosidades cientificas
   - Posts tecnicos pra colega profissional

SB7 (7 partes — quando usar):
  1. CHARACTER: heroi = cliente. UMA desire clara.
  2. PROBLEM (3 niveis):
     - EXTERNAL: dor tangivel
     - INTERNAL: como SE SENTE
     - PHILOSOPHICAL: por que isso eh ERRADO
     INSIGHT: vende-se solucao pra dor EXTERNA, mas compra-se pra INTERNA.
  3. GUIDE (a nutri):
     - EMPATIA: "entendemos como eh frustrante quando..." (sem fingir ter vivido)
     - AUTORIDADE: experiencia profissional, formacao, casos (anonimizados)
     - LIDERE com empatia, SUSTENTE com autoridade.
  4. PLAN: 3 passos claros + lista de compromissos
  5. CTA: direto (Agendar) ou transicional (Baixar/Assistir)
  6. FAILURE: o que acontece se NAO agir — pouco, soft
  7. SUCCESS: ganho concreto

ONE-LINER:
  "Pacientes que [problema]. A gente oferece [solucao] pra que eles [resultado]."
  Max 25 palavras, memorizavel.
`;

// ============================================================
// MATRIZ DE USO — quando usar cada framework
// ============================================================

export const FRAMEWORKS_MATRIZ_USO = `
=== MATRIZ DE USO DOS FRAMEWORKS ===
Nem todo post precisa de framework. Saturacao mata autoridade.
Misture os tipos pra parecer humano e nao formula.

POR TIPO DE POST:
- Educativo / cientifico (dado, mecanismo): Schwartz (problem-aware) + Caples 4U.
  NAO usar SB7. Sem "voce vai virar heroi". So educa direto.
- Mito vs verdade / Q&A: Caples 4U + voz pessoal da nutri.
  NAO usar SB7.
- Caso clinico (anonimizado): SB7 leve (paciente como heroi, nutri como guia)
  + Cialdini (prova social) + Schwartz (problem/solution-aware).
- Bastidores / rotina: voz pessoal, sem framework explicito.
  Cialdini (afinidade) ok.
- Storytelling pessoal da nutri: SB7 com a nutri como personagem
  (nem sempre heroina — as vezes ela eh quem vira guia depois de aprender algo).
- Venda / oferta: Suby Godfather + Schwartz (most-aware) + Caples 4U.
- LP / sobre: SB7 completo + Suby Godfather.
- Trafego pago (anuncio): Pittman 3-part copy + Schwartz (definir awareness) + Caples + Cialdini (1 gatilho).

REGRA GERAL:
- Mistura: ~30% SB7-like, ~30% educativo direto, ~20% bastidor/voz pessoal,
  ~20% prova/casos. NUNCA 100% SB7.
- Cada post tem UM framework dominante. Nao stackeie 4 frameworks num post.
- Se em duvida, escolha o mais simples (Caples 4U funciona em quase tudo).
`;

// ============================================================
// COMPLIANCE CFN 2026 — APENAS REFERENCIA (texto completo no client.ts)
// ============================================================

export const COMPLIANCE_CFN_2026_RESUMO = `
=== CFN 856/2026 — REGRAS NOVAS (vigencia 28/07/2026, ja adotadas) ===
PROIBIDO:
- Simular resultados clinicos via IA (deepfake, antes/depois fake)
- Antes/depois de pacientes (mesmo com consentimento)
- Composicao corporal / exames / medidas de pacientes em redes
- Indicar/preferir/associar imagem a marca de alimento/bebida/suplemento/fitoterapico

OBRIGATORIO:
- Informar quando conteudo foi gerado por IA (aviso discreto)
- IA nao substitui profissional na interacao direta com paciente

ARTE IA — RESTRICOES:
- Pessoas em contextos NEUTROS (consultorio, fala-camera, alimentacao saudavel)
- Sem pose/numero/balanca/medida que sugira resultado de tratamento
- Sem deepfake / pessoa real reconhecivel
- Preferir cenas SEM pessoas (alimentos, graficos, ambientes)
`;
