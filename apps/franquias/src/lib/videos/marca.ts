/**
 * Vídeos animados na marca de cada profissional (Aline, 15/10/2026).
 *
 * Os moldes são feitos no Claude Design (HTML animado) e moram em
 * `public/videos-marca/`. O worker `.github/workflows/render-video-marca.yml`
 * abre o molde com `?primaria=…&secundaria=…&logo=…`, avança a animação
 * quadro a quadro e grava o MP4 9:16 no Storage. É feito UMA vez por
 * profissional e refeito só quando muda a cor, a logo ou a versão do molde.
 *
 * O que troca no vídeo: o tiffany (cor principal) e o roxo (secundária), e a
 * logo no topo e no fechamento. O que NÃO troca: amarelo, vermelho, sol,
 * laranja e as letras A/T, que fazem parte da explicação ou da ilustração.
 *
 * Os moldes saem SEM legenda escrita na tela: a profissional narra por cima
 * (tela /dashboard/narrar, roteiro em karaokê) ou posta com música.
 *
 * 🔴 Fase de teste: só as contas de EMAILS_VIDEOS_MARCA veem a seção.
 * 🔴 Texto daqui vai pra legenda da profissional: sem travessão, sem "IA",
 * sem nome de marca, sem promessa de resultado. O teste varre isso.
 *
 * Arquivo puro (sem import de servidor): o teste roda com node --test.
 */

export type TrechoRoteiro = { de: number; ate: number; texto: string };

export type VideoMarca = {
  id: string;
  titulo: string;
  /** Molde em public/videos-marca/. */
  molde: string;
  /** Imagem de prévia (quadro do molde, sem logo). */
  poster: string;
  /** Sobe quando o molde muda: força refazer o vídeo de todo mundo. */
  versao: number;
  duracaoSeg: number;
  resumo: string;
  roteiro: TrechoRoteiro[];
  legenda: string;
  /**
   * Assuntos do vídeo, sem acento e em minúsculo. É por eles que o pacote de
   * domingo decide se o vídeo cabe no nicho dela ou no tema daquela semana
   * (lib/geracao/video-marca-semana.ts). Pedaço de palavra vale ("emagrec").
   */
  temas: string[];
};

const BASE = "/videos-marca";

export const VIDEOS_MARCA: VideoMarca[] = [
  {
    id: "gene-fto",
    titulo: "Como funciona o gene do emagrecimento (FTO)",
    molde: `${BASE}/fto.html`,
    poster: `${BASE}/fto.jpg`,
    versao: 4,
    duracaoSeg: 110.1,
    resumo:
      "O gene FTO explicado de um jeito simples: a letrinha de risco, a proteína que mexe no apetite e como a alimentação ajuda a deixar o gene mais quieto.",
    roteiro: [
      {
        de: 0,
        ate: 11.5,
        texto:
          "Por que algumas pessoas sentem que nunca se saciam? A resposta pode estar num gene, o FTO, o gene do emagrecimento. E a alimentação ajuda a ligar ou desligar esse gene.",
      },
      {
        de: 11.5,
        ate: 27.2,
        texto:
          "Este é o gene FTO. Ele tem uma letrinha que muda de uma pessoa para outra. A letra A é a de risco. Mas ter a letra A não é sentença: o corpo pode colar etiquetinhas no gene.",
      },
      {
        de: 27.2,
        ate: 42.9,
        texto:
          "Para trabalhar, o gene precisa ser lido. Uma leitora passa por ele e faz uma cópia, que vira um recadinho. Esse recadinho sai do núcleo e chega numa fábrica, que monta a proteína FTO.",
      },
      {
        de: 42.9,
        ate: 54.1,
        texto: "E a proteína FTO mexe no seu apetite. Quanto mais FTO, mais fome e menos saciedade. E mais gordura guardada.",
      },
      {
        de: 54.1,
        ate: 63.1,
        texto: "Agora vem a parte boa: a comida ajuda. Folhas verdes, peixes e ovos trazem folato, B12 e colina, a matéria-prima das etiquetas.",
      },
      {
        de: 63.1,
        ate: 73.7,
        texto: "Quem cola as etiquetas no gene é a etiquetadora. Ela pega uma etiqueta da caixinha, que a alimentação abasteceu, e cola direto no gene.",
      },
      {
        de: 73.7,
        ate: 84.9,
        texto: "Com as etiquetas, a leitora trava. Ela tenta passar, mas não consegue ler. O gene fica quietinho, e a letra A de risco também fica quieta.",
      },
      {
        de: 84.9,
        ate: 94.4,
        texto: "Outros alimentos também são aliados: chá verde, cúrcuma, soja, uva e brócolis. Eles ajudam a manter o equilíbrio.",
      },
      { de: 94.4, ate: 101.1, texto: "Não mudamos o gene. Mas a alimentação ajuda a deixar ele ligado ou desligado da tomada." },
      {
        de: 101.1,
        ate: 110.1,
        texto: "E as suas letrinhas, quais são? São mais de vinte genes ligados ao emagrecimento. Faça o seu teste nutrigenético e descubra.",
      },
    ],
    legenda: [
      "Você já ouviu falar do gene FTO?",
      "Ele é conhecido como o gene do emagrecimento. Uma letrinha dele muda de pessoa para pessoa, e quem tem a letra A tende a sentir mais fome e a guardar mais gordura.",
      "Mas gene não é sentença. A alimentação ajuda o corpo a colar etiquetinhas no gene e deixar ele mais quieto. Folhas verdes, peixes e ovos fornecem a matéria-prima dessas etiquetas.",
      "O FTO é só um entre mais de vinte genes ligados ao emagrecimento. Saber quais letrinhas você tem muda a conduta, porque cada combinação pede um caminho diferente.",
      "Quer descobrir as suas? Me chama no direct que eu te explico como funciona o teste nutrigenético.",
    ].join("\n\n"),
    temas: ["emagrec", "peso", "obesidade", "gordura", "apetite", "fome", "saciedade", "metabol"],
  },
  {
    id: "gene-clock",
    titulo: "Como funciona o gene do sono (CLOCK)",
    molde: `${BASE}/clock.html`,
    poster: `${BASE}/clock.jpg`,
    versao: 4,
    duracaoSeg: 118.7,
    resumo:
      "O gene CLOCK e o relógio do corpo: por que a letra de risco atrasa o sono e a fome, e como o horário das refeições, a luz e a alimentação ajudam.",
    roteiro: [
      { de: 0, ate: 5.6, texto: "O seu sono também tem um gene: o CLOCK, que quer dizer relógio." },
      {
        de: 5.6,
        ate: 21.3,
        texto:
          "Este é o gene CLOCK. Ele tem uma letrinha que muda de uma pessoa para outra. A letra C é a de risco. Mas ter a letra C não é sentença: o corpo pode colar etiquetinhas no gene.",
      },
      {
        de: 21.3,
        ate: 37,
        texto: "Para trabalhar, o gene precisa ser lido. A leitora faz uma cópia, que vira um recadinho. O recadinho chega numa fábrica, que monta a proteína CLOCK.",
      },
      {
        de: 37,
        ate: 58.8,
        texto:
          "A proteína CLOCK dá as mãos para a BMAL1, e juntas elas dão corda no relógio do corpo, que dá uma volta a cada vinte e quatro horas. Ele também avisa a hora de comer. Com a letra C, o relógio tende a atrasar: a fome aparece à noite e a melatonina, que traz o sono, chega mais tarde.",
      },
      {
        de: 58.8,
        ate: 67.8,
        texto: "Agora vem a parte boa: a comida ajuda. Folhas verdes, peixes e ovos trazem folato, B12 e colina, a matéria-prima das etiquetas.",
      },
      {
        de: 67.8,
        ate: 78.4,
        texto: "Quem cola as etiquetas no gene é a etiquetadora. Ela pega uma etiqueta da caixinha, que a alimentação abasteceu, e cola direto no gene.",
      },
      {
        de: 78.4,
        ate: 89.6,
        texto: "As etiquetas ajudam a regular o gene. A letra C fica com um capacetinho, e o relógio volta ao horário.",
      },
      {
        de: 89.6,
        ate: 103,
        texto:
          "E o horário também é alimento. Comer sempre nos mesmos horários, pegar luz da manhã e tomar café só até a tarde ajudam o relógio. Uva, laranja, cereja e kiwi também são aliados.",
      },
      { de: 103, ate: 109.7, texto: "Não mudamos o gene. Mas a alimentação ajuda a deixar ele ligado ou desligado da tomada." },
      {
        de: 109.7,
        ate: 118.7,
        texto: "E as suas letrinhas, quais são? São mais de quinze genes ligados ao sono. Faça o seu teste nutrigenético e descubra.",
      },
    ],
    legenda: [
      "Você sabia que o seu sono tem um gene?",
      "O gene CLOCK ajuda a dar corda no relógio do corpo, aquele que dá uma volta a cada vinte e quatro horas e também avisa a hora de comer.",
      "Quem tem a letra C tende a ter o relógio atrasado: a fome aparece mais à noite e a melatonina, que traz o sono, chega mais tarde.",
      "A boa notícia é que o horário também é alimento. Refeições nos mesmos horários, luz da manhã e café só até a tarde ajudam o relógio a voltar ao lugar.",
      "O CLOCK é um entre mais de quinze genes ligados ao sono. Quer saber quais são as suas letrinhas? Me chama no direct.",
    ].join("\n\n"),
    temas: ["sono", "insonia", "dormir", "melatonina", "relogio biologico", "circadian", "fome noturna", "cansaco"],
  },
  {
    id: "gene-cyp1a2",
    titulo: "Como funciona o gene da cafeína (CYP1A2)",
    molde: `${BASE}/cyp1a2.html`,
    poster: `${BASE}/cyp1a2.jpg`,
    // v2 (16/10/2026): abertura "te ajuda ou te atrapalha" e o fígado porteiro.
    versao: 2,
    duracaoSeg: 89.3,
    resumo:
      "O gene CYP1A2 e a cafeína: o fígado como porteiro do corpo, por que quem tem a letra C desmonta o café devagar, o que isso tem a ver com ansiedade, coração e estrogênio, e como ajustar o café na medida da sua letra.",
    roteiro: [
      {
        de: 0,
        ate: 12.5,
        texto:
          "Sabe aquele seu café turbinado? O CYP1A2, o gene da cafeína, decide o que ele faz com você. Descubra se a sua genética te ajuda ou te atrapalha.",
      },
      {
        de: 12.5,
        ate: 28.2,
        texto:
          "Este é o gene CYP1A2, que monta a enzima que desmonta a cafeína. Quem é AA é rápido. Quem tem a letra C, a de risco, é lento. Mas a letra C não é sentença: saber a letra muda a conduta.",
      },
      {
        de: 28.2,
        ate: 37.7,
        texto:
          "A CYP1A2 trabalha no fígado, o porteiro do corpo. Na fase 1 da detox, ela desmonta a cafeína, que sai pelo xixi.",
      },
      {
        de: 37.7,
        ate: 61.8,
        texto:
          "Com AA, a esteira é rápida. Com a letra C, ela anda devagar e a cafeína se acumula: o corpo fica ligado no 220, com mais ansiedade, agitação e tremedeira. Em quem é lento, duas a três xícaras ou mais por dia foram ligadas a mais risco de infarto precoce. A CYP1A2 também ajuda a reciclar o estrogênio, por isso conversa com a TPM e a menopausa.",
      },
      {
        de: 61.8,
        ate: 73.6,
        texto:
          "Não é proibir, é ajustar. Com a letra C, menos café e só até a tarde. Café turbinado pesa mais para quem é lento. Triglicerídeos acima de 90? O resveratrol entra como aliado.",
      },
      { de: 73.6, ate: 80.3, texto: "Não mudamos o gene. Mas a alimentação ajuda a deixar ele ligado ou desligado da tomada." },
      {
        de: 80.3,
        ate: 89.3,
        texto: "E as suas letrinhas, quais são? São mais de trezentos genes ligados ao seu metabolismo. Faça o seu teste nutrigenético e descubra.",
      },
    ],
    legenda: [
      "Você sabia que o seu café também tem um gene?",
      "O gene CYP1A2 monta uma enzima do fígado, o porteiro do corpo, que desmonta a cafeína. Quem é AA desmonta rápido. Quem tem a letra C desmonta devagar, e a cafeína fica mais tempo no corpo: mais ansiedade, agitação e tremedeira.",
      "A mesma enzima ajuda a reciclar o estrogênio, por isso ela conversa com a TPM e a menopausa.",
      "Não é proibir o café, é ajustar a dose e o horário à sua letra.",
      "Quer saber se a sua genética te ajuda ou te atrapalha? Me chama no direct que eu te explico como funciona o teste nutrigenético.",
    ].join("\n\n"),
    temas: ["cafe", "cafeina", "ansiedade", "tpm", "menopausa", "estrogen", "hormon", "saude feminina", "detox", "figado", "coracao", "cardio"],
  },
  {
    id: "gene-il6",
    titulo: "Como funciona o gene da inflamação (IL6)",
    molde: `${BASE}/il6.html`,
    poster: `${BASE}/il6.jpg`,
    versao: 1,
    duracaoSeg: 118.5,
    resumo:
      "O gene IL6 e o alarme da inflamação: por que a letra G tende a deixar o alarme mais alto, e como a alimentação ajuda a baixar o termômetro.",
    roteiro: [
      { de: 0, ate: 8.5, texto: "Como funciona o IL6, o gene da inflamação? E como a alimentação ajuda a ligar ou desligar esse gene da tomada." },
      {
        de: 8.5,
        ate: 24.2,
        texto:
          "Este é o gene IL6, que comanda o alarme da inflamação. Ele tem uma letrinha que muda de pessoa para pessoa. A letra G é a de risco. Mas ter a letra G não é sentença: o corpo pode colar etiquetinhas no gene.",
      },
      {
        de: 24.2,
        ate: 39.9,
        texto: "Para trabalhar, o gene precisa ser lido. A leitora faz uma cópia, que vira um recadinho. O recadinho chega numa fábrica, que monta a IL6.",
      },
      {
        de: 39.9,
        ate: 55.6,
        texto:
          "A IL6 é um alarme: avisa o corpo que algo precisa de defesa. Quando o alarme não desliga, a inflamação fica acesa: mais dores e a imunidade desregulada. Ela também pode influenciar a fertilidade e está ligada à endometriose.",
      },
      {
        de: 55.6,
        ate: 64.6,
        texto: "Agora vem a parte boa: a comida ajuda. Beterraba, feijão e brócolis trazem betaína e folato, a matéria-prima das etiquetas.",
      },
      {
        de: 64.6,
        ate: 75.2,
        texto: "Quem cola as etiquetas no gene é a etiquetadora. Ela pega uma etiqueta da caixinha e cola no gene. Isso se chama metilação.",
      },
      {
        de: 75.2,
        ate: 86.4,
        texto: "As etiquetas baixam o volume da letra G de risco. Ela fica com um capacetinho, e o alarme toca na hora certa.",
      },
      {
        de: 86.4,
        ate: 102.8,
        texto:
          "A comida ajuda a baixar o termômetro. Acerola, com vitamina C de montão. O ômega-3 dos peixes acalma o alarme. O ômega-6 em excesso atiça o fogo: não precisa cortar, só equilibrar. E castanha-do-pará, abacate e azeite também acalmam a inflamação.",
      },
      { de: 102.8, ate: 109.5, texto: "Não mudamos o gene. Mas a alimentação ajuda a deixar ele ligado ou desligado da tomada." },
      {
        de: 109.5,
        ate: 118.5,
        texto: "E as suas letrinhas, quais são? São mais de vinte genes ligados à inflamação. Faça o seu teste nutrigenético e descubra.",
      },
    ],
    legenda: [
      "Você sabia que a inflamação também tem um gene?",
      "O gene IL6 comanda um alarme do corpo. Quem tem a letra G tende a ter esse alarme tocando mais alto, e quando ele não desliga a inflamação fica acesa.",
      "Mas gene não é sentença. A alimentação traz a matéria-prima das etiquetinhas que ajudam a regular o gene, e alimentos como acerola, peixes, castanha-do-pará, abacate e azeite ajudam a baixar o termômetro.",
      "O IL6 é um entre mais de vinte genes ligados à inflamação. Quer saber quais são as suas letrinhas? Me chama no direct.",
    ].join("\n\n"),
    temas: ["inflama", "dor", "imunidade", "autoimun", "endometriose", "fertilidade", "longevidade", "saude feminina"],
  },
  {
    id: "gene-glp1r-gipr",
    titulo: "Os genes da saciedade e a canetinha (GLP1R e GIPR)",
    molde: `${BASE}/glp1r-gipr.html`,
    poster: `${BASE}/glp1r-gipr.jpg`,
    versao: 1,
    duracaoSeg: 95.5,
    resumo:
      "Os genes GLP1R e GIPR montam as fechaduras das chaves da saciedade: por que a semaglutida e a tirzepatida não funcionam igual para todo mundo e como o prato certo ajuda.",
    roteiro: [
      { de: 0, ate: 9, texto: "A semaglutida e a tirzepatida funcionam igual para todo mundo? Os genes GLP1R e GIPR respondem." },
      {
        de: 9,
        ate: 24,
        texto:
          "Quando você come, o intestino libera chaves: o GLP1 e o GIP. Elas abrem fechaduras no cérebro e no pâncreas, trazendo saciedade e açúcar no sangue sob controle. Os genes GLP1R e GIPR são a receita dessas fechaduras.",
      },
      {
        de: 24,
        ate: 35,
        texto: "A semaglutida e a tirzepatida, as canetinhas, imitam essas chaves no corpo: a fome diminui e a saciedade dura mais. Mas a fechadura de cada pessoa é um pouquinho diferente.",
      },
      {
        de: 35,
        ate: 47,
        texto: "No GLP1R, algumas pessoas têm G, outras têm A. Quem tem A tende a perder mais peso com a semaglutida. Quem tem G tende a responder menos.",
      },
      {
        de: 47,
        ate: 59,
        texto: "No GIPR, a letra C é a de risco, ligada a mais peso. Quem tem T responde melhor a um prato com fibras, com menos gordura e mais vegetais.",
      },
      {
        de: 59,
        ate: 79,
        texto:
          "A comida também fabrica chaves naturais: proteína, fibras, azeite e comer devagar. As fibras alimentam a microbiota, que faz o intestino liberar mais GLP1. O medicamento não faz tudo sozinho: o prato certo ajuda a chave e a fechadura a trabalharem juntas.",
      },
      { de: 79, ate: 86, texto: "Não mudamos o gene. Mas a alimentação ajuda a deixar ele ligado ou desligado da tomada." },
      {
        de: 86,
        ate: 95.5,
        texto: "E as suas letrinhas, quais são? São mais de vinte genes ligados ao emagrecimento. Faça o seu teste nutrigenético e descubra.",
      },
    ],
    legenda: [
      "A semaglutida e a tirzepatida funcionam igual para todo mundo?",
      "Quando você come, o intestino libera duas chaves, o GLP1 e o GIP, que abrem fechaduras no cérebro e no pâncreas e trazem saciedade. Os genes GLP1R e GIPR são a receita dessas fechaduras, e elas mudam um pouquinho de pessoa para pessoa.",
      "Por isso a resposta à semaglutida e à tirzepatida não é igual para todo mundo, e o prato certo também ajuda: proteína, fibras, azeite e comer devagar fazem o intestino liberar mais chaves naturais.",
      "O uso de medicamentos é decisão do médico. Quer saber quais são as suas letrinhas? Me chama no direct.",
    ].join("\n\n"),
    temas: ["emagrec", "peso", "canetinha", "semaglutida", "tirzepatida", "glp", "diabet", "glicemia", "insulina", "saciedade"],
  },
  {
    id: "gene-comt",
    titulo: "Como funciona o gene do foco e da ansiedade (COMT)",
    molde: `${BASE}/comt.html`,
    poster: `${BASE}/comt.jpg`,
    versao: 1,
    duracaoSeg: 120,
    resumo:
      "O gene COMT e a dopamina: por que GG tende a procrastinar e buscar recompensa, por que AA tende à mente acelerada e à ansiedade, e o ajuste da alimentação e da rotina para cada letra.",
    roteiro: [
      {
        de: 0,
        ate: 15.4,
        texto:
          "Por que algumas pessoas procrastinam e outras não desligam a cabeça? Este é o gene do foco e da ansiedade. E a alimentação ajuda a ligar ou desligar esse gene da tomada.",
      },
      {
        de: 15.4,
        ate: 28.6,
        texto:
          "Mas o que é dopamina? Um mensageiro que passa de um neurônio para o outro. Ela dá energia, disposição e foco. E vai além do cérebro: mexe com o humor, os hormônios e o intestino.",
      },
      {
        de: 28.6,
        ate: 44.3,
        texto:
          "Este é o gene COMT, que regula a dopamina. Com GG, a enzima trabalha rápido e a dopamina vai embora cedo. Com AA, ela trabalha devagar e a dopamina fica mais tempo. Nenhuma letra é sentença: cada perfil pede uma conduta.",
      },
      {
        de: 44.3,
        ate: 53,
        texto: "O gene é uma receita. A cópia vira um recadinho, e a fábrica monta a enzima COMT, a recolhedora da dopamina.",
      },
      {
        de: 53,
        ate: 83,
        texto:
          "A COMT recolhe a dopamina depois que ela trabalha, para o cérebro não ficar ligado demais. Quem é GG tende a ter pouca dopamina: fica difícil manter a atenção, a procrastinação aparece, bate o cansaço e vem a vontade de comer por tédio. O cérebro vira um caçador de recompensa. Quem é AA tende a ter a mente acelerada: mais ansiedade, pensamentos que não param e o comer por ansiedade. Mas o AA tem um ponto forte: mais foco e concentração.",
      },
      {
        de: 83,
        ate: 106,
        texto:
          "Agora vem a parte boa: a comida ajuda, e cada letra pede um ajuste. Para GG, proteína no café da manhã, com ovos e carnes, e movimento, que libera dopamina de forma saudável. Vitamina D e complexo B também contam. Para AA, o ajuste é desacelerar: magnésio, abacate e sementes de abóbora, menos café, principalmente à tarde, e pausas para respirar.",
      },
      { de: 106, ate: 112, texto: "Não mudamos o gene. Mas a alimentação ajuda a deixar ele ligado ou desligado da tomada." },
      {
        de: 112,
        ate: 120,
        texto: "E as suas letrinhas, quais são? Para cada gene, uma conduta diferente. Faça o seu teste nutrigenético e descubra.",
      },
    ],
    legenda: [
      "Por que algumas pessoas procrastinam e outras não desligam a cabeça?",
      "O gene COMT monta a enzima que recolhe a dopamina, o combustível do foco e do prazer. Com GG, ela recolhe rápido: a dopamina vai embora cedo, a atenção escapa e o cérebro vive procurando recompensa. Com AA, ela recolhe devagar: a mente fica acelerada e a ansiedade aparece.",
      "Cada letra pede um ajuste diferente na alimentação e na rotina. Para um, proteína logo cedo e movimento. Para o outro, desacelerar, com menos café à tarde e pausas para respirar.",
      "Quer saber qual é a sua? Me chama no direct que eu te explico como funciona o teste nutrigenético.",
    ].join("\n\n"),
    temas: ["ansiedade", "foco", "concentra", "atencao", "procrastin", "dopamina", "saude mental", "estresse", "emocional", "compuls", "humor"],
  },
];

/** Fase de teste (Aline, 15/10/2026): só estas contas veem a seção. */
export const EMAILS_VIDEOS_MARCA = [
  "clinicanutrisecrets@gmail.com",
  "julimendesnutri@gmail.com",
  "suporte.vivitavares@gmail.com",
];

export function videosMarcaLiberadosPara(email: string | null | undefined): boolean {
  const e = (email ?? "").trim().toLowerCase();
  return !!e && EMAILS_VIDEOS_MARCA.includes(e);
}

export type MarcaVideo = { primaria: string; secundaria: string; logoUrl: string | null };

const HEX = /^#?([0-9a-f]{6})$/i;

/** Cor válida em #RRGGBB maiúsculo, ou null. */
export function corValida(c: string | null | undefined): string | null {
  const m = HEX.exec((c ?? "").trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

/** Sem cor cadastrada, o vídeo sai no tiffany e roxo do molde. */
export const COR_PADRAO = { primaria: "#0ABFBC", secundaria: "#7B5EA7" };

/**
 * Logo transparente de 1 px. Sem logo cadastrada o molde mostraria a do
 * Scanner da Saúde (é o padrão dele), e a logo de outra marca no vídeo de uma
 * profissional é exatamente o que este recurso existe pra evitar.
 */
export const LOGO_VAZIA = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function marcaDoCadastro(f: {
  cor_primaria_hex?: string | null;
  cor_secundaria_hex?: string | null;
  logoUrl?: string | null;
}): MarcaVideo {
  const logo = (f.logoUrl ?? "").trim();
  return {
    primaria: corValida(f.cor_primaria_hex) ?? COR_PADRAO.primaria,
    secundaria: corValida(f.cor_secundaria_hex) ?? COR_PADRAO.secundaria,
    logoUrl: /^https:\/\//i.test(logo) ? logo : null,
  };
}

/** Parâmetros que o molde lê do endereço. */
export function parametrosDoMolde(m: MarcaVideo): string {
  const q = new URLSearchParams();
  q.set("primaria", m.primaria);
  q.set("secundaria", m.secundaria);
  q.set("logo", m.logoUrl ?? LOGO_VAZIA);
  return q.toString();
}

/**
 * Identifica a combinação molde + versão + marca. Mudou qualquer um, muda a
 * assinatura e o vídeo é refeito. FNV-1a: curto, estável e sem depender de
 * crypto (roda igual no servidor e no teste).
 */
export function assinaturaVideoMarca(v: Pick<VideoMarca, "id" | "versao">, m: MarcaVideo): string {
  const texto = [v.id, v.versao, m.primaria, m.secundaria, m.logoUrl ?? ""].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${v.id}-v${v.versao}-${h.toString(16).padStart(8, "0")}`;
}

/** Vídeo em geração há mais que isto travou (o worker leva ~15 min). */
export const GERACAO_TRAVADA_MS = 60 * 60 * 1000;

export type LinhaVideoMarca = {
  video_id: string;
  assinatura: string;
  status: "gerando" | "pronto" | "erro";
  criado_em: string;
};

/** Precisa (re)gerar? Sem linha da assinatura atual, com erro, ou travada. */
export function precisaGerar(linha: LinhaVideoMarca | null | undefined, assinatura: string, agora = Date.now()): boolean {
  if (!linha || linha.assinatura !== assinatura) return true;
  if (linha.status === "pronto") return false;
  if (linha.status === "erro") return true;
  return agora - new Date(linha.criado_em).getTime() > GERACAO_TRAVADA_MS;
}

export function tempoRoteiro(seg: number): string {
  const s = Math.round(seg);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function roteiroComoTexto(v: VideoMarca, comTempos = true): string {
  return v.roteiro
    .map((t) => (comTempos ? `[${tempoRoteiro(t.de)} a ${tempoRoteiro(t.ate)}] ${t.texto}` : t.texto))
    .join("\n\n");
}
