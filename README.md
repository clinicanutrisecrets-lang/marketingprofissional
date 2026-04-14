# Marketing Profissional — Monorepo

Dois produtos, um repositório, lib compartilhada.

- **apps/franquias** — SaaS pago pra nutricionistas franqueadas (Scanner da Saúde)
- **apps/aline** — sistema interno da Aline (Studio Aline: @scannerdasaude + @nutrisecrets)

Dados isolados (schemas separados no mesmo projeto Supabase), código compartilhado via `packages/`.

## Stack

- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript + Tailwind
- **Monorepo**: pnpm workspaces + Turborepo
- **Banco**: Supabase (PostgreSQL + Storage + Auth + RLS + pgsodium pra tokens)
- **IA de conteúdo**: Anthropic Claude Sonnet 4.5 (prompt caching)
- **Criativos**: Bannerbear API
- **Vídeos (só apps/aline)**: HeyGen com avatar clonado
- **Emails**: Resend
- **Automação**: Vercel Cron + Supabase pg_cron (sem Make.com)
- **Deploy**: Vercel (2 projetos, 1 repo)
- **Redes**: Meta Graph API

## Estrutura

```
marketingprofissional/
├── apps/
│   ├── franquias/              # SaaS pago (marketingprofissional.vercel.app)
│   └── aline/                  # Sistema interno (studio-aline.vercel.app)
│
├── packages/
│   ├── db/                     # Tipos Supabase + clients (browser/server/admin)
│   ├── instagram/              # OAuth + postagem + insights (Graph API)
│   ├── claude/                 # Geração com prompt caching + compliance CFN
│   ├── bannerbear/             # Geração de criativos
│   ├── meta-ads/               # Anúncios (abstração "objetivo de negócio")
│   ├── heygen/                 # Reels com avatar (só apps/aline)
│   ├── benchmarks/             # Avaliação CPL/CAC vs mercado
│   └── ui/                     # Componentes compartilhados
│
└── supabase/migrations/
    ├── franquias/              # Schema público (franqueadas + posts + aprovações)
    ├── aline/                  # Schema aline (perfis + posts + anúncios)
    └── shared/                 # pgsodium (tokens) + benchmarks de mercado
```

## Rodar localmente

```bash
# 1. Instalar pnpm se não tiver
npm install -g pnpm

# 2. Instalar dependências (raiz cuida dos workspaces)
pnpm install

# 3. Copiar variáveis de ambiente
cp .env.example apps/franquias/.env.local
cp .env.example apps/aline/.env.local

# 4. Rodar só um dos apps
pnpm dev:franquias   # localhost:3000
pnpm dev:aline       # localhost:3001

# Ou rodar os dois em paralelo
pnpm dev
```

## Deploy na Vercel

Cada app é um projeto Vercel separado apontando pra subpasta:

| Projeto Vercel | Root Directory | Domínio |
|---|---|---|
| `marketingprofissional` | `apps/franquias` | marketingprofissional.vercel.app |
| `studio-aline` | `apps/aline` | studio-aline.vercel.app (privado) |

Env vars configuradas no painel de cada projeto.

## Arquitetura: por que não multi-tenant único

**Franquias** = produto pago (customers externos).
**Aline** = ferramenta interna (dono).

Misturar isso no mesmo schema significa que bugs da ferramenta interna podem afetar
clientes pagantes (e vice-versa). Solução: schemas isolados + libs compartilhadas.

Se amanhã as libs divergirem (raro), é trivial forkar um package.

## Decisões técnicas

- **Make.com CORTADO** → Vercel Cron + Supabase pg_cron (economiza R$60/mês, versionado no git)
- **Canva API CORTADO** → Bannerbear (economiza R$500+/mês)
- **WhatsApp Z-API CORTADO nas franquias** → email do Resend + sino in-app
- **Tokens criptografados** via pgsodium (não plaintext)
- **Carrossel** → tabela `post_midias` (1..N mídias por post)
- **Loop de aprendizado IA** → preserva `copy_legenda_ia_original` separada da versão final editada
- **Compliance CFN** → regra dura em TODO prompt de geração (`packages/claude`)
- **Benchmarks de mercado** → avaliação automática CPL/CAC por nicho/região

## Branches

- `main` — produção
- `claude/setup-vercel-deployment-zMLr6` — desenvolvimento atual
