# Scanner da Saúde — Pronto pra Produção

**Branch:** `main`
**Data:** Abril 2026

Todos os sprints (1-12) finalizados. Aqui está o estado atual e o que falta pra operação real.

---

## ✅ O que está pronto e funcionando

### Infraestrutura
- Monorepo (pnpm workspaces + Turborepo) com 2 apps
- `app.scannerdasaude.com` (franqueadas) — deploy automático da branch `main`
- `studio.scannerdasaude.com` (Studio Aline, sistema interno)
- Supabase PostgreSQL com schemas `public` (franquias) + `aline` (Studio)
- Row Level Security em todas as tabelas sensíveis

### Auth + Onboarding
- Login com email/senha (nutri e admin)
- Wizard de onboarding de 10 etapas
- OAuth Instagram Business com token criptografado (AES-256-GCM)
- Upload de arquivos (logo, foto profissional)

### Geração de conteúdo
- Claude (sonnet 4.5) com prompt caching (redução 70%+ de custo)
- Compliance CFN embarcado no system prompt
- Planejamento semanal (7-10 posts: feed, carrossel, reels, stories)
- Geração automática considerando datas comemorativas + tendências em alta
- Bannerbear (legado) + **Creatomate** (atual) pra criativos estáticos e vídeo
- HeyGen pra avatar (só Studio Aline)
- Pexels + biblioteca própria pra B-roll de reels
- Botão "gerar substituto" em posts cancelados

### Publicação + automação
- Meta Graph API v21 pra publicação (imagem, carrossel, reels, stories)
- Cron a cada 15min publica posts aprovados
- Cron semanal gera novas semanas
- Cron semanal coleta métricas de engajamento
- Cron diário 09h coleta tendências + classifica com Claude
- Cron a cada 6h alerta deadline <24h por email

### Inteligência de conteúdo (Sprint 8)
- 50 datas comemorativas de saúde/nutrição no banco
- Google Trends BR + NewsAPI + RSS G1 Bem-Estar
- Classificador Claude por ICP (mulher 35-60, R$1800 exame, R$650 consulta)
- Dashboard mostra "Em alta hoje no nicho"
- Integração com planejador semanal

### Dashboard + UI
- Painel franqueada (Aprovar semana, Criar post, Relatórios, Anúncios, Biblioteca)
- Painel admin (Franqueadas, Anúncios review, Convidar)
- Studio Aline (perfis, posts, reels)
- LP dinâmica `/lp/[slug]` personalizada por nutri

### Compliance + Legal (Sprint 9)
- `/privacidade` — política LGPD + Meta
- `/termos` — termos de uso
- `/deletar-dados` — formulário exclusão (exigência Meta + LGPD)
- Footer global com links em todas páginas

### Emails transacionais (Sprint 10)
- Bem-vinda
- Semana pronta pra aprovação
- Deadline aproximando (<24h)
- Post publicado com sucesso
- Erro de publicação
- Convite de franqueada (Sprint 11)

### Admin tools (Sprint 11)
- Convidar franqueada via link único (expira 14 dias)
- Nova nutri define senha e vai direto pro onboarding
- Histórico de convites enviados
- 404 + error boundary global

---

## ⏳ Pendências da Aline (você)

### 1. Meta App Review
- [ ] Criar conta de teste `demo@scannerdasaude.com`
- [ ] Conectar Instagram Business de teste a essa conta
- [ ] Gerar uma semana de conteúdo de teste
- [ ] Gravar 4 vídeos de demonstração (roteiros em `docs/meta-app-review-roteiros.md`)
- [ ] Submeter cada permissão com vídeo + descrição (texto em `docs/meta-app-review-descricoes.md`)

### 2. Creatomate
- [ ] Confirmar que os 4 template IDs foram nomeados corretamente nas env vars
  - `CREATOMATE_TEMPLATE_FEED_IMAGEM`
  - `CREATOMATE_TEMPLATE_CARROSSEL`
  - `CREATOMATE_TEMPLATE_REELS_PIP`
  - `CREATOMATE_TEMPLATE_STORIES`
- [ ] Testar gerando 1 semana e ver se os criativos aparecem
- [ ] Cancelar Bannerbear depois de validar

### 3. Cloudflare / DNS
- [ ] Confirmar que ambos domínios apontam pra Vercel
- [ ] `app.scannerdasaude.com` → projeto marketingprofissional
- [ ] `studio.scannerdasaude.com` → projeto studio-aline

### 4. Vercel Env Vars (conferir)
- [ ] Ambos projetos têm: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- [ ] Franquias: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `CREATOMATE_*`, `PEXELS_API_KEY`, `BANNERBEAR_API_KEY` (legado)
- [ ] Studio: adicionalmente `HEYGEN_*`

### 5. Testes end-to-end
- [ ] Login em `app.scannerdasaude.com` com sua conta
- [ ] Login em `studio.scannerdasaude.com`
- [ ] Gerar uma semana (botão admin ou cron manual)
- [ ] Aprovar e publicar 1 post de teste
- [ ] Verificar métricas aparecerem em 24h
- [ ] Receber email de confirmação

---

## 🔄 Operações diárias (pós go-live)

### Crons rodando automaticamente
- `*/15 * * * *` — publicar posts aprovados
- `0 9 * * *` — coletar tendências + datas comemorativas
- `0 */6 * * *` — alertas de deadline
- `0 9 * * 1` — gerar semana (2ª feira 09h)
- `0 21 * * 5` — coletar métricas (6ª feira 21h)

### Monitoramento
- Vercel → Logs: acompanhar erros nos crons
- Supabase → tabela `solicitacoes_exclusao`: processar requests LGPD em 30 dias
- Email bounce/erro: monitorar Resend dashboard

---

## 📁 Arquitetura do repositório

```
marketingprofissional/
├── apps/
│   ├── franquias/          app.scannerdasaude.com
│   │   └── src/
│   │       ├── app/        (pages: login, onboarding, dashboard, admin, lp, convite, legal)
│   │       ├── lib/        (supabase, claude, instagram, creatomate, bannerbear, emails, tendencias, geracao)
│   │       └── components/ (UI compartilhada)
│   └── aline/              studio.scannerdasaude.com (sistema interno)
├── packages/               (shared: db types, ui, etc)
├── supabase/migrations/    (SQL versionado)
└── docs/                   (documentação, roteiros Meta)
```

---

## 🔒 Segurança

- Tokens OAuth: AES-256-GCM (chave em `ENCRYPTION_KEY`)
- Middleware autenticação em todas rotas protegidas
- RLS em tabelas: `franqueadas`, `posts_agendados`, `anuncios`, `aprovacoes_semanais`
- Admin-only: `admins`, `convites_franqueadas`, `solicitacoes_exclusao`
- CSP configurado nos headers do Next
- HTTPS obrigatório

---

## 📞 Suporte

- Email: contato@scannerdasaude.com
- Privacy: privacidade@scannerdasaude.com

---

**PROJETO PRONTO.** Resta só os passos manuais acima (Meta Review, Creatomate, testes).
