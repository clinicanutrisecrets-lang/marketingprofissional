/**
 * O POST FIXO do perfil: "Consulta integrativa de precisão e excelência"
 * (Aline, 15/10/2026).
 *
 * Toda conta do Consultório de Precisão recebe UMA VEZ, na primeira semana
 * montada depois que isto entrou no ar, um carrossel pra deixar fixado no
 * perfil, explicando a consulta. O modelo é o carrossel que a Aline aprovou
 * (pasta do Drive "Exemplo carrossel finalizado"), com as decisões dela:
 *  - a parte da genética fica, mais lúdica: o marketing inteiro existe pra
 *    elas venderem o teste nutrigenético e o epigenético, mesmo quem ainda
 *    não montou o produto na loja;
 *  - a ciência fica, "sempre descomplicando a ciência e com profissionalismo
 *    em cada prescrição";
 *  - o fecho: "Salve e agende sua consulta no link da bio".
 *
 * As fotos (public/post-fixo) vêm em quatro conjuntos (A, B, C e C1), e cada conta
 * recebe uma combinação própria, slide a slide, pra duas profissionais da
 * mesma cidade não ficarem com o carrossel igual. Cor e logo são as dela.
 *
 * Funções puras: nada de rede nem banco.
 */
import type { SlideEditorial } from "@scanner/ai-image";

/** Marca do post no banco: é por ela que a conta não recebe outro. */
export const PAPEL_POST_FIXO = "Post fixo do perfil: o que é a sua consulta";

export const LEMBRETE_POST_FIXO =
  "Este é pra deixar FIXADO no perfil: é o primeiro post que quem chega vê. Depois de postar, toque nos três pontinhos do post e em \"Fixar no perfil\". A legenda dá pra editar à vontade.";

export const AVISO_POST_FIXO = "Conteúdo informativo. Não substitui acompanhamento médico ou nutricional.";

/** As chaves das fotos (sem o conjunto). */
export const FOTOS_POST_FIXO = [
  "01-capa",
  "03-nutrigenetica",
  "04-nutrigenomica",
  "05-emocoes",
  "06-atividade-fisica",
  "07-estilo-de-vida",
  "08-como-funciona",
] as const;
export type FotoPostFixo = (typeof FOTOS_POST_FIXO)[number];

/** Os conjuntos de fotos do Drive (A, B, C e C1, Aline 15/10/2026). */
export const CONJUNTOS_POST_FIXO = ["a", "b", "c", "c1"] as const;
export type ConjuntoPostFixo = (typeof CONJUNTOS_POST_FIXO)[number];

/** Hash pequeno e estável (FNV-1a). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Qual conjunto cada foto usa nesta conta. Estável: a mesma conta
 * sempre cai na mesma combinação, então refazer não troca as fotos.
 */
export function combinacaoDeFotos(semente: string): Record<FotoPostFixo, ConjuntoPostFixo> {
  const out = {} as Record<FotoPostFixo, ConjuntoPostFixo>;
  for (const f of FOTOS_POST_FIXO) // Bit alto: o bit baixo do FNV só segue a paridade da soma dos caracteres,
  // e toda conta caía em uma de duas combinações.
  for (const f of FOTOS_POST_FIXO) out[f] = CONJUNTOS_POST_FIXO[(hash(`${semente}:${f}`) >>> 16) % CONJUNTOS_POST_FIXO.length]!;
  return out;
}

/** O arquivo de uma foto em public/post-fixo. */
export function arquivoDaFoto(conjunto: ConjuntoPostFixo, foto: FotoPostFixo): string {
  return `${conjunto}-${foto}.jpg`;
}

export function fotoDoPostFixoUrl(
  arquivo: string,
  base = process.env.NEXT_PUBLIC_APP_URL || "https://app.scannerdasaude.com",
): string {
  return `${base.replace(/\/+$/, "")}/post-fixo/${arquivo}`;
}

/** Slide do plano, com a foto que ele pede (o desenhador recebe o Buffer). */
export type SlidePostFixo =
  | Exclude<SlideEditorial, { tipo: "foto" }>
  | (Omit<Extract<SlideEditorial, { tipo: "foto" }>, "foto"> & { fotoNome: FotoPostFixo });

/** Os 10 slides, nesta ordem. A capa leva a foto "01-capa" (fotoCapa). */
export function slidesDoPostFixo(): SlidePostFixo[] {
  return [
    {
      tipo: "capa",
      kicker: "Saúde integral de precisão",
      titulo: "Consulta integrativa de precisão e excelência",
      subtitulo: "Seus genes, seus exames e a sua rotina no mesmo plano.",
    },
    {
      tipo: "meio",
      rotulo: "O que é a consulta",
      titulo: "Integrativa. De precisão. De excelência.",
      linhas: [
        { rotulo: "Integrativa", texto: "Olha o corpo inteiro: intestino, sono, emoções e rotina." },
        { rotulo: "De precisão", texto: "Parte dos seus dados, não de um protocolo genérico." },
        { rotulo: "Excelência", texto: "Cada indicação do plano tem uma justificativa." },
      ],
      rodape: "Nada de receita de prateleira",
    },
    {
      tipo: "foto",
      fotoNome: "03-nutrigenetica",
      rotulo: "Nutrigenética",
      titulo: "Seu DNA é o manual de instruções do seu corpo",
      subtitulo:
        "Ele conta como você aproveita cada nutriente. O gene MTHFR, por exemplo, muda o jeito como você usa o folato.",
    },
    {
      tipo: "foto",
      fotoNome: "04-nutrigenomica",
      rotulo: "Nutrigenômica",
      titulo: "A comida conversa com os seus genes",
      subtitulo: "Chá verde, cúrcuma e brócolis mandam recados que ajudam a ligar e desligar genes.",
    },
    {
      tipo: "foto",
      fotoNome: "05-emocoes",
      rotulo: "Emoções",
      titulo: "Emoções entram no plano",
      subtitulo: "Cortisol alto mexe com sono, apetite e escolhas à mesa.",
    },
    {
      tipo: "foto",
      fotoNome: "06-atividade-fisica",
      rotulo: "Atividade física",
      titulo: "Movimento é sinal metabólico",
      subtitulo: "A contração muscular capta glicose sem depender da insulina.",
    },
    {
      tipo: "foto",
      fotoNome: "07-estilo-de-vida",
      rotulo: "Estilo de vida",
      titulo: "Rotina, luz e sono",
      subtitulo: "O ritmo circadiano organiza hormônios, fome e metabolismo.",
    },
    {
      tipo: "foto",
      fotoNome: "08-como-funciona",
      rotulo: "Como funciona",
      titulo: "Da conversa ao plano",
      itens: [
        "Entendendo seus sinais e sintomas",
        "Exames de sangue",
        "Nutrigenética, estilo de vida e saúde emocional",
        "Plano individualizado",
        "Acompanhamento",
      ],
      rodape: "Consulta integrativa de precisão",
    },
    {
      tipo: "meio",
      rotulo: "Por que precisão e excelência",
      titulo: "O que muda no seu plano",
      linhas: [
        { rotulo: "Precisão", texto: "Dose, horário e combinação ajustados ao seu metabolismo." },
        { rotulo: "Excelência", texto: "Decisões baseadas em evidência, revisadas a cada retorno." },
        { rotulo: "Ciência", texto: "O que a ciência não sustenta, não entra no plano." },
        { rotulo: "Compromisso", texto: "Ciência descomplicada e profissionalismo em cada prescrição." },
      ],
      rodape: "Ciência aplicada ao seu caso",
    },
    {
      tipo: "fecho",
      rotulo: "Vamos começar",
      titulo: "Seu plano começa pelos seus dados",
      chamada:
        "Traga seus exames e a sua rotina real: o resto a gente organiza junto. Salve e agende sua consulta no link da bio.",
    },
  ];
}

/** A legenda inicial (editável na tela de aprovação). */
export const LEGENDA_POST_FIXO = [
  "Consulta integrativa de precisão e excelência: o que acontece aqui dentro.",
  "",
  "Seus genes, seus exames de sangue, o seu intestino, o seu sono, as suas emoções e a sua rotina real, lidos juntos. Porque o mesmo sintoma pode ter causas bem diferentes em duas pessoas.",
  "",
  "A nutrigenética mostra o manual de instruções do seu corpo. A nutrigenômica mostra como a comida conversa com ele. E a ciência entra descomplicada, com profissionalismo em cada prescrição.",
  "",
  "Salve este post e agende sua consulta pelo link da bio.",
].join("\n");

export const HASHTAGS_POST_FIXO = [
  "#nutricaodeprecisao",
  "#nutrigenetica",
  "#nutrigenomica",
  "#saudeintegrativa",
  "#consultaintegrativa",
];
