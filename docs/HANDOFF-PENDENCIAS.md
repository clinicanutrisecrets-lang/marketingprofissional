# Handoff & Pendências

Documento vivo de o que falta fazer, em qual ordem, quem faz, e o que está aguardando input.

Atualizado: encerramento da sessão de build dos agentes (orgânico + ads).

---

## 🔴 Bloqueadores antes de cada nutri ir ao ar

Itens que precisam ser feitos **uma vez por nutri** quando ela for ativada:

- [ ] **Compartilhar pixel Scanner com o ad account dela** (`business.facebook.com → Business Settings → Pixels → Add Assets → Ad Accounts`). Sem isso, ads dela rodam mas Meta não otimiza pelos eventos da LP.
- [ ] **Cadastrar `kiwify_product_id` da nutri no banco** (campo a adicionar — ver bloco "Migrations futuras" abaixo). Precisa ter o produto criado no Kiwify dela primeiro.
- [ ] **Conectar Instagram da nutri** via OAuth no onboarding (fluxo já existe em `packages/instagram`).
- [ ] **Subir foto profissional + logo** no onboarding (campos `arquivos_franqueada`, tipos `foto_profissional` e `logo_principal`).
- [ ] **Configurar redirect do ad CTWA pro número da Sofia** com parâmetro `[ref:frq_<franqueadaId>]` no link wa.me.
- [ ] **Inscrever ad account dela no webhook Kiwify** (1 secret só, mas conferir que produto da nutri tem webhook ativo).

---

## 📚 Materiais didáticos a criar (Gamma)

Por ordem de prioridade — entrega à nutri no momento do onboarding:

1. **"Como conectar seu Instagram ao Scanner"** — primeiro toque da nutri no sistema. OAuth + autorização Meta + verificação de conta business.
2. **"Como compartilhar o Pixel Scanner com seu ad account"** — passo a passo com prints do Meta Business Settings. Foco: pra ela rodar ads otimizados sem ter que entender CAPI.
3. **"Como configurar seu produto do teste nutrigenético no Kiwify"** — checklist (preço R$ 1.800, vídeo de boas-vindas personalizado, custom fields obrigatórios pro tracking funcionar: `franqueada_id`, `fbclid`, `anuncio_id`).
4. **"Como criar seu primeiro anúncio no Scanner"** — só fazer depois que UI de ads no painel da nutri estiver pronta (ver bloco "UIs faltando").

---

## 🔌 Pendências de integração (médio prazo)

### Sofia (WhatsApp IA)
- [ ] **Stack da Sofia** — confirmar provider (Cloud API / Z-API / Evolution / Twilio)
- [ ] Endpoint `/api/conversions/schedule` no app franquias está pronto esperando ela chamar com header `x-sofia-token`
- [ ] Sofia precisa: ler `ctwa_clid` da primeira mensagem, parsear `[ref:frq_X]` do texto, ativar persona da nutri correta, disparar `Schedule` quando confirma agendamento
- [ ] Quando Sofia tiver código, conectar via webhook pra cada conversa qualificada

### CRM Fernanda (sessão separada)
- [ ] Notificação automática "nutri X finalizou onboarding" → integração com CRM interno da Fernanda
- [ ] Hook de extensão preparado em `apps/franquias/src/lib/onboarding/actions.ts:73` — só falta plugar URL/payload

### Email queue + delays (princípio "parecer trabalho humano")
- [ ] Tabela `email_queue` com `enviar_em timestamp`
- [ ] Cron `processar-email-queue` a cada 30min
- [ ] Email "sua LP está no ar" → delay aleatório 18-24h após `finalizarOnboarding()`
- [ ] Email "primeira semana pronta pra aprovar" → delay aleatório 30-46h
- [ ] `finalizarOnboarding()` dispara `gerarPostsDaSemana()` em background imediatamente (não espera cron de segunda)

### Anúncios — UIs faltando
- [ ] **Tela "criar campanha"** com 3 variações geradas pelo agente (já temos endpoint `/api/agentes/ads/gerar-copy`, falta só UI)
- [ ] **Botão grande vermelho "Pausar tudo"** no dashboard da nutri (endpoint `/api/ads/kill-switch` pronto)
- [ ] **Dashboard de métricas vivas por campanha** (CPL, CTR, ROAS, vs benchmark) — dados já chegam via cron `coletar-metricas-ads`

### Skills 2/3/5 no Aline
- [ ] Replicar Skills 2 (Mecanismo), 3 (Posicionamento), 5 (Funil) no app Aline. Hoje só estão no app Franquias.
- [ ] Migration `aline.planejamentos_estrategicos` + lib + endpoint + UI por perfil.

---

## 📦 Migrations futuras (a fazer quando aparecer demanda)

- [ ] `011_kiwify_product_id.sql` em franquias: `ALTER TABLE franqueadas ADD COLUMN kiwify_product_id TEXT UNIQUE;` — mapear produto Kiwify de cada nutri pra resolver no webhook
- [ ] `012_meta_pixel_id.sql` em franquias: `ALTER TABLE franqueadas ADD COLUMN meta_pixel_id TEXT;` — pra quando uma nutri quiser pixel próprio (em vez do guarda-chuva Scanner)
- [ ] `005_meta_pixel_id.sql` em aline: `ALTER TABLE aline.perfis ADD COLUMN meta_pixel_id TEXT;` — pixels próprios dos perfis @scannerdasaude e @nutrisecrets quando ativar ads pessoais
- [ ] `005_planejamentos_estrategicos.sql` em aline: replicar Skills 2/3/5

---

## 🧹 Limpezas técnicas (após validação em produção)

- [ ] **Aposentar Bannerbear** após 1 semana validando AI-Image em produção:
  - Remover `packages/bannerbear/`
  - Remover `apps/franquias/src/lib/bannerbear/`
  - Remover env vars `BANNERBEAR_*` em todos `.env.example` e Vercels
  - Remover fallback Bannerbear em `apps/franquias/src/lib/geracao/semanal.ts`
  - Cancelar plano Bannerbear ($49/mês economizados)
- [ ] **Reorganizar Creatomate** — manter SÓ pra reels (vídeo). Estáticos/carrossel/stories devem ir todos pra AI-Image.

---

## 📥 Inputs aguardando do PO

Coisas que dependem de decisão/dado teu pra liberar trabalho:

| Item | Quando | Como |
|---|---|---|
| **Pixel ID Scanner da Saúde** (BM Scanner) | Quando você criar/pegar no Events Manager | Sobe na Vercel Marketing como `NEXT_PUBLIC_META_PIXEL_ID` + `META_PIXEL_ID` (mesmo valor) |
| **CAPI Access Token** do Pixel Scanner | Idem | Sobe como `META_CAPI_ACCESS_TOKEN` no Vercel Marketing |
| **Pixel ID @scannerdasaude** (Studio, BM Scanner) | Quando ativar ads no Studio | Eu salvo em `aline.perfis.meta_pixel_id` pelo painel — não precisa env var |
| **Pixel ID @nutrisecrets** (Studio, BM Nutri Secrets) | Quando ativar ads no Studio | Idem |
| **Stack Sofia** (provider WhatsApp) | Quando começar integração | Provider + URL base + token |
| **Kiwify webhook secret** | Quando configurar webhook no Kiwify | Sobe como `KIWIFY_WEBHOOK_SECRET` no Vercel Marketing |
| **Kiwify product_id** de cada nutri | Quando primeira nutri tiver produto criado | Eu salvo em `franqueadas.kiwify_product_id` (após migration 011) |

---

## ✅ Decisões já tomadas nesta sessão

- **Pixel Scanner como guarda-chuva** das franquias (centralizado), nutri compartilha pixel via Business Settings ao invés de criar próprio. Permite lookalike global de "leads de nutricionista" como ativo de longo prazo da marca-mãe.
- **Kiwify produto por nutri** (não unificado). Cada nutri tem produto próprio com vídeo de boas-vindas dela. Sistema resolve via `kiwify_product_id` no webhook.
- **Studio Aline NÃO precisa de pixel agora** (não tem LP nem ads). Pixels dos perfis @scannerdasaude e @nutrisecrets são pendência futura via tabela `aline.perfis`.
- **Cores corretas dos perfis Aline:** `@scannerdasaude` paleta multicolor (cores do S da logo) com roxo `#8B5CF6` default; `@nutrisecrets` verde tiffany `#0D9488` + magenta `#D946EF` contrastante.
- **Modo B (Sharp overlay) é default** pra geração de imagem — IA gera só visual, Sharp insere texto pixel-perfect. Zero risco de acento errado em PT-BR.
- **2 agentes** (Orgânico + Ads), sem dividir mais.

---

## 🗂️ Arquitetura de referência (estado atual)

```
Marketing/Franquias (Vercel "marketing")
├── Pixel: 1 da marca Scanner (guarda-chuva)
├── Webhook Kiwify: 1 endpoint, secret único
├── CAPI: dispara Schedule (Sofia) e Purchase (Kiwify)
├── LP: /nutri/[slug] com Pixel + WhatsApp tracking
├── Agentes: Orgânico (6 skills) + Ads
└── Crons: gerar-semanas, publicar, coletar-metricas-ads, verificar-budget-ads

Studio Aline (Vercel "studio")
├── Sem pixel (ainda)
├── Sem webhook (ainda)
├── 2 perfis fixos: @scannerdasaude + @nutrisecrets
├── Agentes: Orgânico (Skills 1, 4, 6 — falta 2, 3, 5)
└── AI-Image: GPT-Image-1 (qualidade premium, baixo volume)

Sofia (sistema separado — projeto próprio do PO)
└── Chama /api/conversions/schedule no Marketing quando marca consulta
```
