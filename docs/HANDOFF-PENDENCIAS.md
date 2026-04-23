# Handoff & Pendências

Documento vivo de o que falta fazer, em qual ordem, quem faz, e o que está aguardando input.

Atualizado: sessão de integração cross-projeto (Scanner SaaS ↔ Marketing).

---

## 🏗️ Arquitetura: 2 projetos conversando

**Importante entender antes de qualquer coisa:**

| Projeto | Vercel | Supabase | Domínio | Repositório |
|---|---|---|---|---|
| **Scanner SaaS** (clínica/paciente) | `scanner-saude-b1jf` | `clinicanutrisecrets-scanner-da-saude` (us-west-2) | `scannerdasaude.com` | `clinicanutrisecrets-lang/scanner-saude` |
| **Marketing + Franquia** (onboarding, vendas, app) | `marketingprofissional` | `scanner-franquia-plataforma` (sa-east-1) | `app.scannerdasaude.com` | `clinicanutrisecrets-lang/marketingprofissional` |

**São 2 bancos Supabase separados.** Nunca fazer query cross-DB — toda troca é via webhooks assinados (HMAC SHA256).

---

## 🤖 Agentes de WhatsApp: Fernanda ≠ Sofia (NÃO CONFUNDIR)

Dois números, dois papéis, dois lados.

### 🎯 Fernanda (Scanner SaaS — lado do PO)

- **Número:** +55 41 9277-2344 (oficial WhatsApp Business Meta aprovado)
- **Onde mora:** Scanner SaaS (scannerdasaude.com)
- **Atende:** clientes diretos da marca Scanner — 2 modos:
  - **Lead novo** (número NÃO está em `nutricionistas.whatsapp`): modo sales → converte em franquia OU vende teste Kiwify direto
  - **Cliente assinante** (número está em `nutricionistas.whatsapp`): modo suporte → responde dúvida, abre ticket
- **Webhook:** `/api/webhooks/whatsapp` no Scanner SaaS
- **NÃO chama endpoints do Marketing.** Opera isolada no SaaS.

### 🎯 Sofia (Marketing/Franquias — lado da nutri franqueada)

- **Número:** outro, um por nutri (ou um central por enquanto, roteamento por `[ref:frq_X]`)
- **Onde mora:** conceitualmente no Marketing/Franquias
- **Atende:** pacientes das nutris franqueadas — qualifica, agenda, oferece teste via upsell
- **Endpoint que chama:** `POST /api/conversions/schedule` (no Marketing) quando confirma consulta → dispara CAPI `Schedule` R$650 pro Meta
- **Auth:** header `x-sofia-token` com `SOFIA_INTERNAL_TOKEN`

### Por que a distinção importa

- Fernanda roda no domínio `scannerdasaude.com`, Sofia no fluxo de ads do `app.scannerdasaude.com/nutri/[slug]`
- Fernanda dispara eventos no Scanner SaaS (CRM, franquia_pipeline); Sofia dispara CAPI Meta pelo Marketing
- Fernanda NUNCA confunde com Sofia mesmo se um lead conversar com as duas — são números diferentes e códigos diferentes

---

## 🔗 Pontos de integração cross-projeto (3 fluxos)

### 1. Upgrade → virar franqueada (SaaS → Marketing)

**Trigger:** nutri clica "Virar franqueada" em `scannerdasaude.com/nutri/perfil?tab=plano`.

**Fluxo:**
```
Scanner SaaS
  ├─ Atualiza nutricionistas.plano = 'franquia'
  ├─ Gera onboarding_token (UUID)
  └─ POST app.scannerdasaude.com/api/onboarding/iniciar  ✅ IMPLEMENTADO (Marketing lado)
       body: { scanner_user_id, onboarding_token, nome, email, whatsapp, plano_anterior }
       header: X-Scanner-Signature (HMAC)
```

**Marketing responde:**
- Grava em `franquia_onboardings` (tabela nova, migration 011)
- Retorna link `app.scannerdasaude.com/onboarding?token=X` pro SaaS enviar pra nutri
- **TODO:** página `/onboarding?token=X` validar token antes de liberar wizard
- **TODO:** email de boas-vindas via queue (hoje retorna link, SaaS que envia)

### 2. Kiwify produto → mapeamento nutri (SaaS → Marketing)

**Trigger:** Aline salva `kiwify_product_id` de uma nutri na tela `scannerdasaude.com/admin/exames-precisao`.

**Fluxo:**
```
Scanner SaaS
  └─ POST app.scannerdasaude.com/api/webhooks/scanner-saas/produto-kiwify-sync  ✅ IMPLEMENTADO
       body: { scanner_user_id, email, kiwify_product_id, exame_precisao_ativo }
       header: X-Scanner-Signature (HMAC)
```

**Marketing responde:**
- `UPDATE franqueadas SET kiwify_product_id = X WHERE email = Y`
- Se email não existe (nutri ainda não finalizou onboarding no Marketing): retorna 404 — SaaS reenvia quando ela finalizar

### 3. Venda Kiwify → SaaS (Marketing → SaaS)

**Trigger:** Kiwify aprovou compra do teste.

**Fluxo:**
```
Kiwify webhook
  → POST app.scannerdasaude.com/api/webhooks/kiwify  ✅ IMPLEMENTADO
       ├─ Valida HMAC Kiwify
       ├─ Resolve franqueada via kiwify_product_id local
       ├─ Grava em conversoes_registradas (tipo=Purchase)
       ├─ Dispara CAPI Meta (event Purchase R$1800)
       ├─ Incrementa contador no anuncio
       └─ POST scannerdasaude.com/api/webhooks/venda-externa  ✅ REPASSE IMPLEMENTADO
            body: { kiwify_product_id, kiwify_order_id, franqueada_id, anuncio_id,
                    valor, currency, customer_email, customer_name, customer_phone, fbclid }
            header: X-Marketing-Signature (HMAC SCANNER_WEBHOOK_SECRET)
```

**Scanner SaaS deve implementar** (outra sessão — lado dele):
- `POST /api/webhooks/venda-externa` que valida assinatura e grava em `vendas_externas` (DB SaaS)
- Atualizar `nutricionistas.total_pacientes_pagos`
- Espelhar no dashboard dela `/nutri/dashboard`

---

## 🔐 Env vars cross-projeto

Configurar em **ambos** Vercels com o mesmo valor (pra HMAC coincidir nos 2 lados):

**Vercel Marketing** (`marketingprofissional`):
- `SCANNER_SAAS_URL=https://scannerdasaude.com`
- `SCANNER_WEBHOOK_SECRET=<gerar random 64 chars>` ← compartilhado com SaaS
- `MARKETING_WEBHOOK_SECRET=<gerar random 64 chars>` ← compartilhado com SaaS (reservado futuro)

**Vercel Scanner SaaS** (`scanner-saude-b1jf`):
- `MARKETING_APP_URL=https://app.scannerdasaude.com`
- `SCANNER_WEBHOOK_SECRET=<mesmo valor>`
- `MARKETING_WEBHOOK_SECRET=<mesmo valor>`

**Rotacionar a cada 90 dias**, atualizando os 2 Vercels no mesmo deploy.

---

## 🔴 Bloqueadores antes de cada nutri ir ao ar

- [ ] **Compartilhar pixel Scanner com o ad account dela** (via Meta Business Settings)
- [ ] **Aline salvar `kiwify_product_id` da nutri na tela do Scanner SaaS** (`/admin/exames-precisao`) — sincroniza pro Marketing automaticamente via webhook
- [ ] **Conectar Instagram da nutri** via OAuth no onboarding
- [ ] **Subir foto profissional + logo** no onboarding
- [ ] **Configurar redirect do ad CTWA pro número da Sofia** com `[ref:frq_<id>]`

---

## 📚 Materiais didáticos a criar (Gamma)

1. **"Como conectar seu Instagram ao Scanner"**
2. **"Como compartilhar o Pixel Scanner com seu ad account"** — Business Settings com prints
3. **"Como configurar seu produto do teste nutrigenético no Kiwify"** — custom fields obrigatórios
4. **"Como criar seu primeiro anúncio no Scanner"** (quando UI existir)

---

## 🔌 Pendências de integração (médio prazo)

### Scanner SaaS (lado dele, outra sessão)
- [ ] `POST /api/webhooks/venda-externa` — recebe venda Kiwify do Marketing
- [ ] Admin `/admin/exames-precisao` disparar webhook `/produto-kiwify-sync` no Marketing quando Aline salva
- [ ] `POST /api/plano/upgrade-franquia` gerar token e chamar `/api/onboarding/iniciar` no Marketing
- [ ] `/api/webhooks/onboarding-concluido` receber quando Marketing confirma onboarding completo (fluxo de volta)
- [ ] Fernanda webhook continuar dual-mode (sales/suporte)

### Marketing (lado nosso)
- [ ] Página `/onboarding?token=X` validar token de `franquia_onboardings` antes de liberar wizard
- [ ] Email queue com delays (LP em 24h, posts em 48h)
- [ ] `finalizarOnboarding()` disparar `gerarPostsDaSemana()` em background imediatamente
- [ ] Callback pro SaaS quando onboarding concluído (`POST scannerdasaude.com/api/webhooks/onboarding-concluido`)

### UIs de ads faltando
- [ ] Tela "criar campanha" com 3 variações geradas pelo agente
- [ ] Botão grande vermelho "Pausar tudo" no dashboard nutri
- [ ] Dashboard métricas vivas por campanha (CPL, CTR, ROAS, vs benchmark)

### Skills 2/3/5 no Aline (baixa prioridade)
- [ ] Replicar Skills 2 (Mecanismo), 3 (Posicionamento), 5 (Funil) no app Aline

---

## 📦 Migrations aplicadas / futuras

### ✅ Aplicadas nesta sessão
- `franquias/006_diagnosticos_perfil.sql`
- `franquias/007_auditorias_conteudo.sql`
- `franquias/008_storytelling.sql`
- `franquias/009_planejamentos_estrategicos.sql`
- `franquias/010_anuncios_completo.sql`
- `franquias/011_integracao_scanner_saas.sql` ← NOVA (kiwify_product_id + franquia_onboardings)
- `aline/002_diagnosticos_depoimentos.sql`
- `aline/003_auditorias_conteudo.sql`
- `aline/004_storytellings_gerados.sql`

### 🟡 Aplicar quando preciso
- `franquias/012_meta_pixel_id_por_nutri.sql` — se alguma nutri grande quiser pixel próprio
- `aline/005_meta_pixel_id.sql` — ativar ads no Studio (pixels scanner + nutrisecrets)
- `aline/005_planejamentos_estrategicos.sql` — replicar Skills 2/3/5

---

## 🧹 Limpezas técnicas

- [ ] Aposentar Bannerbear após 1 semana validando AI-Image em produção
- [ ] Creatomate manter SÓ pra reels (vídeo). Estáticos/carrossel/stories todos na AI-Image.

---

## 📥 Inputs aguardando do PO

| Item | Quando | Como |
|---|---|---|
| **Pixel ID Scanner** (BM Scanner, guarda-chuva) | Quando criar no Events Manager | `NEXT_PUBLIC_META_PIXEL_ID` + `META_PIXEL_ID` no Vercel Marketing |
| **CAPI Access Token** do Pixel Scanner | Idem | `META_CAPI_ACCESS_TOKEN` no Vercel Marketing |
| **Pixel ID @scannerdasaude** (Studio) | Quando ativar ads no Studio | Salvo em `aline.perfis.meta_pixel_id` (pendente migration) |
| **Pixel ID @nutrisecrets** (Studio) | Idem | Idem |
| **Kiwify webhook secret** | Quando configurar webhook no Kiwify | `KIWIFY_WEBHOOK_SECRET` no Vercel Marketing |
| **SCANNER_WEBHOOK_SECRET** (cross-projeto) | Quando fizer handoff com sessão SaaS | Gerar 64 chars random, subir nos 2 Vercels |
| **MARKETING_WEBHOOK_SECRET** (cross-projeto) | Idem | Idem |
| **Pixel IDs pra tabela `aline.perfis.meta_pixel_id`** | Quando ativar ads Studio | Eu salvo via painel admin |

---

## ✅ Decisões já tomadas

- **Pixel Scanner como guarda-chuva** das franquias (centralizado) — nutri compartilha pixel via Business Settings
- **Kiwify produto por nutri** (não unificado) — Scanner SaaS é source of truth do `kiwify_product_id`, Marketing recebe via webhook
- **Studio Aline NÃO precisa de pixel agora** (pendência futura via `aline.perfis`)
- **Cores corretas**: `@scannerdasaude` multicolor (roxo default); `@nutrisecrets` verde tiffany `#0D9488` + magenta `#D946EF`
- **Modo B (Sharp overlay) default** pra AI-Image — zero risco de acento errado em PT-BR
- **2 agentes**: Orgânico (6 skills) + Ads (1 skill de copy, crons de otimização)
- **Fernanda (SaaS) ≠ Sofia (Marketing/nutri)** — dois números, dois papéis, dois lados
- **2 bancos Supabase separados** — nunca query cross-DB, só webhooks assinados
- **Número oficial da Fernanda aprovado pelo Meta** — pode usar WhatsApp Cloud API

---

## 🗂️ Arquitetura de referência (estado atual)

```
Scanner SaaS (scannerdasaude.com)
├── Clientes diretos + paciente + CRM interno
├── Fernanda WhatsApp (oficial Meta) — sales + suporte
├── Admin /admin/exames-precisao — Aline gerencia kiwify_product_id
├── Dispara webhooks pro Marketing:
│   ├── /api/onboarding/iniciar (upgrade nutri)
│   └── /api/webhooks/scanner-saas/produto-kiwify-sync (Kiwify mapping)
└── Recebe webhook do Marketing:
    └── /api/webhooks/venda-externa (Kiwify processada)

Marketing/Franquia (app.scannerdasaude.com)
├── LP /nutri/[slug] com Pixel Scanner (guarda-chuva)
├── Onboarding wizard
├── Agente Orgânico (6 skills) + Agente Ads
├── Webhook Kiwify (valida HMAC, CAPI Purchase, repassa pro SaaS)
├── /api/conversions/schedule (Sofia dispara Schedule R$650)
├── /api/ads/kill-switch (nutri/admin pausa tudo)
└── Crons: gerar-semanas, publicar, coletar-metricas-ads, verificar-budget-ads

Sofia (por nutri) — sistema separado
├── Número diferente da Fernanda
├── Atende pacientes da nutri (qualificação + upsell)
└── Chama /api/conversions/schedule no Marketing
```
