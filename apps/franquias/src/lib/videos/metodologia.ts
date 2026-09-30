/**
 * Vídeos prontos da metodologia (Aline, 30/09/2026).
 *
 * Três vídeos que toda profissional pode baixar e postar como SEUS, sem marca
 * de ninguém: a Fábrica da Saúde (sem voz, pra ela narrar), o do cansaço e
 * memória ruim (narrado, com o final neutro) e o da consulta no tablet (sem
 * voz, pra música ou narração). A ideia dela é que fiquem FIXADOS no perfil,
 * como a apresentação da metodologia.
 *
 * Os arquivos moram em `public/videos-metodologia/`. Foram tratados à mão:
 *   • fábrica: áudio original tirado (era a voz da Aline dizendo "a minha
 *     metodologia"; na conta de outra profissional isso seria a voz errada);
 *   • cansaço: marca d'água apagada em todos os quadros e o cartão final da
 *     marca trocado por "Agende sua consulta / link na bio";
 *   • tablet: já era neutro.
 *
 * 🔴 Texto daqui é lido pela profissional e vai pra legenda dela: sem
 * travessão, sem "IA", sem nome de marca, sem promessa de cura. O teste
 * varre isso.
 */

export type TrechoRoteiro = { de: number; ate: number; texto: string };

export type VideoMetodologia = {
  id: string;
  titulo: string;
  /** Caminho público do arquivo (servido pelo próprio app). */
  arquivo: string;
  poster: string;
  duracaoSeg: number;
  /** O vídeo já tem voz? Se não, o roteiro é pra ela gravar por cima. */
  temVoz: boolean;
  resumo: string;
  /** Como usar, em passos curtos. */
  comoUsar: string[];
  roteiro: TrechoRoteiro[];
  legenda: string;
};

const BASE = "/videos-metodologia";

export const VIDEOS_METODOLOGIA: VideoMetodologia[] = [
  {
    id: "fabrica-da-saude",
    titulo: "A Fábrica da Saúde",
    arquivo: `${BASE}/fabrica-da-saude-sem-voz.mp4`,
    poster: `${BASE}/fabrica-da-saude.jpg`,
    duracaoSeg: 132,
    temVoz: false,
    resumo:
      "A metodologia inteira em 2 minutos: o corpo como uma fábrica com quatro setores, e o seu trabalho de detetive pra achar a causa. O vídeo vem sem voz, pra você narrar.",
    comoUsar: [
      "Baixe o vídeo.",
      "No Instagram, crie um Reels com ele e toque em Áudio, depois em Narração (voiceover).",
      "Leia o roteiro abaixo acompanhando os desenhos. Os tempos mostram em que cena cada parte entra.",
      "Poste com a legenda sugerida e fixe no seu perfil.",
    ],
    roteiro: [
      {
        de: 0,
        ate: 20,
        texto:
          "Talvez você já tenha passado por vários profissionais de saúde e ninguém conseguiu te ajudar a melhorar, mesmo você tentando de tudo. Se esse é o seu caso, eu quero te convidar a entender como o seu metabolismo funciona, e por que investigar a causa raiz é como montar o quebra-cabeça de um detetive.",
      },
      {
        de: 20,
        ate: 44,
        texto:
          "Pense no seu corpo como uma fábrica. Vou usar o exemplo de um bolo. Imagina que você encomendou um bolo e ele não chegou. Pode ter faltado fermento. O funcionário pode ter derrubado a massa no chão. O forno pode ter estragado. Ou o motoboy furou o pneu no caminho. Cada causa tem uma solução diferente.",
      },
      {
        de: 44,
        ate: 71,
        texto:
          "No seu corpo é igual. A matéria-prima são os seus exames de sangue: vitaminas, hormônios, minerais, inflamação. O maquinário é a sua genética: ela não muda, mas pode estar ligada ou desligada. Os funcionários são as suas emoções e o seu estilo de vida, como o sono e o estresse. E a logística é o intestino: o jeito que tudo entra e o jeito que tudo sai.",
      },
      {
        de: 71,
        ate: 84,
        texto:
          "O mesmo sintoma pode vir de causas diferentes. O trabalho do detetive da saúde é descobrir qual é a causa raiz, pra então montar uma conduta personalizada de alimentação e suplementação.",
      },
      {
        de: 84,
        ate: 102,
        texto:
          "Ter um olhar integrativo não é só passar suplemento e ir pro lado natural. É olhar todos os setores da fábrica, ligar isso à sua rotina e ao que você quer melhorar na sua saúde, e escutar os sinais que o seu corpo está dando.",
      },
      {
        de: 102,
        ate: 131,
        texto:
          "Se você quer desvendar o seu metabolismo e fazer um mapeamento da sua genética, da sua microbiota intestinal, dos seus hormônios, vitaminas e minerais, com alimentação terapêutica e suplementação individualizada, a minha metodologia é pra você. A sua saúde é preciosa demais pra ficar na tentativa. Aqui a gente trabalha com precisão, pra ter excelência no seu cuidado.",
      },
    ],
    legenda:
      "O seu corpo funciona como uma fábrica. 🏭\n\nMatéria-prima: os seus exames, vitaminas, hormônios e minerais.\nMaquinário: a sua genética, que pode estar ligada ou desligada.\nFuncionários: o seu sono, o seu estresse, as suas emoções.\nLogística: o seu intestino.\n\nO mesmo sintoma pode vir de setores diferentes. Por isso, antes de montar a sua alimentação e a sua suplementação, eu investigo a causa. É assim que eu trabalho.\n\nSe você cansou de tentar de tudo sem resultado, me chama no direct ou agende pelo link da bio.\n\n#nutricaodeprecisao #saudeintegrativa #nutrigenetica #microbiotaintestinal",
  },
  {
    id: "cansaco-memoria-ruim",
    titulo: "Cansaço e memória ruim",
    arquivo: `${BASE}/cansaco-memoria-ruim.mp4`,
    poster: `${BASE}/cansaco-memoria-ruim.jpg`,
    duracaoSeg: 98,
    temVoz: true,
    resumo:
      "Intestino, gene e prato numa história só: as bifidobactérias, o gene COMT e um omelete que junta quatro caminhos. Já vem narrado e termina com \"Agende sua consulta\", sem marca de ninguém.",
    comoUsar: [
      "Baixe o vídeo e poste como está: a narração já vem nele.",
      "Prefere a sua voz? No editor do Instagram, baixe o volume do áudio original pra zero e grave a narração lendo o roteiro abaixo.",
      "Poste com a legenda sugerida.",
    ],
    roteiro: [
      {
        de: 0,
        ate: 14,
        texto:
          "Você é inteligente, sabe o que precisa fazer, mas não consegue. Começa dez coisas e termina nenhuma. A memória falha, a irritabilidade aparece do nada, a fome descontrola e, no fim do dia, você só se ocupou.",
      },
      {
        de: 14,
        ate: 38,
        texto:
          "E se eu te dissesse que existe um exército dentro de você que pode estar com a tropa baixa? No seu intestino vive um grupo de bactérias chamado bifidobactérias. Elas participam da produção de mensageiros ligados ao humor, ao foco e à motivação. Quando esse exército enfraquece, por alimentação ruim, estresse ou antibióticos, vêm a preguiça, a irritabilidade, a memória que some e o apetite que não obedece.",
      },
      {
        de: 38,
        ate: 52,
        texto:
          "E ainda tem o gene COMT, que funciona como o botão de volume da dopamina, o combustível do foco. Algumas pessoas nascem com esse botão mais acelerado, e a dopamina é consumida antes de fazer efeito.",
      },
      {
        de: 52,
        ate: 80,
        texto:
          "A sinergia que ajuda a reconstruir isso cabe num omelete: ovo com sardinha, semente de abóbora por cima e uma pitada de cúrcuma com pimenta-preta. A tirosina do ovo ajuda a fabricar dopamina, o ômega-3 da sardinha protege os neurônios, o zinco da semente de abóbora favorece as bifidobactérias, e a cúrcuma com pimenta-preta ajuda a apagar a inflamação que derruba o foco. Um prato, quatro caminhos.",
      },
      {
        de: 80,
        ate: 98,
        texto:
          "E o melhor: existe exame que mostra quantas bifidobactérias você tem e como está o seu gene COMT. Com esse mapa na mão, um profissional especialista sabe o que usar pro seu caso, e não pro caso de todo mundo. Agende a sua consulta.",
      },
    ],
    legenda:
      "Começa dez coisas e não termina nenhuma? A memória falha e a fome não obedece?\n\nPode não ser falta de força de vontade. O seu intestino e a sua genética participam disso: as bifidobactérias ajudam a produzir mensageiros do humor e do foco, e o gene COMT regula a sua dopamina.\n\nNo vídeo tem um prato que junta quatro caminhos. E tem exame que mostra como estão os dois no seu corpo.\n\nQuer investigar o seu caso? Link na bio. 🧬\n\n#nutricaodeprecisao #microbiota #nutrigenetica #foco",
  },
  {
    id: "consulta-tablet",
    titulo: "O que você recebe na consulta",
    arquivo: `${BASE}/consulta-tablet.mp4`,
    poster: `${BASE}/consulta-tablet.jpg`,
    duracaoSeg: 67,
    temVoz: false,
    resumo:
      "Tour pelo que a paciente recebe: plano alimentar, suplementação com o motivo de cada item, genética mapeada e a trilha das próximas consultas. Os textos já estão na tela; sem voz e sem marca.",
    comoUsar: [
      "Baixe o vídeo.",
      "Coloque uma música instrumental calma da biblioteca do Instagram, ou narre com o roteiro abaixo (os textos da tela já contam a história).",
      "Poste com a legenda sugerida e fixe no perfil: é o vídeo que mostra o seu método.",
    ],
    roteiro: [
      {
        de: 0,
        ate: 5,
        texto: "A consulta nutrigenética não é só uma dieta. É o manual do seu corpo.",
      },
      {
        de: 5,
        ate: 25,
        texto:
          "Você recebe o seu plano alimentar, que não é cardápio pronto: é feito pro seu metabolismo e pros sintomas que você me contou. Tudo isso entra no mesmo prato.",
      },
      {
        de: 25,
        ate: 30,
        texto: "Recebe a sua suplementação, com o motivo de cada item escrito do lado.",
      },
      {
        de: 30,
        ate: 50,
        texto:
          "E a sua genética mapeada. Cada gene tem dois alelos, um do pai e um da mãe. E gene de risco não é sentença: ele pode estar ligado ou silenciado. Não é informação solta, é o seu corpo explicado.",
      },
      {
        de: 50,
        ate: 67,
        texto:
          "O mapa inteiro já é seu. Hoje a gente abre os primeiros genes, e a cada consulta a gente sobe um degrau. Agende a sua consulta.",
      },
    ],
    legenda:
      "Não é só uma dieta. É o manual do seu corpo. 🧬\n\nNa consulta você recebe:\n1. O seu plano alimentar, feito pro seu metabolismo\n2. A sua suplementação, com o motivo de cada item\n3. A sua genética mapeada, explicada em linguagem simples\n4. A sua trilha: a cada consulta a gente sobe um degrau\n\nGene de risco não é sentença. Ele pode estar ligado ou silenciado, e é aí que a alimentação entra.\n\nAgende pelo link da bio.\n\n#nutrigenetica #nutricaodeprecisao #consultanutricional",
  },
];

/** "01:05" */
export function tempoRoteiro(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = Math.floor(seg % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** O roteiro como texto corrido, com os tempos, pra copiar ou levar ao teleprompter. */
export function roteiroComoTexto(v: VideoMetodologia, comTempos = true): string {
  return v.roteiro
    .map((t) => (comTempos ? `[${tempoRoteiro(t.de)} a ${tempoRoteiro(t.ate)}]\n${t.texto}` : t.texto))
    .join("\n\n");
}
