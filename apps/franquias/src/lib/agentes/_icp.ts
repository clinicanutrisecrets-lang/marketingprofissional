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
    "Frequentadores de academias de baixo custo (Smart Fit, redes populares)",
    "Compradores de produtos de detox / chá emagrecedor",
    // CRÍTICO: excluir quem JÁ comprou teste genético (Genera, DNA Vida, etc.)
    // — chegam já sabendo o resultado e pedem desconto na consulta
    "Compradores de testes genéticos diretos ao consumidor (Genera, DNA Vida, Geneone)",
    "Interesse em ancestralidade genética (23andMe, MyHeritage — perfil curiosidade, não saúde clínica)",
  ],
  interesses_excluir: [
    "Dieta da Lua / Dieta Cetogênica popular / Dieta Detox",
    "Influenciadores fitness sensacionalistas",
    "Bariátrica / cirurgia rápida de emagrecimento",
    "Status luxo extremo (yacht, helicóptero, supercarros)",
    "Programas de emagrecimento em grupo (Weight Watchers, Vigilantes do Peso)",
    "Suplementos MLM / venda direta (Herbalife, Amway saúde)",
  ],
  paginas_excluir: [
    "Páginas de coach motivacional fitness",
    "Páginas de marketing multinível de saúde (MLM)",
    "Páginas de produto emagrecedor sem evidência",
    "Páginas de cirurgia plástica / bariátrica",
  ],
};

export const ICP_INTERESSES_META = {
  // Interesses a INCLUIR no Meta Ads pra atrair ICP
  // ATENÇÃO: usar referências BRASILEIRAS — o público-alvo é Brasil
  // Não usar nomes de influenciadores estrangeiros que o público não reconhece
  interesses_principais: [
    // Referências brasileiras de saúde funcional / integrativa
    "Luciano Bruno",              // farmacêutico/educador de saúde funcional, grande no Brasil
    "Pura Vida",                  // marca de suplementos premium — indica renda e consciência
    "Bodytech",                   // academia premium (não Smart Fit) — indica classe A/B
    "Bio Ritmo",                  // academia premium classe A/B
    "Farmácia de manipulação",    // quem já faz fórmulas magistrais = consciente de personalização
    "Medicina integrativa",
    "Nutrição funcional",
    "Nutrigenética",
    "Microbioma intestinal",
    "Epigenética",
    "Saúde da mulher 40+",
    "Longevidade",
    "Check-up executivo",
    "Plano de saúde Amil One / Bradesco Saúde Top",  // indicador de renda
    "Suplementação personalizada",
    "Vitaminas e minerais (interesse, não produto MLM)",
  ],
  comportamentos_principais: [
    // ATENÇÃO: NÃO incluir 'compradores de teste genético' — chegam já com resultado e pedem desconto
    // Queremos quem está INTERESSADO em personalização mas ainda não comprou o teste
    "Compradores de suplementos premium (Pura Vida, Essential Nutrition, manipulação)",
    "Usuários de apps de saúde premium (Whoop, Oura Ring, Garmin saúde)",
    "Consumidores de conteúdo de medicina integrativa / funcional no Brasil",
    "Pacientes que buscam segunda opinião médica / clínicas de check-up executivo",
    "Engajamento com conteúdo de longevidade, epigenética, microbioma (sem compra de kit)",
  ],
  demograficos: {
    idade_min: 35,
    idade_max: 52,
    generos: ["Feminino"],
    escolaridade: ["Ensino superior completo", "Pós-graduação"],
    rendimento_familiar_estimado: "renda média-alta (top 20-40%)",
  },
  nota_teste_genetico: `
REGRA CRÍTICA — TESTE GENÉTICO:
- INCLUIR: pessoas interessadas em personalização de saúde, nutrição de precisão,
  que AINDA NÃO compraram teste genético (são o lead ideal — vêm sem âncora de preço)
- EXCLUIR: pessoas que já compraram kits da Genera, DNA Vida, Geneone, 23andMe
  (chegam com resultado em mãos, pedem desconto na consulta, desvalorizam o serviço)
- ESTRATÉGIA: não usar "teste genético" como interesse de inclusão —
  usar "nutrição personalizada", "medicina de precisão", "saúde integrativa"
  que capturam a curiosidade sem atrair quem já tem o kit
  `.trim(),
};

export const ICP_RESUMO_CURTO =
  "Mulher 35-52, classe A-B, frustrada com nutris anteriores que só deram cardápio genérico, busca entender o próprio corpo com profundidade científica (microbioma, nutrigenética, epigenética), investe em suplementação premium, frequenta academia de alto padrão, decide por valor e não por preço, se organiza financeiramente pra tratamento real.";
