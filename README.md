# Scanner da Saúde — Plataforma Franquia Digital

SaaS de marketing automatizado para nutricionistas franqueadas. Sistema que gerencia centralmente a criação de conteúdo (LP, posts Instagram, criativos, anúncios Meta Ads) para múltiplas nutris.

## Stack

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript + Tailwind
- **Banco**: Supabase (PostgreSQL + Storage + Auth + RLS)
- **IA de conteúdo**: Anthropic Claude (Sonnet 4.5 com prompt caching)
- **Criativos**: Bannerbear API (templates com autofill)
- **Emails**: Resend
- **Automação**: Make.com (scenarios agendados)
- **Deploy**: Vercel
- **Redes sociais**: Meta Graph API (Instagram + Facebook + Ads)

## Rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Copiar variáveis de ambiente
cp .env.example .env.local
# preencher os valores

# 3. Rodar em dev
npm run dev
```

Acesse http://localhost:3000

## Estrutura de pastas

```
src/
├── app/
│   ├── page.tsx                 # Landing
│   ├── login/                   # Login franqueada
│   ├── dashboard/               # Painel franqueada
│   ├── onboarding/              # Wizard 10 etapas
│   ├── admin/                   # Painel admin (Aline + equipe)
│   ├── aprovar/[token]/         # Aprovação semanal pública (sem login)
│   └── api/                     # Rotas API + webhooks
├── lib/
│   ├── supabase/                # Clients Supabase (browser, server, middleware)
│   ├── types/database.ts        # Tipos gerados do schema
│   └── utils.ts                 # Helpers (formatação, cn, etc)
├── components/                  # Componentes compartilhados
└── middleware.ts                # Auth + route guards

supabase/migrations/             # SQL de referência (já aplicado via MCP)
```

## Documentação relacionada

- Guia da nutri (Gamma) — enviar antes do onboarding
- Manual de operação do time — passo a passo da reunião
- Roteiro Meta App Review — scripts dos vídeos demonstrativos

## Branch de desenvolvimento

- `main` — produção (Vercel faz deploy automático)
- Features desenvolvidas em branches separadas com PR
