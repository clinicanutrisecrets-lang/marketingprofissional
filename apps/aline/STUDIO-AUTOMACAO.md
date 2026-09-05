# Studio Aline — automacao de posts (organico)

## O que esta sessao adicionou

- **Migration `006_publicacao_helpers.sql`** — RPCs `aline.get_perfil_publicacao` e `aline.set_perfil_instagram_credenciais` (encrypt/decrypt via pgsodium).
- **Helpers Graph API** em `lib/instagram/publish.ts` — criar container + publicar (imagem, carrossel, reels, stories).
- **Publisher** em `lib/instagram/publisher.ts` — pega post + midias e publica.
- **Gerador semanal** em `lib/posts/gerador-semanal.ts` — Claude gera N copies seguindo pilares ponderados, salva em `aline.posts` com `status='aguardando_aprovacao'` e `midia_pendente=true`.
- **Cron `/api/cron/publicar`** (a cada 15 min) — publica posts aprovados com data agendada vencida e midia pronta.
- **Cron `/api/cron/gerar-pack-semanal`** (quinta 9h-3 = 12h UTC) — gera pack de 5 posts pra cada perfil ativo.
- **Trigger manual `POST /api/posts/gerar-semana`** — pra disparar pack imediatamente sem esperar quinta.
- **Tela de aprovacao** em `/aprovacao` (lista) e `/aprovacao/[slug]/[semana]` (revisao + edicao + aprovar em bloco).
- **OAuth Instagram** em `/api/auth/instagram/connect` (inicia) e `/api/auth/instagram/callback` (recebe code, troca por long-lived, salva criptografado).

## Fluxo completo (depois do OAuth)

```
quinta 9h     ─► gerar-pack-semanal ─► 5 posts em aguardando_aprovacao (midia_pendente=true)
                                       │
Aline /aprovacao ─► edita textos ─► aprova em bloco ─► status=aprovado
                                       │
Aline sobe midias por post ─► midia_pendente=false
                                       │
a cada 15 min ─► cron/publicar ─► publica os que ja venceram E tem midia ─► status=postado
```

## ENV VARS necessarias (Vercel)

| Var                   | Onde pegar                                                    |
|-----------------------|---------------------------------------------------------------|
| `META_APP_ID`         | developers.facebook.com → seu app → Configuracoes → Basico     |
| `META_APP_SECRET`     | mesmo lugar                                                   |
| `META_REDIRECT_URI`   | `https://<dominio-do-studio>/api/auth/instagram/callback`      |
| `CRON_SECRET`         | gere `openssl rand -base64 32` — usar header `Bearer ...`     |
| `ANTHROPIC_API_KEY`   | console.anthropic.com (provavelmente ja existe)               |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (provavelmente ja existe)      |

Adicionar `META_REDIRECT_URI` na **OAuth Redirect URIs** do app Meta (Configuracoes → Login do Facebook → URIs de OAuth Validas).

## Permissoes Meta App (Login Review)

- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list`
- `pages_read_engagement`
- `business_management` (opcional, ajuda)

Pra produçao: Meta exige App Review pra `instagram_content_publish`. Em modo Dev, a Aline (usuario admin do app) ja consegue testar a publicaçao real.

## Pre-requisitos das contas Instagram

- Instagram **Business** ou **Creator** (nao Personal). Mudar em: app IG → Configuracoes → Conta → Mudar tipo de conta.
- Cada IG **vinculado a uma Pagina do Facebook** (mesmo que a Pagina tenha 0 seguidores). Sem isso, a Graph API nao retorna o `instagram_business_account.id`.

## Como conectar (passo a passo pra Aline)

1. Logar no Studio
2. Abrir perfil (ex: `/perfis/scannerdasaude`)
3. Clicar em **Conectar Instagram**
4. Login Meta → escolher a Pagina FB que controla aquela conta IG → autorizar
5. Volta pro Studio com `?ig_conectado=1`. Repete pra outra conta.

## Como gerar o primeiro pack manualmente (sem esperar quinta)

```bash
# Da maquina logada como super_admin no Studio:
curl -X POST https://<studio>/api/posts/gerar-semana \
  -H "Content-Type: application/json" \
  -b "<cookies da sessao>" \
  -d '{"slug":"scannerdasaude","qtd":5}'
```

Ou criar um botao no dashboard que chama esse endpoint.

## O que ainda nao esta automatizado

- **Geracao de imagem/criativo** (Bannerbear ou DALL-E). O `midia_pendente=true` indica que ainda precisa subir manualmente. Proxima iteracao: integrar `bannerbear_design_id` da `aline.perfis` pra criar criativo automaticamente quando o pack for gerado.
- **Coleta de metricas** (cron pra puxar insights pos-publicaçao).
- **Loop de aprendizado IA vs manual** (schema ja preve, falta UI).

## Aplicar migration no Supabase

```sql
-- Rodar no SQL Editor:
-- supabase/migrations/aline/006_publicacao_helpers.sql
```

---

# Robô do Instagram (o "ManyChat próprio") — 2026-09-05

Pedido da Aline: substituir o ManyChat pra `@nutri_secrets` (e depois
`@scannerdasaude`) por automação própria — comentários, stories e direct —
sem ela precisar colar texto e clicar botão em ferramenta de terceiro.
Um robô, N contas: cada linha de `aline.perfis` tem o seu app da Meta.

## Onde mora

| Peça | Arquivo |
|---|---|
| Login direto do Instagram (sem Página do Facebook) | `src/lib/instagram/oauth-instagram.ts`, `api/auth/instagram/connect` + `callback` |
| Token cifrado NO APP (AES-256-GCM, `ENCRYPTION_KEY`) | `src/lib/security/encrypt.ts`, `src/lib/instagram/credenciais.ts` |
| Cliente da API (DM, resposta privada, resposta pública, webhooks) | `src/lib/instagram/api.ts` |
| Webhook da Meta (GET verificação / POST eventos) | `api/webhooks/instagram` |
| Leitura do webhook + escolha da regra (PURO, testado) | `src/lib/automacao/regras.ts`, `tests/automacao-regras.test.ts` |
| Execução (regra → respostas, tags, sequência; chaves gerais) | `src/lib/automacao/processar.ts` |
| Agradecimento de comentário e resposta de DM geradas | `src/lib/automacao/ia.ts` |
| Conhecimento técnico (vem do SCANNER por API) | `src/lib/automacao/scanner-conhecimento.ts` → `scannerdasaude.com/api/integrations/marketing/conhecimento` |
| Fila (sequências, janela de 24h) + renovação de token | `src/lib/automacao/fila.ts`, cron `api/cron/instagram-fila` (5 em 5 min) |
| Tela | `/perfis/<slug>/automacoes` (chaves gerais, regras, sequências, contatos, últimas interações) |
| Banco | `supabase/migrations/aline/009_instagram_automacao.sql` (só schema `aline`, aditiva) |

## Env vars (Vercel do projeto `studio-aline`)

| Var | O que é |
|---|---|
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | **ID e chave do PRODUTO Instagram** dentro do app "Automacao NS" (tela "Configuração da API com login do Instagram"), não o id do app geral |
| `INSTAGRAM_REDIRECT_URI` | opcional; padrão `https://studio.scannerdasaude.com/api/auth/instagram/callback` |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | string qualquer; o MESMO valor vai no campo "Verificar token" do painel da Meta |
| `ENCRYPTION_KEY` | cifra o token no banco (`openssl rand -base64 32`). Sem ela o "Conectar" falha em voz alta |
| `STUDIO_CONHECIMENTO_SECRET` | bearer pra ler o conhecimento do Scanner; o MESMO valor vai na Vercel do `scanner-saude-b1jf`. Sem ele o direct responde sem a base do Scanner |
| `SCANNER_API_URL` | opcional; padrão `https://scannerdasaude.com` |
| `CRON_SECRET` | já existia; o cron novo usa o mesmo |
| `ANTHROPIC_API_KEY` | já existia; agradecimento usa Haiku 4.5, DM usa o `CLAUDE_MODEL` do Estúdio |

## Passos no painel da Meta (app "Automacao NS", BM da Nutri Secrets)

1. Caso de uso "Gerenciar mensagens e conteúdo no Instagram" (feito 05/09).
2. Permissões: `instagram_business_basic`, `instagram_business_content_publish`,
   `instagram_business_manage_comments`, `instagram_business_manage_messages`.
3. Funções → Testadores do Instagram → `nutri_secrets` → aceitar o convite no
   app do Instagram → "Gerar tokens de acesso → Adicionar conta".
4. Login comercial: URIs de redirecionamento = callback acima;
   desautorização = `/api/auth/instagram/desautorizar`;
   exclusão de dados = `/api/auth/instagram/excluir-dados`.
5. Webhooks: URL `https://studio.scannerdasaude.com/api/webhooks/instagram`,
   token = `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`, campos `comments` e `messages`.
   **A Meta só entrega webhook com o app PUBLICADO** (política de privacidade,
   ícone, categoria). Publicar ≠ revisão.
6. Revisão da Meta (Advanced Access) — necessária só pra falar com quem NÃO
   tem papel no app (as seguidoras). Publicar na própria conta e testar com
   contas testadoras funciona sem revisão.

## O que a tela faz

- **Chaves gerais**: agradecer todo comentário (texto gerado na voz do perfil;
  pergunta clínica em comentário recebe convite pro direct, nunca resposta
  clínica pública) e responder DM com a base do Scanner (caso individual,
  compra, reclamação ou "quero falar com alguém" → encaminha pra pessoa e
  marca o contato).
- **Regras** (têm prioridade sobre as chaves): gatilho (comentário / DM /
  resposta a story / menção em story) + palavras-chave (palavra inteira, sem
  acento) + post específico → resposta pública, resposta no direct
  (privada no comentário: 1 por comentário, até 7 dias), sequência, tags.
  `{primeiro_nome}`, `{nome}`, `{username}` no texto.
- **Sequências**: `minutos | texto` por linha. DM só sai na janela de 24h da
  Meta; fechou, o resto é cancelado sozinho (`ig_fila.erro = janela_24h`).
- **Contatos**: tags, "esperando uma pessoa", desligar o robô pra um contato.

## As orientações da dona (chaves gerais, 05/09 à tarde)

- **Quem o robô nunca responde** (`nao_responder_usernames`): família, equipe,
  amigas — vale pra comentário e direct, antes de qualquer regra.
- **Como eu falo** (`voz`): botão "Mapear minha voz" lê legendas + respostas
  que ELA deu em comentários (`mapear-voz.ts`) e escreve o retrato no campo;
  ela edita. DM antiga a Meta não entrega pela API.
- **Quando pedirem orientação/prescrição** (`instrucoes_etica`): texto dela
  por cima da trava do CFN que já está no prompt.
- **Direcionamentos de conversão** (`direcionamentos`): "quando X -> fazer Y",
  uma linha por caso; entra no prompt da DM pra conduzir a conversa.
Tudo vai pro system prompt via `blocoOrientacoesDaDona(config)`, nos DOIS
caminhos (comentário e DM) e no simulador. `tests/automacao-config.test.ts`.

## Botões e áudio (05/09, pra migrar o fluxo GLP1 do ManyChat)

- **Botões** (`ig_regras.opcoes`, migração aline/010, aplicada): até 3 por
  regra, rótulo ≤ 20 caracteres (limite da resposta rápida do Instagram),
  cada um com resposta própria, tags e sequência. Vão junto da resposta
  privada; se a Meta recusar os botões (ex.: em resposta privada de
  comentário), o robô manda a lista numerada e aceita "2" ou o rótulo
  digitado (`casarOpcao`, memória em `ig_contatos.ultimas_opcoes`). O toque
  chega como DM com `quick_reply.payload = opc:<regra>:<índice>`.
- **Follow-up em 23h** = sequência com `1380 | texto`: o toque no botão é
  mensagem da pessoa e abre a janela de 24h; quem só comentou e não tocou
  não recebe (a fila cancela sozinha, como a Meta exige).
- **Áudio no direct**: `transcrever-audio.ts` (AssemblyAI, `ASSEMBLYAI_API_KEY`
  na Vercel do studio-aline). Sem chave, o áudio fica registrado e não é
  respondido no automático.
- **Posts antigos**: o seletor de post da regra lista os 40 posts mais
  recentes direto do Instagram (`listarMidias`), com data e legenda — a
  regra prende ao ID, e o webhook avisa comentário em post de qualquer data.

## Raio-X do público (05/09, pedido da Aline)

`/perfis/<slug>/publico` → "Gerar raio-x agora" (`raio-x-publico.ts`): lê até
60 posts com curtidas/comentários e, com `instagram_business_manage_insights`
(precisa estar em Permissões e recursos + **Reconectar**), alcance,
salvamentos, compartilhamentos e visualizações por post; comentários dos 15
mais comentados classificados em temas; conversas recentes do direct (o que
`/me/conversations?platform=instagram` devolver — parcial). Relatório com
quem é o público, o que engaja por formato/tema, necessidades e 10 ideias de
posts, sempre citando só números lidos. Guarda em `aline.ig_analises`
(migração 012, aplicada).

## Travas que não devem cair

- Evento da PRÓPRIA conta (eco, comentário nosso) nunca dispara regra.
- Dedup por id da Meta (`ig_mensagens` unique) — a Meta reenvia webhook.
- Throttle de 20 s por contato entre saídas geradas.
- Só comentário de 1º nível recebe agradecimento (resposta de resposta não).
- Falha de envio não derruba o lote; volta 200 e fica no log.
- Erro de leitura na tela mostra "Erro ao carregar", não lista vazia.
