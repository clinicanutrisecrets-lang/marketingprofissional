# Formato "Dr. Axe": b-roll com duas frases e o conteúdo na legenda

Registrado em 13/09/2026 a pedido da Aline, olhando os posts do @drjoshaxe.
É o formato de melhor relação esforço/alcance que ela mapeou até agora, e o
Estúdio já tem tudo que ele precisa.

## O que é

Vídeo curto e comum: a pessoa andando, cozinhando, na piscina com a filha, no
consultório. **Sem voz.** Só música. Por cima, **duas frases em sequência**, e o
conteúdo de verdade vai na legenda.

Nos exemplos medidos: 359, 176 e 170 comentários por post.

## As seis regras do formato

1. **Não tem voz.** Só trilha. Isso muda tudo na produção: não precisa de
   roteiro falado, não precisa de lip sync, não precisa de estúdio. Ela pode
   estar falando no vídeo, e o áudio simplesmente não entra.

2. **Duas frases, nessa ordem.** A primeira abre curiosidade e **nomeia o alvo**
   ("pacientes com tal sintoma", "quem tenta engravidar", "quem toma remédio de
   tireoide"). A segunda entrega a virada ou o benefício.

3. **A segunda frase entra depois**, não junto. No exemplo da comida, o bloco
   "P.S." aparece abaixo do primeiro, mais tarde no vídeo.

4. **O benefício vem pelo negativo.** "Não coma isso se você não quer dormir
   melhor, ter menos dor nas juntas e digerir melhor." Lista de benefício direto
   lê como propaganda; virada do avesso lê como segredo.

5. **Texto centralizado na vertical**, serifado, branco com contorno fino.
   Sem tarja. Três a quatro linhas por bloco, no máximo.

6. **A legenda carrega o conteúdo**, e o CTA é "comenta tal palavra". O resto
   vai por direct. É isso que produz o número de comentários.

## Por que serve pra Aline agora

O acervo dela já cobre: chá (4 versões de roupa), cozinha, yoga, academia,
jornada, pôr do sol, e o monitor de tela branca. Nenhum desses tem fala. São
exatamente os clipes que hoje só servem de corte para outro vídeo, e neste
formato eles viram o post inteiro.

🔴 **O que muda no nosso pipeline:** aqui não entra maquiagem, nem recorte, nem
troca de cenário. Entra b-roll + duas frases + trilha. É o render mais barato de
todos e o único que não depende de ela gravar falando.

## O que ainda não existe

O Estúdio não tem o gerador desse formato. O que já existe e serve de base é a
legendagem do motor do anúncio (texto grande com contorno, sem tarja, em
`packages/video-filtro`). Falta o encadeamento das duas frases no tempo e a
escolha da trilha.

⚠️ Sobre a trilha: no Instagram a música vem do catálogo do próprio app quando o
post sobe pelo aplicativo. Publicando pela API, a faixa precisa estar no
arquivo, e aí ela tem que ser livre de direitos. É uma decisão a tomar antes de
automatizar este formato.
