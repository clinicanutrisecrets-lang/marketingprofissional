# O robô do Instagram — janelas, escalonamento e voz

Decidido com a Aline em 06/09/2026. O código está em
`apps/aline/src/lib/automacao/`; este documento guarda as **decisões**, que o
código não explica.

---

## 1. As duas janelas da Meta — e o que elas impedem

São dois relógios diferentes, e confundi-los é o erro clássico.

**Relógio A — 7 dias.** Prazo para mandar a **primeira e única** resposta privada
àquele comentário. Comentário **não abre conversa**: dá o direito de falar uma vez.

**Relógio B — 24 horas.** Começa quando **ela** fala no direct, e **reinicia a cada
mensagem dela, sem limite de vezes.** Uma conversa viva pode durar meses.

Contam como mensagem dela (reiniciam as 24h): DM, **toque em botão de resposta
rápida**, resposta de story e menção em story. O código já trata os quatro
(`processar.ts`: `ehDm = ev.tipo !== "comentario"`).

🔴 **Não existe no Instagram o template do WhatsApp que reabre conversa fechada.**
A etiqueta de atendimento humano estende para 7 dias e serve para um humano
responder um caso — usar como régua automática de marketing é desvio de política.

### A consequência que muda o desenho

**A régua de nutrição não cabe dentro do direct.** No e-mail você manda no dia 1,
3, 7 e 30 porque quer. No direct você só fala se ela falou nas últimas 24h.

Então: **o direct é a porta, não o corredor.** A missão do primeiro contato é
entregar o material **e pegar o canal** (WhatsApp ou e-mail), onde a régua de
verdade roda. E dentro do Instagram quem nutre é o **conteúdo**: cada post novo
que ela comenta abre uma janela nova de 7 dias — é por isso que a série de posts
ligados e a etiqueta de série valem dinheiro.

**Toda mensagem do robô termina com algo para tocar.** Não é truque: o toque é o
que mantém a porta aberta.

---

## 2. Reativo sai na hora. Proativo espera o horário.

Se ela acabou de mandar mensagem, o robô responde — 3h da manhã inclusive.
Segurar resposta de quem está digitando é mais estranho que responder tarde.

| | Madrugada | Horário comercial |
|---|---|---|
| Material que ela pediu | sai | — |
| Resposta a mensagem dela | sai | — |
| Passo de sequência ("conseguiu ler?") | segura | sai |
| Retomada de conversa parada | segura | sai |

A entrega instantânea é honesta e deve ser dita: *"esse envio é automático, pra
você não ficar esperando"*. O que soa a robô às 3h é a parte **conversacional**.

⚠️ Se ela não responder nada de madrugada, o "passando aqui" das 9h **não pode
sair** — não há janela, e a resposta privada daquele comentário já foi usada. Por
isso a mensagem da madrugada leva botão.

---

## 3. O que vai para humano — e o que NÃO vai

🔴 **A regra não é lista de palavras.** *"Sou ansiosa e tenho intestino preso,
esse post serve pra mim?"* é a mensagem mais comum que existe, e escalar por
causa de "ansiedade" entregaria tudo na mesa dela.

O que separa é a **forma da mensagem**:

1. **Pergunta sobre conteúdo** — a condição é o contexto de uma pergunta.
   *"Estou grávida, posso comer isso?"* → **responde sempre.** Gestação e
   ansiedade viram restrição da resposta, não motivo de escalar.
2. **Evento agudo acontecendo agora** — *"estou com dor no peito"*, *"não estou
   conseguindo respirar"*, *"estou sangrando"* → redireciona.
3. **Sofrimento dirigido a si** — autolesão, ideação, padrão de restrição
   descrito em primeira pessoa → nenhuma orientação alimentar, acolhe e chama
   gente. **É o único caso que acorda a Aline de madrugada.**

**O teste, em uma frase:** *"eu tenho"* é condição (caso 1). *"estou com … agora"*
é evento (caso 2).

### O tom do caso 2 — sem Google

- **Nunca listar o que pode ser.** Zero hipótese, zero "pode ser grave".
- **Nunca "corre", "urgente", "agora mesmo".**
- **Uma frase do que fazer, e a porta aberta.**

> Dor no peito é coisa que precisa de olhar presencial, não de ajuste na
> alimentação — vale procurar um pronto atendimento ou o seu médico pra fazer a
> checagem que só lá dá pra fazer. Quando você tiver esse retorno, se quiser
> voltar aqui pra parte alimentar eu te ajudo com prazer 💛

### O que NÃO é encaminhamento

Pedido de conduta individual ("o que eu tomo?") tem **resposta pronta**, escrita
uma vez: *"isso eu não respondo por aqui, e o motivo é bom: […]. O caminho é
[…]"*. E **preço** também não escala (ver `JORNADA-CLIENTE.md`).

---

## 4. Alerta para a Aline

Hoje o robô marca `precisa_humano` e **nada avisa ninguém**. A decidir/construir:

- alerta por **WhatsApp pelo número da Fernanda** (único aprovado), com template
  utilitário da Meta — poucos centavos por alerta, e só dispara no `precisa_humano`;
  por **e-mail** enquanto o template não é aprovado;
- **ela não quer interface para responder** — responde pelo app do Instagram. O
  alerta precisa é do **contexto**, porque abrir marca como visto: quem é, o que
  comentou, em que post, o que o robô já mandou, o que ela respondeu e **quanto
  tempo falta da janela**;
- **PWA no iPhone** (o app não tem manifest nem service worker hoje). Notificação
  web no iOS só funciona depois de "Adicionar à Tela de Início".
- **Etiqueta de atendimento humano (7 dias)** não está sendo enviada
  (`instagram/api.ts` manda `{recipient, message}` sem `tag`). Ligar dá uma semana
  para a Helo responder, em vez de 24h.

---

## 5. Voz e escopo do conhecimento

- Fala **em primeira pessoa, como a Aline**. 🔴 **Não tem nome** — batizar cria um
  segundo personagem competindo com o dela.
- O conhecimento técnico vem do Scanner por API
  (`/api/integrations/marketing/conhecimento`, bearer `STUDIO_CONHECIMENTO_SECRET`).
  A base é escrita para nutricionista: **falta a camada para paciente.**
- Ele precisa saber **com quem está falando** (paciente ou profissional) — vem da
  triagem do comentário, e o mesmo fato tem duas profundidades.
- O **dicionário dela** (capacetinho, vassourinha, Fábrica, Detetive) precisa
  entrar na base, senão ele responde nutrição genérica.

### Treinar = escrever, não conversar

A correção vira texto em dois lugares: os **campos de voz, ética e direcionamentos
do perfil** (que entram em toda resposta) e a **base de conhecimento** (sem deploy).

**Primeiras semanas: revisão DEPOIS, não aprovação antes.** O robô responde na
hora, e uma vez por dia ela lê tudo que ele mandou em bloco. Aprovar antes mataria
a velocidade, que é o que ele tem de melhor. Depois de duas semanas sem correção
grave, a revisão vira semanal.

---

## 6. Custo real (medido em 06/09/2026)

O fluxo inteiro — regra, palavra-chave, botão, sequência, entrega — é
**determinístico: custo zero de modelo.** Só três pontos chamam Claude:

| O quê | Modelo | Custo aproximado |
|---|---|---|
| Agradecer comentário em público | Haiku | ~R$ 0,01 por comentário |
| Entender qual botão ela quis | Haiku | ~R$ 0,001 |
| Responder dúvida na DM com a base do Scanner | Sonnet | ~R$ 0,10 por resposta |

Mil comentários agradecidos ≈ R$ 10. Mil dúvidas respondidas ≈ R$ 100. Um
ManyChat cobra mensalidade fixa independente de uso.

---

## 7. Estado e bloqueios (06/09/2026)

- `@nutri_secrets` **conectada**, webhook assinado.
- As três regras (GLP1, SOMP, BEBÊ) existem e estão **`ativa=false`**.
- 🔴 **GLP1 e BEBÊ não têm o link do material** — o PDF mora no ManyChat. Cancelar
  hoje faz essas duas responderem sem entregar nada.
- 🔴 **O app não está publicado na Meta** — sem isso ela **não entrega webhook
  nenhum**, nem para a própria conta.
- **App Review** é necessário para interagir com quem não tem papel no app — ou
  seja, as seguidoras. Sem revisão, só contas testadoras.
  Sem a revisão **não há risco de bloqueio: simplesmente não funciona** (a API
  devolve erro). O risco de bloqueio real é comportamento de spam, e vale mesmo
  com a revisão aprovada — por isso **só recebe resposta privada quem pediu
  alguma coisa no comentário.**
- **Teste que resolve a dúvida em 10 minutos, sem custo:** publicar o app, pedir
  para alguém sem papel no app comentar a palavra, e ver se o robô responde.

**Ordem para cancelar o ManyChat:** publicar o app → colar os dois links → testar
com conta testadora → ativar as regras → **só então** cancelar. O histórico de
quem já passou pelos fluxos não migra.
