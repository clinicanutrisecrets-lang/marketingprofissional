/**
 * A Jornada até o Teste: leva o público da profissional de "não sabe que
 * tem um maquinário" até o pedido do teste nutrigenético (Aline,
 * 01–02/10/2026). Desde 02/10 TODA semana tem todos os níveis de
 * consciência (um post por ponto do caminho); o ciclo de 4 semanas só gira a
 * variante de cada nível, o par de queixas e o foco do post do teste (a
 * oferta com preço sai uma vez a cada 4 semanas).
 *
 * Por que isto existe: o gerador semanal já tinha os 5 níveis de consciência
 * (claude/consciencia.ts), mas o nível saía do ÂNGULO por uma rotação fixa,
 * sem memória de conta e sem destino. Medido em 90 dias: 202 posts, 1 só no
 * nível "mais consciente". Aqui a semana tem uma ESTRATÉGIA (o que ela faz
 * nesse ponto da jornada) e cada post tem um PAPEL nela.
 *
 * Decisões que este arquivo carrega, e não devem ser reabertas sem a Aline:
 *  • objeção NÃO vira post de resposta: entra dissolvida no gancho de um post
 *    de conteúdo. A resposta completa fica no Scanner (Esteira e "Como
 *    oferecer"), que é material da profissional, não da seguidora;
 *  • post de produto é SÓ o teste nutrigenético e o epigenético (o catálogo
 *    já chega filtrado por produtosDaEstrategia); sem nenhum dos dois, o slot
 *    vira autoridade;
 *  • no máximo 1 post comercial por semana (a trava que já valia);
 *  • o único número do teste que a copy pode citar é "mais de 300
 *    marcadores"; gene sempre pela FUNÇÃO, nunca "você tem o gene X".
 *
 * Função pura: roda no teste sem servidor.
 */
import type { AnguloPost, TipoPost } from "@/lib/claude/prompts";
import type { NivelConsciencia } from "@/lib/claude/consciencia";

export const SEMANAS_DA_JORNADA = 4;

export type EstrategiaSemana = {
  semana: number; // 1..4
  total: number; // 4
  titulo: string;
  frase: string;
  passos: string[];
  /** Assunto da rodada (as queixas do briefing dela, ou o nicho). */
  queixas: string[];
};

export type SlotJornada = {
  dia: number;
  tipo: TipoPost;
  angulo: AnguloPost;
  consciencia: NivelConsciencia;
  /** Uma frase pra ela: o que este post faz na semana. */
  papel: string;
  /** Lembrete de execução que aparece no card ("ponha a enquete por cima"). */
  lembrete?: string;
  /** Objeção dissolvida no gancho, quando houver (rótulo curto). */
  objecao?: string;
  /** Instrução completa que entra no prompt deste post. */
  instrucao: string;
};

type Modelo = {
  angulo: AnguloPost;
  consciencia: NivelConsciencia;
  papel: string;
  objecao?: string;
  /** Material do post (vai no prompt). {A} e {B} viram as queixas. */
  instrucao: string;
  nao_dizer: string[];
};

// Frases aprovadas da esteira do Scanner (lib/esteira-precisao.ts, degrau
// Consulta Nutrigenética: comoApresentar e amplitudeTeste). Copiadas aqui como
// MATERIAL do post; o modelo parafraseia, não cola.
const FABRICA =
  "O corpo é uma fábrica com quatro setores: matéria-prima (vitaminas, enzimas, hormônios), maquinário (as variações genéticas, o jeito como as máquinas foram montadas), logística (intestino, detoxificação, inflamação) e funcionários (sistema neuroendócrino e emocional). O maquinário é a parte que ninguém olhou ainda e a única que não muda a vida inteira.";
const AMPLITUDE =
  "O teste analisa mais de 300 marcadores genéticos, não só os ligados à queixa de hoje. Entre eles podem aparecer pontos de atenção sem relação com o que a pessoa sente agora, e são esses que se prioriza cuidar, pensando em prevenção e longevidade. A coleta é única: o DNA não muda, então se faz uma vez e vale pra sempre. Vira referência permanente: todo exame de sangue futuro passa a ser lido sabendo como o corpo processa cada nutriente.";
const COMO_FUNCIONA =
  "O kit de coleta chega em casa, a coleta é simples, e na devolutiva a profissional mostra gene por gene o que aquilo significa no prato e na rotina; o cardápio e a suplementação são desenhados em cima do resultado.";

const NAO_DIZER_BASE = [
  "nome de doença como conclusão sobre a seguidora",
  "promessa de resultado, de cura ou de prazo",
  "número que não esteja no material deste post",
  "travessão",
];
const NAO_DIZER_TESTE = [
  "\"você tem o gene X\" ou qualquer resultado antes da coleta",
  "sigla de gene sozinha (sempre pela função: \"a enzima que limpa a histamina\")",
  "qualquer número do teste além de \"mais de 300 marcadores\"",
];

/**
 * Os NÍVEIS de cada semana (Aline, 02/10/2026: "dentro da mesma semana ter
 * vários níveis de consciência do público"). O público não chega na semana 1
 * e segue em ordem: entra gente todo dia. Por isso TODA semana tem um post
 * pra cada ponto do caminho; o que gira de uma semana pra outra é a VARIANTE
 * (o ângulo dentro do nível) e o par de queixas, nunca o estágio do funil.
 *
 * Cada nível tem 4 variantes, uma por semana do ciclo (semanaDaJornada).
 */
type Nivel = "reconhecer" | "problema" | "mecanismo" | "teste" | "passo";

const NIVEIS: Record<Nivel, Modelo[]> = {
  // Quem acabou de chegar: se reconhecer. Sem exame nenhum.
  reconhecer: [
    {
      angulo: "educativo_ciencia",
      consciencia: "inconsciente",
      papel: "Descreve {A} como ela vive no dia a dia, até ela pensar \"isso sou eu\".",
      instrucao:
        "Assunto: {A}. Descreva a queixa com as palavras que a seguidora usaria, numa cena do dia a dia. Termine em \"isso tem explicação, e não é falta de força de vontade\".",
      nao_dizer: ["nome de exame, gene, marcador ou produto"],
    },
    {
      angulo: "educativo_ciencia",
      consciencia: "inconsciente",
      papel: "O reconhecimento, agora com {B}.",
      instrucao: "Assunto: {B}. Descreva a queixa com as palavras da seguidora, numa cena do dia a dia.",
      nao_dizer: ["nome de exame, gene, marcador ou produto"],
    },
    {
      angulo: "dor_do_paciente",
      consciencia: "inconsciente",
      papel: "Sinais de {A} que parecem normais e não são.",
      instrucao:
        "Assunto: {A}. Três ou quatro sinais do dia a dia que a seguidora acha normal e que fazem parte dessa queixa. Sem culpa e sem susto.",
      nao_dizer: ["nome de exame, gene, marcador ou produto", "culpa (\"você está fazendo errado\")"],
    },
    {
      angulo: "educativo_ciencia",
      consciencia: "inconsciente",
      papel: "Um dia comum de quem vive com {B}.",
      instrucao:
        "Assunto: {B}. Conte um dia comum de quem vive com essa queixa, da manhã à noite, com as palavras dela.",
      nao_dizer: ["nome de exame, gene, marcador ou produto"],
    },
  ],
  // Quem já se reconheceu: por que ainda não resolveu.
  problema: [
    {
      angulo: "dor_do_paciente",
      consciencia: "consciente_problema",
      papel: "Mostra por que o que ela já tentou para {A} não pegou a causa.",
      objecao: "Não muda nada na prática",
      instrucao:
        "Assunto: {A}. Nomeie a queixa melhor do que ela nomearia e mostre que restrição, suplemento solto e \"comer melhor\" mexem no estoque de hoje, não em como o corpo dela foi montado. Abra com uma pergunta que dissolve a objeção \"já tentei de tudo e não mudou nada\". Não responda a objeção de forma explícita.",
      nao_dizer: ["nome de gene ou de produto", "culpa (\"você está fazendo errado\")"],
    },
    {
      angulo: "mito_vs_verdade",
      consciencia: "consciente_problema",
      papel: "Exame normal e o sintoma continua: os dois podem estar certos.",
      objecao: "Já fiz exame e não deu nada",
      instrucao:
        "Explique que o exame de sangue mede o que está circulando hoje. Abra a pergunta \"e o que não muda?\" sem responder.",
      nao_dizer: ["depreciar o exame de sangue ou o médico", "citar o teste genético"],
    },
    {
      angulo: "educativo_ciencia",
      consciencia: "consciente_problema",
      papel: "A Fábrica da Saúde em telas, amarrada a {A}.",
      instrucao: `Assunto: {A}. Apresente a Fábrica da Saúde, um setor por tela, cada um amarrado à queixa. Feche em "o maquinário é a parte que a gente ainda não olhou". Material: ${FABRICA}`,
      nao_dizer: ["nome de gene", "dizer que a seguidora tem algum setor com problema"],
    },
    {
      angulo: "bastidor_da_nutri",
      consciencia: "consciente_problema",
      papel: "Bastidor: como você escuta uma queixa antes de pedir qualquer exame.",
      instrucao:
        "Bastidor da profissional: como ela escuta a queixa ({A}) e o que pergunta antes de pedir qualquer exame.",
      nao_dizer: ["caso de paciente inventado"],
    },
  ],
  // Quem já entendeu que tem algo a mais: o mecanismo, o maquinário.
  mecanismo: [
    {
      angulo: "autoridade",
      consciencia: "consciente_solucao",
      papel: "O que você olha que a abordagem comum não olha: o mecanismo de {A}.",
      instrucao: `Assunto: {A}. Explique o mecanismo de uma ou duas variações genéticas ligadas a essa queixa, sempre pela função ("quem tem a enzima X mais lenta costuma..."). Apresente "mapa genético" como caminho, sem nome de produto nem preço. Material: ${FABRICA}`,
      nao_dizer: [...NAO_DIZER_TESTE, "nome de produto ou preço"],
    },
    {
      angulo: "mito_vs_verdade",
      consciencia: "consciente_solucao",
      papel: "Genética é destino? Não: é o que se prioriza cuidar.",
      objecao: "Isso é modinha / genética é destino",
      instrucao:
        "Desfaça o medo: gene de risco não é destino, é o que se prioriza silenciar com alimentação e rotina. Diga também o que a leitura genética NÃO faz (não diz destino, não estabelece diagnóstico, não promete resultado): a honestidade sobre o limite é o que separa ciência de modinha.",
      nao_dizer: [...NAO_DIZER_TESTE, "\"previne a doença X\"", "\"comprovado cientificamente\" solto"],
    },
    {
      angulo: "autoridade",
      consciencia: "consciente_solucao",
      papel: "Por que a leitura dos dois exames juntos mostra o gargalo.",
      objecao: "Já fiz exame e não deu nada",
      instrucao:
        "Exame de sangue mede o estoque de hoje; o mapa genético mede como a fábrica foi montada. É o cruzamento dos dois que mostra o gargalo. Escreva \"avaliação individualizada\".",
      nao_dizer: [...NAO_DIZER_TESTE, "depreciar o exame de sangue", "dizer que o genético substitui o sangue"],
    },
    {
      angulo: "autoridade",
      consciencia: "consciente_solucao",
      papel: "O gene vira prato: um exemplo de mecanismo que vira conduta.",
      objecao: "Não muda nada na prática",
      instrucao: `Mostre com UM exemplo de mecanismo como um gene vira escolha no prato e na rotina (ex.: enzima da histamina mais lenta, escolhas de alimento e de preparo). ${COMO_FUNCIONA}`,
      nao_dizer: [...NAO_DIZER_TESTE, "prescrição pública com dose", "prazo de melhora"],
    },
  ],
  // Quem já entendeu o mecanismo: o teste pelo nome. É o único comercial.
  teste: [
    {
      angulo: "divulgacao_produto",
      consciencia: "consciente_produto",
      papel: "O teste entra pelo nome: o que ele investiga sobre {A}.",
      instrucao: `Assunto: {A}. O nome real do produto entra no corpo do post. Estrutura: a queixa, o que o teste investiga que o caminho comum não investiga, o convite pra entender. Preço ainda não. Material: ${AMPLITUDE}`,
      nao_dizer: [...NAO_DIZER_TESTE, "preço", "prazo de laudo ou de kit"],
    },
    {
      angulo: "divulgacao_produto",
      consciencia: "consciente_produto",
      papel: "O teste entra pelo nome: uma coleta, mais de 300 marcadores, referência pra sempre.",
      objecao: "É caro",
      instrucao: `O nome real do produto entra no corpo do post. Explique a amplitude com as palavras do material, nessa ordem: mais de 300 marcadores, coleta única, referência permanente, aprofunda a cada consulta. Abra com um gancho que dissolva a objeção de preço sem falar de preço (ex.: "Um exame que se faz uma vez. O resto você refaz todo ano."). Material: ${AMPLITUDE}`,
      nao_dizer: [...NAO_DIZER_TESTE, "preço", "nome de laboratório"],
    },
    {
      angulo: "divulgacao_produto",
      consciencia: "consciente_produto",
      papel: "O teste entra pelo nome: como funciona, do kit à devolutiva.",
      objecao: "Demora",
      instrucao: `O nome real do produto entra no corpo do post. Como funciona na prática: ${COMO_FUNCIONA} Dissolva a objeção "demora" dizendo que o cuidado começa antes do laudo, com o que já existe (exames, rotina, alimentação). Preço ainda não.`,
      nao_dizer: [...NAO_DIZER_TESTE, "prazo de kit ou de laudo", "preço"],
    },
    {
      angulo: "divulgacao_produto",
      consciencia: "mais_consciente",
      papel: "A oferta direta: o que inclui, preço do catálogo e como começar.",
      instrucao:
        "Oferta direta e curta: nome do produto, o que inclui, preço e parcelas EXATAMENTE como no catálogo (se não houver preço, \"o valor eu te passo na conversa\"), e como começar hoje. Sem recontar o problema.",
      nao_dizer: [...NAO_DIZER_TESTE, "condição que não esteja no catálogo", "prazo que se renova"],
    },
  ],
  // Quem já quer: o próximo passo, sem preço e sem pressão.
  passo: [
    {
      angulo: "bastidor_da_nutri",
      consciencia: "mais_consciente",
      papel: "O próximo passo: como começar, pra quem já decidiu.",
      instrucao:
        "Bastidor curto: como é o primeiro contato e o que acontece depois que a pessoa decide fazer o teste. Convite pro link da bio.",
      nao_dizer: [...NAO_DIZER_TESTE, "inventar \"muita gente me pergunta\""],
    },
    {
      angulo: "mito_vs_verdade",
      consciencia: "consciente_produto",
      papel: "A dúvida mais comum sobre o teste, respondida pelo mecanismo.",
      objecao: "É caro / demora",
      instrucao: `Responda a dúvida mais comum sobre o teste pelo mecanismo, não pelo preço: coleta única, referência permanente, o cuidado começa antes do laudo. Material: ${AMPLITUDE}`,
      nao_dizer: [...NAO_DIZER_TESTE, "depreciar outra área"],
    },
    {
      angulo: "bastidor_da_nutri",
      consciencia: "consciente_produto",
      papel: "Bastidor: como você conduz uma devolutiva gene a gene.",
      instrucao: `Bastidor de como a profissional conduz a devolutiva: ${COMO_FUNCIONA}`,
      nao_dizer: [...NAO_DIZER_TESTE, "laudo, exame ou medida de paciente"],
    },
    {
      angulo: "bastidor_da_nutri",
      consciencia: "mais_consciente",
      papel: "O que a pessoa leva pra casa depois da devolutiva.",
      instrucao: `Bastidor curto: o que a pessoa leva pra casa (cardápio e suplementação desenhados sobre o resultado) e como fica o acompanhamento. Convite pro link da bio. ${COMO_FUNCIONA}`,
      nao_dizer: [...NAO_DIZER_TESTE, "prazo de melhora"],
    },
  ],
};

/**
 * Em que ordem os níveis entram na semana, pela quantidade de posts. O 1º
 * vira reel (quando ela tem reel semanal) e o 2º vira carrossel: o
 * reconhecimento é o que mais alcança gente nova, e o mecanismo é o que mais
 * precisa de telas. O teste vem no fim da semana, depois de o mecanismo ter
 * sido mostrado. Com 1 ou 2 posts não cabe todo o caminho, então o nível
 * gira com a semana.
 */
function niveisDaSemana(n: number, semana: number): Nivel[] {
  if (n <= 1) return [(["reconhecer", "mecanismo", "teste", "teste"] as Nivel[])[semana - 1]!];
  if (n === 2) return [semana % 2 === 1 ? "reconhecer" : "mecanismo", "teste"];
  const base: Nivel[] =
    n === 3
      ? ["reconhecer", "mecanismo", "teste"]
      : n === 4
        ? ["reconhecer", "mecanismo", "problema", "teste"]
        : ["reconhecer", "mecanismo", "problema", "teste", "passo"];
  // Mais de 5 posts: os níveis de conteúdo se repetem com a variante seguinte
  // (o teste não repete: no máximo 1 comercial por semana).
  const extras: Nivel[] = ["reconhecer", "problema", "mecanismo", "passo"];
  for (let i = 0; base.length < n; i++) base.push(extras[i % extras.length]!);
  return base;
}

/** Sem o teste no catálogo, o post do teste vira mecanismo (mesma semana). */
const SEM_TESTE: Modelo[] = [
  {
    angulo: "autoridade",
    consciencia: "consciente_solucao",
    papel: "O que um mapa genético investiga sobre {A} que o caminho comum não investiga.",
    instrucao: `Assunto: {A}. O que a leitura genética investiga que o caminho comum não investiga, sem nome de produto nem preço. Material: ${AMPLITUDE}`,
    nao_dizer: [...NAO_DIZER_TESTE, "nome de produto ou preço"],
  },
  {
    angulo: "autoridade",
    consciencia: "consciente_solucao",
    papel: "Um exame que se faz uma vez na vida.",
    instrucao: `Explique a amplitude da leitura genética, sem nome de produto nem preço: mais de 300 marcadores, coleta única, referência permanente. Material: ${AMPLITUDE}`,
    nao_dizer: [...NAO_DIZER_TESTE, "nome de produto ou preço"],
  },
  {
    angulo: "bastidor_da_nutri",
    consciencia: "consciente_solucao",
    papel: "Como funciona a leitura genética, do kit à devolutiva.",
    instrucao: `Como funciona na prática, sem nome de produto nem preço: ${COMO_FUNCIONA}`,
    nao_dizer: [...NAO_DIZER_TESTE, "nome de produto ou preço"],
  },
  {
    angulo: "bastidor_da_nutri",
    consciencia: "consciente_solucao",
    papel: "O próximo passo: como é a sua avaliação.",
    instrucao: "Bastidor curto: como é a avaliação com a profissional e como começar. Convite pro link da bio, sem preço.",
    nao_dizer: [...NAO_DIZER_TESTE, "preço"],
  },
];

/**
 * A cara de cada semana do ciclo: o foco do post do teste e a conversa dos
 * stories. O resto da semana é o caminho inteiro, toda semana.
 */
const SEMANAS: Array<{
  titulo: string;
  foco: string;
  stories: { papel: string; lembrete: string; instrucao: string };
}> = [
  {
    titulo: "O que o teste investiga",
    foco: "apresenta o teste pelo que ele investiga, sem preço",
    stories: {
      papel: "Enquete: qual dessas você sente?",
      lembrete:
        "A arte está pronta. Ponha a enquete por cima no Instagram com as opções: {A} / {B}.",
      instrucao:
        "Stories de conversa: pergunte qual dessas a seguidora sente, {A} ou {B}. Texto curto, a enquete ela põe por cima.",
    },
  },
  {
    titulo: "Um exame que se faz uma vez",
    foco: "mostra a amplitude do teste: mais de 300 marcadores e coleta única",
    stories: {
      papel: "Caixinha de perguntas sobre o exame que se faz uma vez na vida.",
      lembrete:
        "A arte está pronta. Ponha a caixinha de perguntas por cima: \"O que você quer saber sobre um exame que se faz uma vez na vida?\"",
      instrucao:
        "Stories de conversa: convide a seguidora a perguntar o que quer saber sobre um exame que se faz uma vez na vida. A caixinha ela põe por cima.",
    },
  },
  {
    titulo: "Do kit à devolutiva",
    foco: "mostra como funciona na prática, do kit em casa à devolutiva",
    stories: {
      papel: "O que está incluído, com o link.",
      lembrete: "A arte está pronta. Ponha o adesivo de link por cima, apontando pra página do seu teste.",
      instrucao:
        "Stories: o que a pessoa leva pra casa com o teste (kit em casa, devolutiva gene a gene, cardápio e suplementação sobre o resultado). Uma frase por tela.",
    },
  },
  {
    titulo: "O convite com preço",
    foco: "é a oferta direta, com o preço do seu catálogo",
    stories: {
      papel: "O link direto do teste.",
      lembrete:
        "A arte está pronta. Ponha o adesivo de link por cima. Escassez só se for real (vagas que a sua agenda comporta).",
      instrucao: "Stories curto: convite direto pro teste, uma frase por tela. Sem contador, sem \"últimas vagas\".",
    },
  },
];

/**
 * A segunda-feira em que a jornada começa pra todas as contas (o 1º pacote
 * gerado com ela é o do domingo 04/10/2026, que cria a semana de 05/10). Sem
 * esta âncora a contagem saía da época Unix e o primeiro pacote caía na
 * semana 2, com todo mundo começando a jornada pelo meio.
 */
export const INICIO_JORNADA = "2026-10-05";
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

/** Semanas desde o início da jornada (pode ser negativo antes dela). */
function semanasDesdeInicio(semanaRef?: string): number | null {
  const t = semanaRef ? Date.parse(semanaRef) : NaN;
  if (Number.isNaN(t)) return null;
  return Math.floor((t - Date.parse(INICIO_JORNADA)) / SEMANA_MS);
}

/** Qual semana da jornada (1..4) cai nesta segunda-feira. */
export function semanaDaJornada(semanaRef?: string): number {
  const idx = semanasDesdeInicio(semanaRef);
  if (idx === null) return 1;
  return (((idx % SEMANAS_DA_JORNADA) + SEMANAS_DA_JORNADA) % SEMANAS_DA_JORNADA) + 1;
}

/** Qual rodada (ciclo de 4 semanas): troca o par de queixas. */
function rodadaDaJornada(semanaRef?: string): number {
  const idx = semanasDesdeInicio(semanaRef);
  if (idx === null) return 0;
  return Math.floor(idx / SEMANAS_DA_JORNADA);
}

/**
 * As duas queixas da rodada, das que ela declarou. Texto longo (frase livre
 * do questionário) não vira assunto de post. Sem queixa declarada, o assunto
 * é o nicho dela.
 */
export function queixasDaRodada(queixas: string[] | null | undefined, nicho: string, semanaRef?: string): [string, string] {
  const curtas = (queixas ?? []).map((q) => q.trim()).filter((q) => q.length > 0 && q.length <= 60);
  if (curtas.length === 0) {
    const n = nicho.replace(/_/g, " ");
    return [`a queixa mais comum de quem procura ${n}`, `outra queixa comum de quem procura ${n}`];
  }
  if (curtas.length === 1) return [curtas[0]!, curtas[0]!];
  const r = rodadaDaJornada(semanaRef);
  const i = (r * 2) % curtas.length;
  return [curtas[i]!, curtas[(i + 1) % curtas.length]!];
}

const FRASE_SEMANA =
  "Toda semana tem um post pra cada ponto do caminho: quem acabou de chegar se reconhece, quem já se reconheceu entende o mecanismo, quem já entendeu vê o teste pelo nome.";

const preencher = (s: string, a: string, b: string) => s.replaceAll("{A}", a).replaceAll("{B}", b);

function tipoDoFeed(i: number, n: number, frequenciaReels?: string): TipoPost {
  const ehReels =
    (frequenciaReels === "semanal" && i === 0) ||
    (frequenciaReels === "2x_semana" && (i === 0 || i === Math.floor(n / 2)));
  if (ehReels) return "reels";
  if (i === 1) return "feed_carrossel";
  return "feed_imagem";
}

function diasDosStories(freq?: string): number[] {
  switch (freq) {
    case "diario":
      return [0, 1, 2, 3, 4, 5, 6];
    case "dias_uteis":
      return [1, 2, 3, 4, 5];
    case "3x_semana":
      return [1, 3, 5];
    case "semanal":
      return [3];
    default:
      return [1, 3, 5];
  }
}

const ANGULOS_STORIES_ROTINA: AnguloPost[] = ["bastidor_da_nutri", "educativo_ciencia", "mito_vs_verdade"];

/**
 * O plano da semana dentro da jornada: a estratégia + um slot por post.
 * Mesmas regras de formato e de frequência do planejarSemana antigo.
 */
export function planoDaJornada(params: {
  semanaRef?: string;
  diasPostSemana?: number[];
  frequenciaReels?: string;
  frequenciaStories?: string;
  temProdutos?: boolean;
  /** Catálogo já filtrado (só os dois testes). Dá nome ao post de produto. */
  produtos?: ProdutoDaJornada[];
  queixas?: string[] | null;
  nicho?: string;
}): { estrategia: EstrategiaSemana; slots: SlotJornada[] } {
  const semana = semanaDaJornada(params.semanaRef);
  const modelo = SEMANAS[semana - 1]!;
  const [a, b] = queixasDaRodada(params.queixas, params.nicho ?? "nutrição", params.semanaRef);
  const dias = params.diasPostSemana?.length ? params.diasPostSemana : [1, 3, 5];
  const produtoDaSemana = produtoDoSlot(semana, params.produtos ?? []);
  const temProdutos = params.produtos ? produtoDaSemana !== null : (params.temProdutos ?? false);
  const niveis = niveisDaSemana(dias.length, semana);
  const vistos: Record<string, number> = {};

  let comerciais = 0;
  const slots: SlotJornada[] = dias.map((dia, i) => {
    const nivel = niveis[i]!;
    // Nível repetido na mesma semana (mais de 5 posts) pega a variante seguinte.
    const rep = vistos[nivel] ?? 0;
    vistos[nivel] = rep + 1;
    const v = (semana - 1 + rep) % SEMANAS_DA_JORNADA;
    let m = NIVEIS[nivel][v]!;
    // Sem o teste no catálogo, o post do teste fala da leitura genética sem
    // nome nem preço (senão o modelo inventaria a oferta).
    if (nivel === "teste" && !temProdutos) m = SEM_TESTE[v]!;
    // Trava de saturação que já valia: no máximo 1 comercial por semana.
    if (m.angulo === "divulgacao_produto" || m.angulo === "chamada_direta") {
      comerciais += 1;
      if (comerciais > 1) m = SEM_TESTE[v]!;
    }
    const naoDizer = [...NAO_DIZER_BASE, ...m.nao_dizer];
    const instrucao = [
      `ESTRATÉGIA DA SEMANA ("${modelo.titulo}"): ${FRASE_SEMANA} Nesta semana o post do teste ${modelo.foco}.`,
      `PAPEL DESTE POST: ${preencher(m.papel, a, b)}`,
      preencher(m.instrucao, a, b),
      m.angulo === "divulgacao_produto" && produtoDaSemana
        ? `PRODUTO DESTE POST: ${produtoDaSemana.nome}. Nome, preço e link EXATAMENTE como no catálogo; nenhum outro produto entra.`
        : "",
      m.objecao
        ? `Objeção a dissolver no GANCHO, sem dizer que é uma objeção e sem post de "resposta": "${m.objecao}".`
        : "",
      `NÃO DIZER: ${naoDizer.join("; ")}.`,
    ]
      .filter(Boolean)
      .join("\n");
    return {
      dia,
      tipo: tipoDoFeed(i, dias.length, params.frequenciaReels),
      angulo: m.angulo,
      consciencia: m.consciencia,
      papel: preencher(m.papel, a, b),
      objecao: m.objecao,
      instrucao,
    };
  });

  // Stories: o 1º dia é a conversa da estratégia (enquete/caixinha/link);
  // os outros seguem a rotina de conversa diária, sem oferta.
  diasDosStories(params.frequenciaStories).forEach((dia, i) => {
    if (i === 0) {
      slots.push({
        dia,
        tipo: "stories",
        angulo: "bastidor_da_nutri",
        consciencia: semana >= 3 ? "consciente_produto" : "consciente_problema",
        papel: preencher(modelo.stories.papel, a, b),
        lembrete: preencher(modelo.stories.lembrete, a, b),
        instrucao: [
          `ESTRATÉGIA DA SEMANA ("${modelo.titulo}").`,
          preencher(modelo.stories.instrucao, a, b),
          `NÃO DIZER: ${[...NAO_DIZER_BASE, ...NAO_DIZER_TESTE].join("; ")}.`,
        ].join("\n"),
      });
      return;
    }
    const angulo = ANGULOS_STORIES_ROTINA[(i - 1) % ANGULOS_STORIES_ROTINA.length]!;
    slots.push({
      dia,
      tipo: "stories",
      angulo,
      consciencia: angulo === "educativo_ciencia" ? "inconsciente" : "consciente_problema",
      papel: "Conversa do dia: mantém o perfil vivo entre os posts.",
      instrucao: `Stories de conversa do dia sobre ${a}. Tom íntimo, sem oferta.\nNÃO DIZER: ${NAO_DIZER_BASE.join("; ")}.`,
    });
  });

  return {
    estrategia: {
      semana,
      total: SEMANAS_DA_JORNADA,
      titulo: modelo.titulo,
      frase: `${FRASE_SEMANA} Nesta semana o post do teste ${modelo.foco}.`,
      // Um passo por post do feed: o que cada um faz no caminho.
      passos: slots.filter((s) => s.tipo !== "stories").map((s) => s.papel),
      queixas: a === b ? [a] : [a, b],
    },
    slots,
  };
}

export type ProdutoDaJornada = { nome: string; scanner_produto_id?: string | null };

/**
 * Qual teste o post de produto nomeia. Semana 3 apresenta o mapa genético
 * (é o assunto da jornada); semana 4 abre o epigenético quando ela vende,
 * porque é o passo seguinte de quem já entendeu o genético. Sem o preferido,
 * vale o outro; sem nenhum dos dois, null (o slot vira autoridade).
 */
export function produtoDoSlot(semana: number, produtos: ProdutoDaJornada[]): ProdutoDaJornada | null {
  const gen = produtos.find((p) => p.scanner_produto_id === "teste_genetico") ?? null;
  const epi = produtos.find((p) => p.scanner_produto_id === "teste_epigenetico") ?? null;
  if (semana === 4) return epi ?? gen;
  return gen ?? epi;
}

/** Resumo em uma linha, pro aviso do painel ("Estratégia da semana: O que o teste investiga"). */
export function rotuloEstrategia(e: Pick<EstrategiaSemana, "titulo">): string {
  return `Estratégia da semana: ${e.titulo}`;
}
