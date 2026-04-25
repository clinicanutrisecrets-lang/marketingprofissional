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
