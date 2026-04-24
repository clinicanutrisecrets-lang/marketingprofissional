/**
 * ICP (Ideal Customer Profile) refinado — paciente premium qualificada
 * que investe ~R$ 5k em tratamento nutricional anual completo.
 *
 * Este ICP é a fonte unica da verdade — usado em prompts do Agente
 * de Ads, Skill 7 Tracao, e referenciado no guia da Sofia.
 *
 * NÃO é "qualquer mulher com dinheiro". É filtro psicodemografico
 * especifico que separa lead bom de lead ruim:
 *  - separa de "riquissima chata" (gasta tempo, nao respeita
 *    tratamento, vira detratora)
 *  - separa de "quero emagrecer urgente" (sem fundamento, nao paga
 *    ticket alto, nao retem)
 *  - separa de "fitness influencer addict" (procura quick fix)
 */

export const ICP_TICKET_ALTO_NUTRI_PREMIUM = `
PERFIL DE PACIENTE IDEAL (ICP) — TICKET ALTO

Quem é:
- Mulher 35-52 anos
- Classe A baixa / B alta — médica, advogada, empresária pequena, professora
  universitária, executiva média
- Já fez 2-4 nutricionistas/coaches antes, FRUSTRADA com falta de profundidade
- Lê Pollan, Lustig, Tim Ferriss. Conhece termos como MTHFR, microbioma,
  hashimoto, sinergia nutricional, nutrigenética
- Pesquisa 5-10 dias antes de fechar — decide por VALOR, não preço
- Compra suplemento online, faz check-up anual, consome ciência (não fitness
  influencer)
- Tom emocional: cética com promessa, frustrada com superficialidade, MAS
  esperançosa quando vê profundidade real
- Se organiza financeiramente pra fazer o tratamento — não precisa ter dinheiro
  sobrando, precisa ENXERGAR VALOR

Quem NÃO é (filtros de exclusão):
- Riquíssima de status/luxo extremo (yacht, helicóptero, jets) → vira lead chato
- Mulher <30 anos impulsiva ou >55 com rede de saúde estabelecida
- Quem só quer "emagrecer 10kg" — busca quick fix, não causa raiz
- Fitness influencer addict (segue meia dúzia de influenciadores fitness)
- Quem pergunta SÓ preço sem qualificar dor → não tem critério
- Quem quer "nutri famosa" pelo nome (status > resultado)
- Classe C/D — financeiramente não cabe ticket alto premium
- "Compulsiva por dieta da moda" — vai pular pra próxima moda em 2 meses

Sinais verdes (lead qualificado):
- Menciona testes laboratoriais que já fez
- Cita autores/livros de nutrição/saúde funcional
- Pergunta sobre método/abordagem ANTES de preço
- Conta jornada: o que já tentou e por que não funcionou
- Verbaliza desejo de "entender" o próprio corpo (não só "consertar")
- Demonstra paciência com explicação técnica longa

Sinais vermelhos (lead pra desqualificar com elegância):
- Pede preço na primeira mensagem sem se apresentar
- Compara com "qual o preço da nutricionista X que cobra Y"
- Quer resultado em prazo curto ("preciso emagrecer pro casamento dia tal")
- Vocabulário desrespeitoso ou ansioso demais ("me responde rápido")
- Pede desconto antes de saber o valor cheio
- Procura "dieta" pronta ou "cardápio"

Linguagem que ATRAI o ICP:
- Termos técnicos certeiros: nutrigenética, sinergias, mapa metabólico,
  detetive da saúde, investigação, microbiota, MTHFR, raciocínio clínico
- Tom editorial sofisticado, frases longas com profundidade
- Foco em "entender" e "personalizar", não em "transformar" ou "consertar"
- Reconhece a frustração dela com nutris anteriores (sem dizer mal de outros)
- Convida pra processo, não promete milagre

Linguagem que AFASTA o ICP (não usar):
- "Emagreça X kg em Y dias"
- "Antes e depois"
- "Detox", "milagrosa", "definitiva", "reset metabólico"
- "Transforme seu corpo"
- "Última chance", "vagas limitadas falsas"
- Linguagem hustle/coach motivacional
- Frases curtas demais sem substância
- Emojis em excesso
`.trim();

export const ICP_EXCLUSOES_META = {
  // Públicos a EXCLUIR no Meta Ads pra não atrair perfil errado
  comportamentos_excluir: [
    "Compradores frequentes de programas de emagrecimento rápido",
    "Frequentadores de academias de baixo padrão",
    "Compradores de produtos de detox / chá emagrecedor",
  ],
  interesses_excluir: [
    "Dieta da Lua / Dieta Cetogênica popular / Dieta Detox",
    "Influenciadores fitness sensacionalistas",
    "Bariátrica / cirurgia rápida de emagrecimento",
    "Status luxo extremo (yacht, helicóptero, supercarros)",
  ],
  paginas_excluir: [
    "Páginas de coach motivacional fitness",
    "Páginas de marketing multinível de saúde (MLM)",
    "Páginas de produto emagrecedor sem evidência",
  ],
};

export const ICP_INTERESSES_META = {
  // Interesses a INCLUIR no Meta Ads pra atrair ICP
  interesses_principais: [
    "Medicina funcional",
    "Nutrigenética",
    "Microbioma intestinal",
    "Epigenética",
    "Saúde da mulher 40+",
    "Longevidade saudável",
    "Andrew Huberman",
    "Tim Ferriss",
    "Michael Pollan",
    "Mark Hyman",
    "Suplementação personalizada",
  ],
  comportamentos_principais: [
    "Compradores de testes genéticos diretos ao consumidor (23andMe, MyHeritage)",
    "Compradores de suplementos premium online (Vitamin Shoppe, Apothecary)",
    "Leitoras de revistas/sites de saúde funcional (Goop, MindBodyGreen-equivalente)",
    "Pacientes de medicina integrativa",
  ],
  demograficos: {
    idade_min: 35,
    idade_max: 52,
    generos: ["Feminino"],
    escolaridade: ["Ensino superior completo", "Pós-graduação"],
    rendimento_familiar_estimado: "renda média-alta (top 20-40%)",
  },
};

export const ICP_RESUMO_CURTO =
  "Mulher 35-52, classe A-B, frustrada com nutris anteriores, lê Pollan/Lustig/Ferriss, pesquisa antes de comprar, valoriza profundidade científica, decide por valor não preço, se organiza financeiramente pra investir em tratamento real (não busca quick fix nem status).";
