# Instagram que vende — o caminho de cada produto (06/11/2026)

> Pedido da Aline (06/11): *"uma infraestrutura de social media perfeita, focando em conversão dos
> produtos que eu tenho hoje: teste nutrigenético, epigenético com o time, a venda do Lótus, e levar os
> profissionais para o software."* Quem faz cada peça: `EQUIPE-SOCIAL-MEDIA.md`. Preços conferidos no
> banco do Scanner (`cursos.ofertas`) em 06/11; mudou preço, mude aqui.

## O princípio: todo post tem um trilho até o caixa

Cinco trechos, e o post só está pronto quando os cinco existem:

```
post (palavra-chave) → direct do robô → página do material → botão → quem fecha
```

O que vazava em 06/11: o direct estava desligado (ManyChat), e **o botão dos guias apontava para "#"**
(a leitora chegava ao fim do guia, tocava em "Fazer o teste nutrigenético" e nada acontecia). Os dois
foram consertados em 06/11 (PRs do Estúdio e do Scanner); falta só pôr no ar.

## Os trilhos

### @nutri_secrets — paciente

| Produto | Preço | Isca (página) | Palavra-chave | Quem fecha |
|---|---|---|---|---|
| **Teste epigenético** (5 fios de cabelo, consulta online) | R$ 960 (10x R$ 96) | ❌ falta guia | sugerida: **CABELO** | Helô (WhatsApp) ou LP `tratamentos.scannerdasaude.com/clinica-nutri-secrets/epigenetico` |
| **Consulta nutrigenética** (carro-chefe) | R$ 3.500 (10x R$ 350) | ✅ `/glp1`, `/intestino`, `/sono` | CANETA ✅, sugeridas **INTESTINO**, **SONO** | Helô |
| **Lótus** (curso + epigenético) | combo R$ 2.497; avulso R$ 1.800 | aulas gratuitas do Lótus em `/aulas` | sugerida: **LÓTUS** | página `scannerdasaude.com/lotus` |

A escada: o **epigenético é a porta de entrada** (o mais barato, coleta em casa), a **consulta
nutrigenética é o carro-chefe**, e o **Lótus** é para quem quer fazer sozinha com método. Post de paciente
nunca termina em "procure um profissional": termina no que é da consulta (`CALENDARIO-EDITORIAL.md`).

### Profissional — também pelo @nutri_secrets (decisão da Aline, 06/11)

> Todo material de profissional sai pelo @nutri_secrets e **todo CTA leva ao Scanner da Saúde** (teste
> grátis ou login). O @scannerdasaude fica de lado por enquanto.

| Produto | Preço | Isca | Palavra-chave | Quem fecha |
|---|---|---|---|---|
| **Software** (trial de 14 dias de VIP, sem cartão) | Essencial R$ 97 / Premium R$ 197 / VIP R$ 297 | ✅ `glp1.`, `somp.`, `/intestino-pro`, `/sono-pro`, `/bebe-pro` | GLP1, SOMP, BEBÊ ✅ | cadastro + Fernanda |
| **Consultório de Precisão Avançado** | R$ 2.000 de entrada + R$ 597/mês | aula `epigenetica-lendo-o-laudo` | — | Fer (`/agendar/comercial`) |
| **Epigenético para profissional** (kits) | 1 kit R$ 750; 10 kits R$ 6.500 | ❌ sem página pública | — | laboratório |

Ordem de `JORNADA-CLIENTE.md`: material técnico → Formação → Avançado. O trial é para quem já atende
paciente. **Nunca oferecer o Básico** (descontinuado em 05/11).

O @scannerdasaude não está conectado ao robô, e por decisão de 06/11 não precisa estar agora.

## Medição: o que dá pra saber hoje e o que falta

| Trecho | Medido? |
|---|---|
| comentário com palavra-chave | ✅ `aline.ig_mensagens` |
| direct entregue | ✅ (com o robô ligado) |
| abriu a página | ❌ falta link rastreado (`/r/<slug>`), planejado desde 05/09 |
| tocou no botão do guia | ❌ |
| chegou na Helô | ⚠️ a mensagem do WhatsApp já vem escrita com o nome do guia ("Li o guia do sono…"): a Helô consegue anotar a origem |
| comprou | ✅ no Scanner (`cursos`), mas sem ligação com o Instagram |

## O que falta, por ordem

**Esta semana (só pôr no ar):**
1. Merge dos dois PRs de 06/11 (robô do Estúdio; botões dos guias no Scanner).
2. `RESEND_API_KEY` na Vercel do `studio-aline` (relatório da manhã).
3. Troca do ManyChat (ordem em `EQUIPE-SOCIAL-MEDIA.md`).
4. Combinar com a Helô: a mensagem que chega diz de qual guia veio; anotar a origem de cada venda.

**Próximas duas semanas (conversão):**
5. Regras novas no robô: CABELO (epigenético), INTESTINO, SONO, LÓTUS, cada uma com post fixado.
6. Guia-isca do **epigenético** para paciente (o produto de entrada não tem isca).
7. Botões dos guias de profissional que ainda não levam ao software (`/sono-pro`, `/bebe-pro`).
8. Link rastreado (`/r/<slug>`) nos directs: saber quem abriu e mandar o lembrete só a quem não abriu.
9. A estratégia da semana (jornada de 4 semanas) trazida do app das franqueadas para o Estúdio.

**Depois:**
10. Conectar o @scannerdasaude ao robô.
11. Tendência do Instagram: rotina semanal de 15 minutos (o time salva 5 reels em alta do nicho numa
    lista do Estúdio) — a API da Meta não entrega tendência, então isso é gente, não código.
12. Painel do funil: comentário → direct → página → WhatsApp → venda, por post.

## Pontos para a Aline decidir

- **Black Friday da clínica**: a página `/lp/black-friday-precisao.html` está em prévia, com a compra
  desligada. Abre quando? (O calendário de posts de profissionais já mira 27/11.)
- **Lótus**: nenhum agente responde sobre o Lótus (decisão de 01/10). Com o post e a palavra-chave
  ligados, a dúvida vai cair no direct: a Helô atende? E a página mostra "10x de R$ 276", que não fecha
  com R$ 2.497 em 10x (conferir antes de anunciar).
- **Preço no direct**: hoje o robô não fala preço (o CTA nomeia o que a pessoa recebe). Manter?
