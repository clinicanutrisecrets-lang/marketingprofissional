# O que o Estúdio precisa saber pra gerar no nosso jeito

Levantado em 13/09/2026, lendo o banco e o código do Studio Aline
(`apps/aline`, schema `aline`). Pergunta da Aline: *"qual a estrutura pra
treinar o Estúdio?"*

## São TRÊS treinos diferentes, e confundir sai caro

| | O que é | Onde vive | Custo | Muda sem deploy? |
|---|---|---|---|---|
| **1. Conhecimento** | voz, traço, personagens, regras | tabela no banco | zero | sim |
| **2. LoRA** | o modelo aprende o rosto dela e a luz dela | fal.ai, a partir de arquivos | US$ 8 por treino | não, é retreino |
| **3. Aprendizado por uso** | o que ela edita e o que performa | `aline.posts` | zero | sim, sozinho |

O 2 é o único que se chama "treino" de verdade. O 1 é o que mais muda o
resultado no dia a dia, e é texto numa tabela.

## 1. Conhecimento: o que falta preencher

### Voz (JÁ EXISTE, está vazio)
`aline.perfis` tem `tom`, `pilares` (jsonb com pesos), `instrucoes_ia`,
`regras_especiais`, `cor_primaria`. O perfil `nutrisecrets` está semeado com
os 5 pilares e o split 70/30 paciente/profissional. **`instrucoes_ia` está
vazio** e é ele que carrega o "Mapear minha voz" que ela deixou pendente em
05/09.

### Traço (NÃO EXISTE ainda)
Precisa de uma linha por estilo visual, com: nome, prompt base em inglês,
prompt negativo, paleta, proporção, modelo de imagem preferido.
Hoje o traço aprovado está em `ESTILO-ILUSTRACAO.md`, que é documento, não
dado. Vira tabela `aline.estilos_visuais`.

### Personagens (NÃO EXISTE ainda)
Uma linha por personagem, com imagem de referência no bucket:
- **pessoa**: a personagem fixa (cabelo cacheado escuro, blusa sálvia),
  com uma imagem por emoção (preguiça, feliz, irritada, focada, com dor);
- **órgãos**: intestino, fígado, cérebro, coração, tireoide, estômago, rins;
- **moléculas**: cortisol, magnésio, insulina, serotonina, ômega;
- **alimentos**: abacate, brócolis, castanha, ovo, peixe, chocolate amargo.
Vira `aline.personagens` (nome, tipo, descricao, imagem_url, emocao).
Sem isso, cada geração inventa o personagem de novo.

### Formatos de bloco (NÃO EXISTE ainda)
O reel é uma sequência de blocos, e cada bloco escolhe COMO é feito:
| formato | como gera | custo por bloco |
|---|---|---|
| `aquarela` | imagem no traço + animação i2v | ~US$ 0,52 |
| `lousa` | texto e rabiscos desenhados pelo Estúdio | zero |
| `pessoa` | LoRA de identidade, t2v | US$ 0,50 |
| `comida` | LoRA de estilo, t2v | US$ 0,50 |
| `meu_video` | biblioteca de vídeos dela | zero |
| `slide` | o slide de texto de hoje | zero |
Vira coluna `formato` no bloco + tabela de gabaritos de prompt por formato.

## 2. LoRA: o que já está estruturado
`packages/video-ai/datasets/<nome>/` com a mídia crua + `curadoria.json`
(legenda à mão por arquivo). Dois datasets:
- `receitas` (16 arquivos): estilo, a luz e a cor dela;
- `identidade` (a criar, 20 a 30 arquivos): o rosto e o corpo dela.
O resultado vai pra `aline.video_loras` (migração 013, ainda não aplicada) e
pra `loras.json`. O clipe gerado vai pra `aline.video_jobs`.

## 3. Aprendizado por uso: JÁ EXISTE e ninguém está usando
`aline.posts` guarda `copy_legenda_ia_original` ao lado da `copy_legenda`
final, mais `pilar`, `angulo`, `prompt_usado` e as métricas (alcance, salvos,
compartilhamentos, watch time). Ou seja: dá pra saber o que ela REESCREVEU e o
que PERFORMOU. Isso é a matéria-prima do "o Estúdio aprende com ela", e hoje
nada lê esses campos. Vale ligar depois que o volume existir.

## Ordem de construção
1. tabela de estilos + tabela de personagens (dado, sem custo);
2. formato por bloco, começando por `lousa` e `aquarela`;
3. rota de geração na fal (imagem, depois i2v);
4. treino dos dois LoRAs quando os datasets estiverem prontos;
5. o loop de aprendizado do item 3, quando houver post suficiente.
