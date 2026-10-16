/**
 * Dicas rápidas que aparecem ANTES de a câmera abrir no teleprompter (Aline,
 * 16/10/2026): a maioria das profissionais não sabe gravar e não tem
 * equipamento, então as dicas são do celular e da casa, nunca de microfone ou
 * luz profissional.
 *
 * 🔴 Texto da tela, lido pela profissional: sem travessão.
 */
export type DicaGravacao = { icone: string; titulo: string; texto: string };

export const DICAS_GRAVACAO: DicaGravacao[] = [
  {
    icone: "🪟",
    titulo: "Janela ao seu lado",
    texto:
      "A luz mais bonita vem da janela de lado. Se não der, fique de frente para ela, de preferência de manhã. Nunca de costas: contra a luz o rosto fica escuro.",
  },
  {
    icone: "🛋️",
    titulo: "O que aparece atrás de você",
    texto:
      "Estante de livros, a mesa do consultório ou o sofá ficam lindos. Se tiver bagunça, prefira uma parede lisa, de uma cor só. E confira que ninguém vai passar atrás.",
  },
  {
    icone: "🧽",
    titulo: "Limpe a lente",
    texto: "Passe um pano macio na câmera da frente do celular. Marca de dedo deixa a imagem embaçada.",
  },
  {
    icone: "🤫",
    titulo: "Lugar silencioso",
    texto:
      "Feche a janela se tiver barulho de rua, desligue ventilador e ar condicionado e avise quem está em casa.",
  },
  {
    icone: "📱",
    titulo: "Celular firme, em pé",
    texto:
      "Na vertical, na altura dos olhos, a um braço de distância. Uma pilha de livros já resolve. Olhe para a lentinha, não para a sua imagem.",
  },
  {
    icone: "🎬",
    titulo: "Teste antes, na câmera do celular",
    texto:
      "Antes de gravar aqui, grave 5 segundos com a câmera normal do seu celular e assista: confira a luz, o som e o enquadramento.",
  },
];

/** Chave do "não mostrar de novo" neste aparelho. Mudou as dicas: suba a versão. */
export const CHAVE_DICAS_GRAVACAO = "teleprompter:dicas:v2";
