# O estilo Nutri Secrets, lido nas fotos de 12/09/2026

O que se repete nas 9 fotos e 4 vídeos que a Aline mandou do celular (pasta do
Drive de 12/09). É isso que o LoRA vai aprender e é este o vocabulário que
entra nas legendas e nos prompts da Fase 2. Fotos reais, sem tratamento:
a pedido dela, o objetivo é o modelo aprender **cor, luz e realismo**, não
copiar prato por prato. Ela quer o resultado "ainda melhor" que a referência.

## Luz
- **Luz natural de dia, quase sempre ao ar livre** (varanda, quintal, mesa de
  café). Difusa na maioria; em duas fotos é **sol direto lateral com sombra
  marcada** (croissant, morangos). Nunca flash, nunca luz de estúdio.
- Sombras suaves e curtas; brilho especular nas caldas e no glacê.

## Cor
- **Bege creme e terracota rosada** no fundo (parede com folhagem, mesa de
  madeira clara, tábua rosa).
- **Azul tiffany só em detalhe**: cabo de talher, borda de caneca, beirada de
  mesa. Nunca como cor dominante.
- **Vermelho de frutas vermelhas como ponto de cor** em quase toda foto: calda,
  compota, morango, framboesa. Amarelo de flor comestível e de gema como
  segundo acento.
- Saturação real, sem filtro. Verde vem das plantas ao fundo, desfocado.

## Louça e mesa
- **Cerâmica artesanal**: bowl cinza-esverdeado com borda crua, prato de pedra
  cinza texturizado, branco salpicado, cerâmica marrom escura, concha bege.
- **Toalha de crochê** (branca ou verde menta) como base recorrente.
- Talher dourado com cabo azul. Coador de cerâmica com caneca.

## Enquadramento e movimento (vídeos)
- **45 graus e vista de cima**, sempre em close. Foco raso, fundo desfocado.
- Câmera **quase parada**: leve aproximação, giro lento ao redor do bowl,
  recuo devagar revelando a mesa. Mão entra pra **partir e mostrar o miolo**.
- Um movimento só por clipe. É o que a Wan 2.2 reproduz bem em 5 s.

## O que ficou de FORA do dataset (e por quê)
- 2 fotos de **feira/mercado** e 1 de **cesta de morangos no campo**: cena de
  ambiente, não de prato. Ensinariam bancada de feira, não a mesa dela.
- 2 fotos de **legumes crus em cozinha de estúdio** (bancada inox, banner com
  texto): fundo e texto que o modelo tentaria copiar.
- Ficaram guardadas no Drive; se um dia houver um dataset "ingredientes",
  entram lá.

## O que falta pra chegar em 20 a 40 arquivos
Hoje são **16** (a fal recomenda ao menos 10; o briefing pede 20 a 40).
O que mais ajudaria, na mesma luz e louça:
- **vídeos curtos de textura**: vapor subindo, colher entrando no creme, fio
  de mel ou calda caindo, corte de bolo mostrando o miolo;
- pratos **salgados** de almoço/jantar (hoje é quase tudo café da manhã e doce);
- 3 ou 4 fotos **top-down puro** (a maioria é 45 graus);
- os **originais** em vez do WhatsApp (o WhatsApp reduz pra 960x1280 e
  480x848; pro treino em 480p serve, mas o original é sempre melhor).

## O lote de 13/09: 3 clipes de IA + os shorts do YouTube baixados por ela

Hoje o `receitas` tem **16** arquivos: os 13 do celular + **3 clipes gerados
por IA** (Higgsfield) que ela mandou como "pode ser assim também": lentilhas
na panela de ferro com vapor, limão espremido sobre a panela com sol de fim
de tarde, espinafre sobre legumes na frigideira. Marcados com `_origem` no
`curadoria.json`. Eles ensinam **vapor, brilho de suco e movimento de mão**,
que faltavam. O risco, dito em voz alta: são imagens de IA, e o modelo pode
aprender o "acabamento de IA" deles junto com a luz. Como são 3 em 16 e a
escala do LoRA na geração vai ficar baixa (0,6 a 0,8), o efeito é pequeno.
Se o primeiro treino sair com cara de render, o primeiro corte é tirar esses 3.

Os **shorts do YouTube** (6, de outros canais) ela baixou e subiu no Drive.
Foram olhados quadro a quadro. O que impede usar quase tudo:
- **Legenda queimada no vídeo** ("5 MORANGOS CONGELADOS", "FORNO 180°C") em
  boa parte dos quadros, e **marca d'água** (@ do canal) em todos os quadros
  do brownie. Texto no treino vira texto na geração.
- **360x640**, metade da resolução do treino (480x832). O preparo amplia, e o
  que o modelo aprende de "textura" nesse caso é textura macia de vídeo
  comprimido, o contrário do que ela quer.
- Rosto de pessoa (brownie) e um vídeo em paisagem (wrap de ovo, 16:9).

Sobraram **3 recortes sem texto**, só a parte do zoom na textura como ela
pediu: muffins de ovo na forma (5 s), fritata de brócolis com a mão
levantando a fatia (5 s) e a fatia de torta de massa folhada mostrando o
recheio (3,5 s). Estão em **`datasets/textura-youtube/`, separados de
propósito**: o LoRA v1 treina só com o `receitas`; se a textura do v1 ficar
aquém, treina-se um v2 com os dois e compara. Assim o material de baixa
resolução nunca entra calado no treino principal. Conteúdo de terceiros
segue sendo referência de olhar e de prompt; a licença é dela decidir.

O download do YouTube **está bloqueado a partir deste servidor** (barreira
anti-robô do YouTube, mesmo com o motor JS configurado). O caminho que
funcionou foi ela baixar e subir no Drive.
