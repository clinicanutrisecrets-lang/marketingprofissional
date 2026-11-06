# Novembro de 2026 — @nutri_secrets de ponta a ponta

> Pedido da Aline (06/11): social media e closer juntos no direct, stories que batem com o post,
> engajamento "responde aqui" no lugar da caixinha, e as ações do mês. Peças e estado:
> `EQUIPE-SOCIAL-MEDIA.md`; trilho de cada produto: `ESTRATEGIA-CONVERSAO.md`.

## A engrenagem de cada semana

```
post (palavra-chave) ──► comentário ──► direct do robô: material + 1 pergunta
     │                                         │
     └─ stories do dia (mesma arte, mesma cor) │
          ├─ "post novo, comenta PALAVRA"      ▼
          └─ "responde aqui: 1, 2 ou 3?" ──► closer no direct
                                               ├─ elogio: só agradece
                                               ├─ abertura: conversa, entende, indica 1 produto
                                               ├─ já é cliente (e-mail + nome): oferta certa
                                               └─ quer comprar: página/link; agenda: Helô
```

🔴 **Por que "responde aqui" e não caixinha:** a publicação de stories pela API da Meta não coloca
figurinha (caixinha de pergunta, enquete, link). O que funciona é texto pedindo resposta: cada resposta
de story abre conversa no direct (janela de 24 h) e, desde 06/11, cai na closer sabendo a que story ela
respondeu.

## As semanas

| Semana | Produto em foco | Post da semana (palavra-chave) | Stories "responde aqui" (paciente) |
|---|---|---|---|
| 09 a 15/11 | **Teste epigenético** (porta de entrada, R$ 960) | "O que a sua rotina está fazendo com os seus genes" → **CABELO** (5 fios em casa) | "Qual destes te acompanha mais: 1 cansaço, 2 inchaço, 3 sono ruim? Responde só o número" |
| 16 a 22/11 | **Consulta nutrigenética** | intestino-cérebro → **INTESTINO**; sono → **SONO** (guias no ar) | "Você acorda cansada mesmo dormindo 8 h? Responde SIM que eu te conto por quê" |
| 23 a 29/11 | **Black Friday** (se a página abrir) + **Lótus** | "Mapa genético: uma vez na vida" → **CANETA**/**DNA** | "Se você pudesse saber UMA coisa sobre o seu corpo, qual seria? Me responde aqui" |
| 30/11 | Lótus para quem já tem o teste | "Já fiz o teste, e agora?" → **LÓTUS** | "Já fez o seu teste genético? Responde JÁ ou AINDA NÃO" (a closer separa quem já é cliente) |

Ritmo: um carrossel com palavra-chave, uma receita e um vídeo por semana, mais **stories todo dia**:
- **dia do post:** chamada com a arte do post + "responde aqui";
- **dia seguinte:** bastidor da consulta ou explicação curta, sempre com uma pergunta;
- **dia de prova:** só depoimento real e aprovado (nunca inventado);
- **semana de venda:** oferta com o que inclui. Preço e condição só no direct, com a closer.

## O que já funciona (depois do merge dos PRs de 06/11)

- Closer do direct: catálogo da loja em tempo real, reconhece cliente, sabe quando só agradecer, responde
  story.
- Guias com botão que leva à Helô ou ao cadastro.
- Regras GLP1, BEBÊ, SOMP, CANETA, DESMAME, POST ANTIGO prontas para ligar.

## O que falta construir para fechar a ponta a ponta (próxima sessão)

1. **Botão "Stories do post"** no Estúdio: a partir de um post, desenha 3 stories 9:16 com a mesma arte
   (chamada com a palavra-chave; "responde aqui" com a pergunta do tema; bastidor). Já existe o formato
   9:16 no motor de arte e a publicação de stories na API; falta ligar ao post.
2. **Regras novas no robô**: CABELO, INTESTINO, SONO, DNA, LÓTUS (texto + página certa de cada uma).
3. **Guia-isca do epigenético** (a semana 1 hoje cai direto na página de venda).
4. **Plano do mês no Estúdio**: esta tabela vira o planejamento visível na grade, com stories na faixa
   própria, em vez de documento.

## Decisões da Aline

- Black Friday: a página da clínica abre quando? Sem ela, a semana 3 é nutrigenética normal.
- As palavras-chave e as perguntas dos stories acima: aprovar ou trocar.
