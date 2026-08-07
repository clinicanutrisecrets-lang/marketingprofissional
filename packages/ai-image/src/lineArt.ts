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
  | "dna"
  | "balanca"
  | "prato"
  | "lupa"
  | "celulas"
  | "microbiota"
  | "exame"
  | "estetoscopio"
  | "maca"
  | "abacate"
  | "uvas"
  | "morango"
  | "salada"
  | "cereais"
  | "leguminosas"
  | "peixe"
  | "ovo"
  | "cafe"
  | "suco";

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
  // Balança de dois pratos (equilíbrio, não fitness)
  balanca: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M100 30 L100 150",
      "M60 44 L140 44",
      "M100 30 C104 30 107 33 107 37 C107 41 104 44 100 44 C96 44 93 41 93 37 C93 33 96 30 100 30 Z",
      // prato esquerdo
      "M60 44 L44 88 M60 44 L76 88",
      "M40 88 C40 100 50 108 60 108 C70 108 80 100 80 88 Z",
      // prato direito
      "M140 44 L124 88 M140 44 L156 88",
      "M120 88 C120 100 130 108 140 108 C150 108 160 100 160 88 Z",
      // base
      "M70 172 L130 172 M100 150 C100 158 100 164 100 172",
      "M84 161 C92 156 108 156 116 161",
    ],
  },
  // Prato com talheres
  prato: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M100 55 C130 55 154 76 154 102 C154 128 130 149 100 149 C70 149 46 128 46 102 C46 76 70 55 100 55 Z",
      "M100 74 C117 74 131 87 131 102 C131 117 117 130 100 130 C83 130 69 117 69 102 C69 87 83 74 100 74 Z",
      // garfo
      "M26 58 L26 146 M18 58 L18 84 C18 92 34 92 34 84 L34 58 M26 58 L26 84",
      // faca
      "M174 58 C180 74 180 92 174 104 L174 146",
    ],
  },
  // Lupa investigativa
  lupa: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.4,
    paths: [
      "M86 34 C116 34 140 58 140 88 C140 118 116 142 86 142 C56 142 32 118 32 88 C32 58 56 34 86 34 Z",
      "M86 50 C107 50 124 67 124 88",
      "M126 128 L166 168",
      "M158 160 L170 172 C174 176 180 170 176 166 L164 154",
      // pontinhos investigados dentro
      "M70 82 L74 82 M86 96 L90 96 M98 76 L102 76",
    ],
  },
  // Células
  celulas: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M76 42 C104 42 126 62 126 88 C126 114 104 134 76 134 C48 134 28 114 28 88 C28 62 48 42 76 42 Z",
      "M76 70 C86 70 94 78 94 88 C94 98 86 106 76 106 C66 106 58 98 58 88 C58 78 66 70 76 70 Z",
      "M148 100 C168 100 182 114 182 132 C182 150 168 164 148 164 C128 164 114 150 114 132 C114 114 128 100 148 100 Z",
      "M148 122 C154 122 158 126 158 132 C158 138 154 142 148 142 C142 142 138 138 138 132 C138 126 142 122 148 122 Z",
      "M120 36 C132 36 140 44 140 54 C140 64 132 72 120 72 C108 72 100 64 100 54 C100 44 108 36 120 36 Z",
    ],
  },
  // Microbiota: bactérias variadas
  microbiota: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      // bacilo grande
      "M46 60 L110 60 C122 60 130 70 130 80 C130 90 122 100 110 100 L46 100 C34 100 26 90 26 80 C26 70 34 60 46 60 Z",
      "M46 74 L50 74 M62 84 L66 84 M82 72 L86 72 M100 84 L104 84",
      // coco (redonda) com cílios
      "M156 52 C170 52 180 62 180 76 C180 90 170 100 156 100 C142 100 132 90 132 76 C132 62 142 52 156 52 Z",
      "M150 44 L148 36 M162 44 L164 36 M176 58 L184 54",
      // espiral
      "M50 128 C58 120 70 122 74 130 C78 138 72 146 64 146 C58 146 54 141 56 136 C58 132 63 131 66 134",
      // bacilo pequeno inclinado
      "M104 128 L148 152 C156 157 166 152 168 144 C170 136 164 128 156 126 L112 116",
      "M120 126 L124 128 M138 136 L142 138",
    ],
  },
  // Tubo de ensaio + gotas (exames)
  exame: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M74 30 L74 130 C74 148 88 160 104 160 C120 160 134 148 134 130 L134 30",
      "M64 30 L144 30",
      "M74 92 L134 92",
      "M88 112 C90 108 94 108 96 112 M112 128 C114 124 118 124 120 128",
      // gota externa
      "M52 96 C52 88 60 76 60 76 C60 76 68 88 68 96 C68 102 64 106 60 106 C56 106 52 102 52 96 Z",
    ],
  },
  // Estetoscópio
  estetoscopio: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.4,
    paths: [
      "M56 30 L56 76 C56 104 76 122 98 122 C120 122 140 104 140 76 L140 30",
      "M48 26 L64 26 M132 26 L148 26",
      "M98 122 L98 142 C98 158 110 168 124 168 C138 168 150 158 150 144 L150 118",
      "M150 96 C160 96 168 104 168 114 C168 124 160 132 150 132 C140 132 132 124 132 114 C132 104 140 96 150 96 Z",
      "M150 106 C154 106 158 110 158 114",
    ],
  },
  // Maçã
  maca: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M100 62 C82 46 54 52 44 74 C32 100 44 138 64 154 C76 164 88 162 100 154 C112 162 124 164 136 154 C156 138 168 100 156 74 C146 52 118 46 100 62 Z",
      "M100 62 C100 50 102 42 108 34",
      "M108 34 C118 26 132 26 140 32 C132 42 118 44 108 34 Z",
    ],
  },
  // Abacate cortado
  abacate: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M100 30 C120 30 128 48 134 68 C142 92 158 102 158 128 C158 158 132 176 100 176 C68 176 42 158 42 128 C42 102 58 92 66 68 C72 48 80 30 100 30 Z",
      "M100 96 C116 96 128 110 128 126 C128 142 116 154 100 154 C84 154 72 142 72 126 C72 110 84 96 100 96 Z",
      "M100 112 C108 112 114 118 114 126",
    ],
  },
  // Cacho de uvas
  uvas: {
    viewBox: "0 0 200 200",
    strokeWidth: 2,
    paths: [
      "M100 34 C100 26 104 20 112 16",
      "M100 34 C112 28 126 32 130 42",
      "M74 52 C84 52 92 60 92 70 C92 80 84 88 74 88 C64 88 56 80 56 70 C56 60 64 52 74 52 Z",
      "M126 52 C136 52 144 60 144 70 C144 80 136 88 126 88 C116 88 108 80 108 70 C108 60 116 52 126 52 Z",
      "M100 44 C110 44 118 52 118 62 C118 72 110 80 100 80 C90 80 82 72 82 62 C82 52 90 44 100 44 Z",
      "M87 88 C97 88 105 96 105 106 C105 116 97 124 87 124 C77 124 69 116 69 106 C69 96 77 88 87 88 Z",
      "M113 88 C123 88 131 96 131 106 C131 116 123 124 113 124 C103 124 95 116 95 106 C95 96 103 88 113 88 Z",
      "M100 124 C110 124 118 132 118 142 C118 152 110 160 100 160 C90 160 82 152 82 142 C82 132 90 124 100 124 Z",
    ],
  },
  // Morango
  morango: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M100 58 C130 58 152 76 152 100 C152 134 128 162 100 172 C72 162 48 134 48 100 C48 76 70 58 100 58 Z",
      "M100 58 C92 48 78 44 66 48 C74 56 88 60 100 58 Z",
      "M100 58 C108 48 122 44 134 48 C126 56 112 60 100 58 Z",
      "M100 58 L100 42 C100 38 102 34 106 32",
      "M78 88 L82 92 M118 84 L122 88 M96 112 L100 116 M74 116 L78 120 M120 118 L124 122 M98 142 L102 146",
    ],
  },
  // Bowl de salada
  salada: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M34 100 L166 100 C166 134 138 160 100 160 C62 160 34 134 34 100 Z",
      "M48 172 C70 180 130 180 152 172",
      // folhas saindo do bowl
      "M60 100 C54 84 58 66 70 56 C76 70 72 88 60 100 Z",
      "M88 100 C86 80 94 62 108 54 C112 70 104 88 88 100 Z",
      "M120 100 C122 84 132 70 146 66 C146 82 136 94 120 100 Z",
      // tomate cereja
      "M142 88 C148 88 152 92 152 98 M46 90 C42 84 44 76 50 72",
    ],
  },
  // Cereais: espiga de trigo + grãos
  cereais: {
    viewBox: "0 0 200 200",
    strokeWidth: 2,
    paths: [
      "M100 22 L100 178",
      "M100 52 C88 48 80 38 80 26 C92 28 100 38 100 52 Z",
      "M100 52 C112 48 120 38 120 26 C108 28 100 38 100 52 Z",
      "M100 84 C88 80 80 70 80 58 C92 60 100 70 100 84 Z",
      "M100 84 C112 80 120 70 120 58 C108 60 100 70 100 84 Z",
      "M100 116 C88 112 80 102 80 90 C92 92 100 102 100 116 Z",
      "M100 116 C112 112 120 102 120 90 C108 92 100 102 100 116 Z",
      // grãos soltos na base
      "M62 150 C68 146 74 150 72 156 C70 162 62 162 60 156 C59 153 60 151 62 150 Z",
      "M136 152 C142 148 148 152 146 158 C144 164 136 164 134 158 C133 155 134 153 136 152 Z",
    ],
  },
  // Leguminosas: vagem + grãos de feijão/lentilha
  leguminosas: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M40 60 C70 40 130 40 162 66 C132 78 70 80 40 60 Z",
      "M64 60 C66 66 66 70 64 74 M96 62 C98 68 98 72 96 76 M128 62 C130 68 130 72 128 76",
      // grãos de feijão
      "M60 110 C74 104 88 110 88 122 C88 134 74 140 62 134 C52 129 50 116 60 110 Z",
      "M70 118 C72 122 70 126 66 128",
      "M116 122 C130 116 144 122 144 134 C144 146 130 152 118 146 C108 141 106 128 116 122 Z",
      "M126 130 C128 134 126 138 122 140",
      // lentilhas
      "M92 162 C98 162 102 165 102 168 C102 171 98 174 92 174 C86 174 82 171 82 168 C82 165 86 162 92 162 Z",
      "M120 164 C126 164 130 167 130 170 C130 173 126 176 120 176 C114 176 110 173 110 170 C110 167 114 164 120 164 Z",
    ],
  },
  // Peixe
  peixe: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M30 100 C52 70 90 56 122 66 C146 74 162 88 170 100 C162 112 146 126 122 134 C90 144 52 130 30 100 Z",
      "M170 100 L188 78 C182 92 182 108 188 122 L170 100 Z",
      "M52 92 C50 96 50 104 52 108",
      "M120 90 C124 90 126 92 126 96",
      // guelra e escamas sugeridas
      "M86 78 C96 88 96 112 86 122",
      "M108 74 C118 86 118 114 108 126",
    ],
  },
  // Ovo frito (gema)
  ovo: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M96 40 C130 34 160 56 164 88 C168 116 152 142 124 152 C96 162 62 154 46 130 C30 106 38 72 62 54 C72 46 84 42 96 40 Z",
      "M100 84 C114 84 126 94 126 108 C126 122 114 132 100 132 C86 132 74 122 74 108 C74 94 86 84 100 84 Z",
      "M92 98 C88 102 86 108 88 114",
    ],
  },
  // Xícara de café (grão + vapor curto)
  cafe: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M54 84 L146 84 C146 118 128 142 100 142 C72 142 54 118 54 84 Z",
      "M146 90 C162 90 168 100 162 110 C158 118 148 120 142 116",
      "M44 152 C64 160 136 160 156 152",
      // grão de café
      "M92 104 C98 98 108 98 112 104 C116 110 112 120 104 122 C96 124 88 118 88 112 C88 108 90 106 92 104 Z",
      "M94 106 C100 110 104 116 104 120",
      // vapor
      "M92 70 C89 62 95 58 92 50 M110 70 C107 62 113 58 110 50",
    ],
  },
  // Copo de suco com canudo e rodela
  suco: {
    viewBox: "0 0 200 200",
    strokeWidth: 2.2,
    paths: [
      "M66 60 L78 168 C78 172 82 176 86 176 L114 176 C118 176 122 172 122 168 L134 60",
      "M60 60 L140 60",
      "M72 96 L128 96",
      "M104 60 L128 24 M128 24 L138 28",
      // rodela de citrus na borda
      "M52 58 C52 46 60 36 72 34 L72 58 Z",
      "M58 54 C58 48 62 42 68 40",
      // bolhas
      "M92 124 C94 124 95 126 95 128 M108 138 C110 138 111 140 111 142",
    ],
  },
};

export const ILUSTRACOES_DISPONIVEIS: Array<{ id: IlustracaoId; nome: string }> = [
  { id: "mulher", nome: "Mulher (traço)" },
  { id: "folhas", nome: "Ramo de folhas" },
  { id: "ramo", nome: "Ramo fino" },
  { id: "laranja", nome: "Laranja" },
  { id: "cha", nome: "Xícara de chá" },
  { id: "cafe", nome: "Café" },
  { id: "suco", nome: "Suco" },
  { id: "coracao", nome: "Coração botânico" },
  { id: "intestino", nome: "Intestino" },
  { id: "dna", nome: "DNA / genética" },
  { id: "celulas", nome: "Células" },
  { id: "microbiota", nome: "Microbiota" },
  { id: "exame", nome: "Exames (tubo)" },
  { id: "estetoscopio", nome: "Estetoscópio" },
  { id: "lupa", nome: "Lupa" },
  { id: "balanca", nome: "Balança" },
  { id: "prato", nome: "Prato e talheres" },
  { id: "salada", nome: "Salada" },
  { id: "maca", nome: "Maçã" },
  { id: "abacate", nome: "Abacate" },
  { id: "uvas", nome: "Uvas" },
  { id: "morango", nome: "Morango" },
  { id: "cereais", nome: "Cereais" },
  { id: "leguminosas", nome: "Leguminosas" },
  { id: "peixe", nome: "Peixe" },
  { id: "ovo", nome: "Ovo" },
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
