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
