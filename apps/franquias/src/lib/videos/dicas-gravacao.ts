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
    titulo: "Luz de janela, de frente",
    texto:
      "Fique de frente para uma janela, de preferência de manhã. Nunca de costas para ela: contra a luz o seu rosto fica escuro. Evite sol batendo direto.",
  },
  {
    icone: "🧽",
    titulo: "Limpe a lente",
    texto:
      "Passe um pano macio na câmera da frente do celular. Marca de dedo deixa a imagem embaçada.",
  },
  {
    icone: "🤫",
    titulo: "Lugar silencioso",
    texto:
      "Feche a janela se tiver barulho de rua, desligue ventilador e ar condicionado e avise quem está em casa. Cômodo com cortina, sofá ou tapete ecoa menos.",
  },
  {
    icone: "📱",
    titulo: "Celular firme, em pé",
    texto:
      "Apoie o celular na vertical, na altura dos olhos, a um braço de distância. Uma pilha de livros já resolve.",
  },
  {
    icone: "👀",
    titulo: "Olhe para a lentinha",
    texto:
      "Olhe para a câmera, não para a sua imagem na tela. O texto passa logo abaixo dela.",
  },
  {
    icone: "🎬",
    titulo: "Faça um teste curto",
    texto:
      "Grave 5 segundos e assista antes de valer: confira a luz, o som e se o enquadramento está bom.",
  },
];

/** Chave do "não mostrar de novo" neste aparelho. Mudou as dicas: suba a versão. */
export const CHAVE_DICAS_GRAVACAO = "teleprompter:dicas:v1";
