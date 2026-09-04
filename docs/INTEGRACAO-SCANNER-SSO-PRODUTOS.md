# Integração Scanner SaaS ↔ Marketing Profissional — SSO, pré-preenchimento e produtos

_Implementado em 2026-08-07. Complementa `docs/HANDOFF-SAAS.md` e o
`docs/SSO_MARKETING.md` do repo scanner-saude._

## O fluxo completo da nutri (Consultório de Precisão Avançado)

```
[Scanner SaaS — menu Crescimento Profissional → Marketing Profissional]
    │
    ├─ 1ª vez: "Ativar meu Marketing Profissional"
    │     POST scanner /api/nutri/marketing-profissional/ativar
    │       → POST cá /api/onboarding/iniciar (HMAC SCANNER_WEBHOOK_SECRET)
    │         body agora carrega `perfil` (vocabulário do Hub: nicho,
    │         cor_marca, bio_curta, instagram, publico_alvo…)
    │       → nutri abre /onboarding?token=…
    │         → src/lib/onboarding/prefill.ts traduz o perfil e PRÉ-PREENCHE
    │           a franqueada (só campos vazios — nunca sobrescreve)
    │
    └─ depois: "Já ativei — entrar"
          GET scanner /api/sso/marketing-token (JWT HS256, 5min)
            → GET cá /sso?token=…  ← NOVO (src/app/sso/route.ts)
              valida MARKETING_SSO_SECRET + iss/aud/exp
              acha franqueada por scanner_saas_user_id (fallback email)
              generateLink magiclink + verifyOtp → sessão → /dashboard
              sem franqueada → /onboarding?token (se pendente) ou volta pro
              Scanner com ?precisa_ativar=1
```

## Produtos do Scanner Tratamentos (posts de venda)

- Cache local: tabela **`produtos_scanner`** (migration
  `023_produtos_scanner_sso.sql`) — nome, tipo, descrição, preço,
  `checkout_url` REAL do tratamentos.scannerdasaude.com.
- Sync: `src/lib/produtos/sync.ts` chama
  `GET {SCANNER_SAAS_URL}/api/integrations/marketing/produtos?scanner_user_id=…`
  com `Authorization: Bearer {MARKETING_WEBHOOK_SECRET}`. O Hub resolve o
  vínculo com o Scanner Cursos e faz proxy — **nunca falamos direto com o
  Cursos**.
- Quando roda: botão "Atualizar produtos" em `/dashboard/posts-venda` e
  cron diário `/api/cron/sincronizar-produtos` (07:00 UTC).
- Uso: seção **Posts de venda** (`/dashboard/posts-venda`) gera post por
  produto (`gerarPostVenda` + `buildPromptPostVenda`); e TODA geração de
  copy (semanal, manual) recebe os produtos no system prompt
  (`blocoProdutos` em `src/lib/claude/prompts.ts`) — link/preço reais,
  proibido inventar.

## Envs novas (Vercel do marketingprofissional)

| Env | Valor |
|---|---|
| `MARKETING_SSO_SECRET` | mesmo valor do Vercel scanner-saude (gerar `openssl rand -hex 32`) |
| `MARKETING_WEBHOOK_SECRET` | mesmo valor do Vercel scanner-saude |
| `SCANNER_WEBHOOK_SECRET` | já existia (onboarding/callback) |
| `SCANNER_SAAS_URL` | já existia (`https://scannerdasaude.com`) |

## Ordem de deploy

1. Aplicar migration `023_produtos_scanner_sso.sql` no Supabase daqui.
2. Configurar as envs nos DOIS Vercels.
3. Deploy deste app (rota /sso + posts-venda).
4. Deploy do scanner-saude (menu + página + rotas de ativação/proxy).
Se 3/4 invertem, nada quebra: o menu do Scanner apontaria pra um /sso
inexistente (404) até o deploy daqui — por isso deployar cá primeiro.

## Biblioteca de posts liberada por produto (03/09/2026)

Pedido da Aline: *"pode add esses posts como sugestão para quem tem o
produto de Nutrigenética consulta ou DNA 360 no scanner tratamentos?"*

O cache `produtos_scanner` deixou de servir só aos posts de venda gerados:
agora ele decide **quem vê cada coleção da biblioteca de posts prontos**
(`/dashboard/biblioteca-posts` → menu "Posts prontos").

- `biblioteca_posts` ganhou (migração `025_biblioteca_posts_colecao.sql`):
  `imagem_url` (arte pronta servida de `apps/franquias/public/biblioteca/`),
  `formato` (`feed` | `story`), `colecao`, `requer_scanner_produto` (text[]
  de `scanner_produto_id`), `observacao` e `slug` (chave do seed).
  `canva_url` virou opcional — arte pronta não tem modelo no Canva.
- A 1ª coleção é **`nutrigenetica`**: 5 stories do teste genético, no seed
  `026_seed_posts_nutrigenetica_pos_deploy.sql`.
- Gate em `src/lib/biblioteca/gate.ts` (puro): a nutri vê a coleção se tiver
  `scanner_produto_id = 'teste_genetico'` ATIVO — é o que DNA 360 e Consulta
  Nutrigenética carregam. **`produtosQueVende()` descarta a "Experiência
  Clínica — Teste Nutrigenético"**: é a compra própria da nutri (produto da
  conta clinica-nutri-secrets, oculto da vitrine dela), chega com o mesmo
  `scanner_produto_id` e não é produto que ela revende.

🔴 **É gate de relevância, não de segurança.** A RLS de `biblioteca_posts`
libera leitura pra qualquer autenticada; quem filtra é a tela. Post de venda
de produto que a nutri não tem manda o seguidor dela pra um link que não
existe — o problema é esse, não sigilo.

🔴 **Gate tem que ter porta.** Quando existe coleção bloqueada, a tela diz o
que destrava (publicar o produto na Loja do Scanner Tratamentos + "Atualizar
produtos") e leva pro painel de lá — em vez de a nutri nunca saber que os
posts existem.

### Ordem de aplicação

1. Migração `025` (só colunas — inerte pro app que está no ar).
2. Deploy do app (tela nova + as 5 imagens em `public/`).
3. Migração `026` (o seed). **Antes do deploy ela faria os 5 posts
   aparecerem pra TODA franqueada** — o app velho não olha `colecao` nem
   `requer_scanner_produto` — e com o botão do Canva quebrado.
4. FAQ da Fernanda: `update base_conhecimento set status='aprovado' where
   fonte='posts-nutrigenetica-marketing-2026-09-03';` (seed no repo
   scanner-saude, `scripts/central-ajuda/`).
