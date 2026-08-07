/**
 * Biblioteca de ilustrações em traço (line-art) desenhadas à mão em SVG.
 *
 * Zero IA, zero custo, sempre perfeitas: contornos minimalistas no estilo
 * editorial premium (mulher em linha contínua, alimentos, ramos botânicos).
 * Cada ilustração é um conjunto de paths num viewBox 200x200, renderizado
 * com stroke na cor pedida.
 */

export type IlustracaoId =
  | "mulher"
  | "folhas"
  | "ramo"
  | "laranja"
  | "cha"
  | "coracao"
  | "intestino"
  | "dna";

type Ilustracao = {
  viewBox: string;
  /** paths com stroke (traço) */
  paths: string[];
  /** largura relativa do traço (sobre 200 de viewBox) */
  strokeWidth?: number;
};

const LIB: Record<IlustracaoId, Ilustracao> = {
  // Mulher de costas, coque, traço contínuo minimalista
  mulher: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      // coque
      "M103 22 C96 14 84 16 82 25 C80 33 88 39 96 36 C104 33 107 27 103 22 Z",
      // cabeça e pescoço
      "M96 36 C86 40 80 50 82 60 C83 68 88 74 94 77 C95 82 94 87 91 91",
      "M103 38 C111 44 114 54 111 64 C109 71 105 76 101 79 C101 83 102 87 105 90",
      // ombros e braços
      "M91 91 C76 96 64 104 58 118 C53 130 52 145 54 160",
      "M105 90 C122 95 134 105 139 120 C143 132 143 147 141 162",
      // linha das costas
      "M85 100 C82 118 82 136 86 154 C88 163 91 171 95 178",
      // curva do quadril
      "M111 102 C116 120 116 140 110 158 C107 166 104 172 100 178",
      // detalhe do braço esquerdo
      "M58 118 C60 132 63 144 70 154",
    ],
  },
  // Ramo de folhas (canto decorativo)
  folhas: {
    viewBox: "0 0 200 200",
    strokeWidth: 2,
    paths: [
      "M30 170 C60 140 90 105 130 78 C150 65 170 55 185 50",
      "M60 143 C55 128 58 114 68 104 C72 116 70 132 60 143 Z",
      "M88 118 C82 104 84 90 93 80 C98 92 96 108 88 118 Z",
      "M116 95 C112 82 115 68 124 60 C129 71 126 86 116 95 Z",
      "M143 76 C140 64 144 52 153 45 C157 55 153 68 143 76 Z",
      "M65 148 C79 146 92 149 102 158 C90 163 75 158 65 148 Z",
      "M95 122 C108 121 120 125 129 133 C118 138 104 132 95 122 Z",
      "M124 99 C136 97 147 100 156 108 C146 113 133 108 124 99 Z",
    ],
  },
  // Ramo fino curvo (tipo eucalipto)
  ramo: {
    viewBox: "0 0 200 200",
    strokeWidth: 2,
    paths: [
      "M40 185 C70 150 95 110 115 65 C122 48 128 32 132 18",
      "M112 72 C100 66 92 56 90 43 C102 46 111 57 112 72 Z",
      "M122 47 C112 41 106 31 105 19 C116 23 123 34 122 47 Z",
      "M118 60 C129 60 139 65 145 74 C134 77 123 71 118 60 Z",
      "M104 92 C93 87 86 78 84 66 C95 69 103 79 104 92 Z",
      "M100 100 C110 101 119 107 124 116 C113 118 103 111 100 100 Z",
      "M85 128 C75 124 68 116 66 105 C76 107 84 116 85 128 Z",
      "M81 137 C90 139 98 145 102 154 C92 155 83 148 81 137 Z",
    ],
  },
  // Laranja: fruta inteira + meia fatia
  laranja: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      // fruta inteira
      "M128 60 C155 60 176 82 176 110 C176 138 155 160 128 160 C101 160 80 138 80 110 C80 82 101 60 128 60 Z",
      // cabinho e folha
      "M128 60 C128 52 130 46 134 42",
      "M134 42 C142 32 156 30 166 36 C158 46 144 49 134 42 Z",
      // meia fatia à frente
      "M42 118 C70 118 92 136 92 160 L 42 160 Z",
      "M42 126 C62 126 80 139 84 154",
      // gomos da fatia
      "M50 160 C52 146 58 136 66 130",
      "M62 160 C64 150 69 142 76 137",
      "M75 160 C77 152 81 146 86 142",
    ],
  },
  // Xícara de chá com vapor
  cha: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M50 95 L150 95 C150 130 132 155 100 155 C68 155 50 130 50 95 Z",
      "M150 100 C168 100 175 112 168 124 C163 133 152 136 144 132",
      // pires
      "M40 162 C60 172 140 172 160 162",
      // vapor
      "M85 75 C80 65 88 58 84 48 C82 43 84 38 88 34",
      "M112 75 C107 65 115 58 111 48 C109 43 111 38 115 34",
      // folhinha no chá
      "M92 112 C97 104 106 101 114 104 C110 112 100 116 92 112 Z",
    ],
  },
  // Coração botânico num círculo
  coracao: {
    viewBox: "0 0 200 200",
    strokeWidth: 2,
    paths: [
      "M100 30 C140 30 172 62 172 100 C172 140 140 172 100 172 C60 172 28 140 28 100 C28 62 60 30 100 30 Z",
      "M100 135 C80 118 62 104 62 86 C62 72 74 63 86 66 C93 68 98 73 100 79 C102 73 107 68 114 66 C126 63 138 72 138 86 C138 104 120 118 100 135 Z",
      "M148 118 C156 116 163 118 168 124 C161 128 152 125 148 118 Z",
      "M152 128 C158 132 161 138 160 146 C153 142 150 135 152 128 Z",
    ],
  },
  // Intestino estilizado em traço
  intestino: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.4,
    paths: [
      "M70 40 C60 40 52 48 52 58 C52 68 60 74 70 74 L 130 74 C140 74 148 82 148 92 C148 102 140 108 130 108 L 70 108 C60 108 52 116 52 126 C52 136 60 142 70 142 L 130 142 C140 142 148 150 148 160",
      "M70 40 L 118 40 C126 40 132 34 132 26",
      // vilosidades sugeridas
      "M66 57 L 74 57 M86 57 L 94 57 M106 57 L 114 57",
      "M86 91 L 94 91 M106 91 L 114 91 M126 91 L 134 91",
      "M66 125 L 74 125 M86 125 L 94 125 M106 125 L 114 125",
    ],
  },
  // Hélice de DNA em traço
  dna: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M70 20 C70 55 130 65 130 100 C130 135 70 145 70 180",
      "M130 20 C130 55 70 65 70 100 C70 135 130 145 130 180",
      "M76 40 L 124 40",
      "M84 62 L 116 62",
      "M84 138 L 116 138",
      "M76 160 L 124 160",
      "M97 100 L 103 100",
    ],
  },
};

export const ILUSTRACOES_DISPONIVEIS: Array<{ id: IlustracaoId; nome: string }> = [
  { id: "mulher", nome: "Mulher (traço)" },
  { id: "folhas", nome: "Ramo de folhas" },
  { id: "ramo", nome: "Ramo fino" },
  { id: "laranja", nome: "Laranja" },
  { id: "cha", nome: "Xícara de chá" },
  { id: "coracao", nome: "Coração botânico" },
  { id: "intestino", nome: "Intestino" },
  { id: "dna", nome: "DNA" },
];

/** Gera o SVG da ilustração com o traço na cor/tamanho pedidos. */
export function svgIlustracao(
  id: IlustracaoId,
  tamanhoPx: number,
  cor: string,
  opacidade = 1,
): Buffer | null {
  const il = LIB[id];
  if (!il) return null;
  const sw = il.strokeWidth ?? 2;
  const op = opacidade < 1 ? ` opacity="${opacidade}"` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanhoPx}" height="${tamanhoPx}" viewBox="${il.viewBox}"><g fill="none" stroke="${cor}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${op}>${il.paths
    .map((d) => `<path d="${d}"/>`)
    .join("")}</g></svg>`;
  return Buffer.from(svg);
}
