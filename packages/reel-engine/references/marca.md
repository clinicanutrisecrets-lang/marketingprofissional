# Marca visual

## Paleta semântica (oficial, extraída do logo Scanner da Saúde)

| Hex | Constante | Dimensão |
|-----|-----------|----------|
| `#7B3FA0` | `ROXO` | emocional / mental |
| `#E84545` | `CORAL` | bioquímica / sangue |
| `#F5894C` | `AMBER` | sintomas / intensidade |
| `#2DD4BF` | `TIFFANY` | microbiota / equilíbrio + marca-mãe |
| `#E8C547` | `MUSTARD` | genética / herdabilidade |
| `#0F1A1F` | `INK` | contraste / branding |
| `#F4EDE0` | `PAPER` | fundo neutro |
| `#B23A5F` | `ROSE` | acento editorial Nutri Secrets, CTA |

**Regra crítica, uma cor de acento por cena.** Fundo sempre PAPER ou INK, mais
UM acento semântico. Nunca todas as cores juntas: o "arco-íris" é o erro a evitar.

Atribuição por tipo de cena:

- `sintoma` → AMBER, ROXO ou CORAL conforme a dimensão do sintoma
- `gene` → MUSTARD sempre (genética), com cor secundária puxando para o sintoma
  que ele explica
- `marcadores` de sangue → CORAL
- `marcadores` de microbiota → TIFFANY
- `virada` → fundo INK + MUSTARD
- `cta` → ROSE

## Tipografia

- Títulos: **Fraunces Bold** (serifa com personalidade)
- Corpo, cards, chips: **Inter** (Regular / SemiBold / Bold)
- Ambas em `assets/fonts/`, carregadas por caminho relativo à skill

Tema no gancho: Fraunces Bold 148. Headlines de cena: 56,62. Título de card: 41.
Corpo de card: 30. Eyebrow: 23,24 caixa alta com letter-spacing.

## Layout 9:16, 1080×1920

Zona segura de conteúdo: **x 60,950, y 170,1590**. A UI do Reels cobre a faixa
inferior (legenda, perfil) e a coluna direita (curtir, comentar, compartilhar).

Composição padrão das cenas de sintoma e gene:

```
┌──────────────────────────────┐
│ EYEBROW ─────────────        │  y 170
│                              │
│  ┌────────────┐              │
│  │   card     │      figura  │  card à esquerda,
│  │   texto    │      ou      │  visual à direita
│  └──────┬─────┘      hélice  │
│         └──────►  ●          │  seta em L pela margem
│                              │
│  ┌──────────────┐            │
│  │  sinergia    │            │
│  └──────────────┘            │
│                              │
│              @nutri_secrets  │  y 1636
└──────────────────────────────┘
```

Cards ficam **sempre à esquerda**, o lado direito é onde os botões do Instagram
cobrem. Cards são opacos e desenhados por cima da figura, então sobreposição
parcial é aceitável; o que nunca pode é cobrir o rosto.

## Setas indicativas

Roteadas em **L pela margem esquerda**: sobem verticalmente na coluna livre a
partir do topo do card e entram na horizontal exatamente na altura do ponto
anatômico. Nunca cruzar o rosto na diagonal. Apontar sempre para o olho/lado
mais próximo do card.

Terminam em ponto cheio com halo. Espessura 5px em 1x.

## Personagem

Ilustração flat, não silhueta. Precisa ter pele, cabelo emoldurando o rosto com
franja lateral (nunca cobrindo a testa inteira), olhos com esclera e pupila,
sobrancelha, nariz sugerido, boca. Busto com blusa em teal, com **fade na base**
, sem isso vira um bloco chapado ocupando metade do frame e parece silhueta de
luto.

Estados: `flush` (rubor de fogacho), `eye` (`open`/`tired`/`closed`),
`undereye` (olheira), `brow_tilt` (sobrancelha preocupada).

## Renderização

Supersampling 2× em tudo que é nítido, downsample com `Image.reduce(2)`, é o
box filter exato para 2× e roda 3× mais rápido que LANCZOS. Glow e blur ficam em
1× por custo.
