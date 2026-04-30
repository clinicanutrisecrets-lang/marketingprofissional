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
=== DONALD MILLER — StoryBrand SB7 ===
PRINCIPIO CENTRAL:
  CLIENTE eh o heroi, NUNCA a marca. Marca eh o GUIA (Yoda, nao Luke).
  Empresas falham quando se posicionam como o heroi.
  "If you confuse, you lose."

SB7 (7 partes):
  1. CHARACTER — herói = cliente. Defina UMA desire clara.
  2. PROBLEM:
     - VILLAIN: causa-raiz (personificada, real, singular)
     - EXTERNAL: dor tangivel (ex: "pacientes nao melhoram")
     - INTERNAL: como SE SENTE (ex: "frustracao, sensacao de impostora")
     - PHILOSOPHICAL: por que isso esta ERRADO ("nutri nao deveria ter que...")
     INSIGHT: empresas vendem solucao pra dor externa, MAS clientes
     compram solucao pra dor INTERNA.
  3. GUIDE (voce):
     - EMPATIA: "entendemos como eh frustrante quando..."
     - AUTORIDADE: depoimentos, numeros, premios
     - REGRA: lidere com empatia, sustente com autoridade. Nunca o contrario.
  4. PLAN: 3 passos claros (remove confusao) + lista de compromissos (remove medo)
  5. CTA:
     - DIRETO: "Comprar", "Agendar", "Inscrever-se" (claro, repetido)
     - TRANSICIONAL: "Baixar", "Assistir" (relacionamento)
  6. FAILURE: o que acontece se NAO agir (consequencias)
     "Salt the oats" — pouca falha, muito sucesso
  7. SUCCESS: 3 finais possiveis:
     - Ganhar poder/posicao (status)
     - Uniao que torna o heroi completo (paz)
     - Auto-realizacao (virar quem deveria ser)

ONE-LINER (formula):
  "Most [people] struggle with [problem]. We provide [solution]
   so they can [result]."
  Regras: max 25 palavras, memorizavel, passa no teste do coquetel.
`;
