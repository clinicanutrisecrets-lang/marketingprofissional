# A equipe de social media do Estúdio — quem faz o quê (medido em 06/11/2026)

> O caminho de cada produto até a venda: `ESTRATEGIA-CONVERSAO.md`. O plano do mês: `PLANO-NOVEMBRO-2026.md`.

> **Sessão nova que vá mexer em post, arte, radar ou robô do Instagram: leia
> este arquivo primeiro.** Ele existe porque a Aline montou uma estratégia
> inteira e cada sessão sabia um pedaço: *"teve uma sessão que soube, outra não
> soube"*. Mudou o estado de um funcionário? Atualize a linha dele aqui.

Tudo mora no Estúdio (`apps/aline`, projeto Vercel `studio-aline`,
`studio.scannerdasaude.com`, banco `mfldshdxulqxskwcoxrl`, schema `aline`).
Perfis: `nutrisecrets` (paciente) e `scannerdasaude` (profissional).

## O quadro

| Função | Quem faz | Onde | Estado em 06/11 |
|---|---|---|---|
| **Notícias em alta** (famoso, série, viral) | Radar (`lib/em-alta/`) | cron 7h30 de Brasília; aparece em `/perfis/<slug>/feed` | ✅ roda todo dia (94 temas desde 15/10). ⚠️ **nenhum virou post**: ninguém olha |
| **Tendência DO Instagram** (áudio, formato, reel que bomba) | **ninguém** | — | ❌ não existe. A API da Meta não entrega tendência; só dá pra ler os posts da própria conta |
| **O que o público dela quer** | Raio-X do público (`raio-x-publico.ts`) | `/perfis/<slug>/publico` → "Gerar raio-x agora" | ✅ funciona, rodado 4 vezes, o último em 06/09 (velho) |
| **Gancho, viralidade, plano de tração** | Agente de tração (`lib/agentes/tracao.ts`) | `/api/agentes/tracao`, sob demanda | ✅ existe, ninguém chama |
| **Estratégia da semana** (jornada de 4 semanas, níveis de consciência) | **só no app das franqueadas** (`apps/franquias/src/lib/geracao/jornada.ts`) | — | ⚠️ **o Estúdio da Aline não usa.** É a causa do "uma sessão soube, outra não" |
| **Roteiro / legenda** | Gerador semanal (`lib/posts/gerador-semanal.ts`) | cron quinta 9h | ⛔ desligado desde 05/09 (`gerar_posts_semanal=false`) e escrito antes da estratégia nova |
| **Molde editorial** (os 7 passos, teste de fracasso, mini solução) | `lib/arte-post/molde.ts` | usado pelo "virar post" do radar | ✅ é o único lugar do Estúdio com a estratégia de `CALENDARIO-EDITORIAL.md` |
| **Arte** (carrossel editorial, foto inteira com véu) | `lib/arte-post/` | botão no post | ✅ funciona (93 mídias, a última em 14/10) |
| **Vídeo** | reel animado ("Desenhar vídeo"), HeyGen | botão no reel | ✅ existe |
| **Publicar** | cron a cada 15 min | `/api/cron/publicar` | ⛔ `publicar_posts=false`. **Nenhum post saiu pela API até hoje.** 18 posts da nutrisecrets parados desde 12/10 (14 esperando aprovação, 4 sem mídia) |
| **Atendimento** (comentário, direct, story) | Robô (`lib/automacao/`), decisões em `ROBO-INSTAGRAM.md` | `/perfis/<slug>/automacoes` | ⛔ recebe tudo (629 eventos em 30 dias) e **não responde nada desde 05/10**: 11 regras e todas as chaves desligadas. Quem responde é o ManyChat |
| **Relatório da manhã** (o que espera ela) | `/api/cron/relatorio-instagram` | cron 8h | ❌ **nunca foi enviado**: falta `RESEND_API_KEY` (e opcional `RELATORIO_INSTAGRAM_EMAIL`) na Vercel do `studio-aline`. O log diz "NÃO ENVIADO" todo dia |
| **Material da isca** (o que vai no direct) | páginas em `guias.scannerdasaude.com` (repo do Scanner, `public/guias/` + 1 linha no `middleware.ts`) | `MATERIAIS-E-LINKS.md` | ✅ página, não PDF. GLP-1, bebê, intestino e sono no ar |

## A vendedora do direct (06/11)

Pedido da Aline: *"como a minha Sofia, que entende dos meus produtos: preço, condições, bônus, link,
pra conversar, não só mandar o link"*. Quando a chave **"responder direct"** está ligada e nenhuma regra
casou, o robô conversa como consultora: descobre se é paciente ou profissional e o que ela quer, indica UM
produto, explica o que inclui, fala preço e condição quando perguntam e manda a página ou o link de
pagamento. Regras de conversa: `blocoVendedora` em `lib/automacao/ia.ts`.

- **Os fatos vêm do Scanner, nunca do Estúdio**: `scannerdasaude.com/api/integrations/marketing/catalogo`
  monta o catálogo da vitrine da loja da Clínica Nutri Secrets (`cursos.ofertas` + `cursos.combos`) na hora
  (cache de 10 min). Mudou preço na loja, o direct muda junto. Código: `lib/direct-catalogo.ts` (Scanner).
- Sem catálogo (rede, segredo): não fala preço nem link de compra, manda pra Helô.
- Desconto, Black Friday, cupom, agenda: sempre a Helô. Nunca inventa bônus, prazo nem escassez.
- **Testar antes de ligar**: tela de automações → simulador. Desde 06/11 ele simula a vendedora mesmo com a
  chave desligada e avisa se a resposta seria segurada pelo veto.
- Fora do direct até a Aline decidir: "Acompanhamento Individualizado por Mensagem" (é ela atendendo, e o
  direct diz que ela está de licença).

## Auditoria do atendimento (06/11, antes de desligar o ManyChat)

Consertado no PR de 06/11 (`tests/robo-seguranca.test.ts`, visto vermelho sem o conserto):

1. **Amiga de anos escrevendo pela 1ª vez depois do robô ligar** ficava sem trava (o eco só pega conversa
   nova). Agora o robô lê a conversa na API uma vez por contato (`historico_conferido_em`, migração
   aline/016, aplicada) e, se a Aline já escreveu ali, sai. Eco pra contato desconhecido cria o contato já
   travado.
2. **A fila mandava o "conseguiu ler?" por cima da Aline** e de madrugada. Agora cancela se ela entrou na
   conversa ou se a conversa espera uma pessoa, e passo de sequência só sai das 9h às 21h de Brasília.
3. **Botão antigo virava escolha pra sempre** ("paguei e não recebi" semanas depois recebia o link do
   GLP1). Agora a pergunta com botões vale 24 h; o toque no botão continua valendo.
4. **Crise e sintoma agudo não tinham tratamento.** Agora vencem tudo: nada em público, uma mensagem fixa
   no direct (CVV 188 / SAMU 192, sem hipótese) e a conversa vai pra fila dela.
5. **Texto gerado só era conferido pra travessão.** Agora não sai se falar em IA/robô, citar fornecedor,
   afirmar diagnóstico, trazer dose, prometer resultado ou vazar o JSON; vai pra fila dela.
6. **JSON quebrado do modelo ia cru pra pessoa.** Agora não sai.
7. Conversa já na fila dela não recebe coração nem resposta gerada. Fila reserva a linha (duas rodadas do
   cron não mandam duas vezes). Saída que não registra grita no log. Texto fixo também perde travessão.
   "ui que lindo" deixou de virar convite pro direct.

**Continua aberto (não consertado):**
- O **simulador** da tela não reproduz o caminho real (ignora botões, porta única, travas). Teste de verdade
  é com a conta de outra pessoa.
- `"formacao"` e `"acesso"` mandam pra fila dela ("quero saber da formação" não é respondido). É o lado
  seguro, mas é lead da Formação esperando.
- Durante a troca, o erro "já respondido" (o ManyChat respondeu antes) vira aviso falso de "não entregue".
- Corrida entre dois webhooks paralelos da mesma pessoa ainda pode aplicar a mesma regra duas vezes.

## Textos das regras que precisam da Aline antes de ligar

- ✅ 06/11: **"Estou de licença maternidade" continua valendo** (Aline).
- ✅ 06/11: **GLP1 → "Não, sou paciente"** agora manda o guia de paciente (`guias.scannerdasaude.com/glp1`)
  e chama pro teste nutrigenético com o time, pela Helô.
- ✅ 06/11: **POST ANTIGO** ganhou 3 botões (Sou nutri / Outra profissional / Cuido da minha saúde), cada
  um com os materiais certos; profissional recebe também o trial do software, paciente o teste pela Helô.
- **"Entender o pedido sem a palavra"** está desligada (era o defeito do ManyChat que motivou a troca).
- ✅ 06/11: BEBÊ trocada do PDF para `guias.scannerdasaude.com/bebe-pro`.

## Ordem pra ligar (substitui a da seção 7 do `ROBO-INSTAGRAM.md`)

1. Merge do PR de 06/11 e deploy READY (a migração aline/016 já está aplicada).
2. `RESEND_API_KEY` na Vercel do `studio-aline`, pra o relatório da manhã chegar.
3. A Aline decide os textos acima.
4. Teste com conta de outra pessoa (sem papel no app): comentar GLP1, BEBÊ e SOMP e ver o direct chegar.
5. No mesmo minuto: pausar as automações de comentário no ManyChat e ligar GLP1, BEBÊ, SOMP, CANETA,
   DESMAME e POST ANTIGO.
6. 48 h lendo "últimas interações" duas vezes por dia. Uma semana limpa: cancelar o ManyChat.
7. Só depois: directs e respostas de story (AGENDAR, QUADRO DE SAÚDE), e por último as chaves gerais.
