# Hand-off pro time do Scanner SaaS

Configurações e adaptações que o repo `clinicanutrisecrets-lang/scanner-saude` precisa implementar pra integração com o Marketing estar 100% funcional.

Complementar ao `HANDOFF-PENDENCIAS.md` (que é visão geral). Este doc é **o que a sessão do SaaS precisa fazer**.

---

## 🎯 Contexto rápido

- Dois projetos Vercel: `scanner-saude-b1jf` (SaaS, domínio `scannerdasaude.com`) e `marketingprofissional` (app.scannerdasaude.com)
- Dois bancos Supabase separados. Nunca query cross-DB — toda troca é via webhook assinado (HMAC SHA256).
- Secrets compartilhados: `SCANNER_WEBHOOK_SECRET` (pra webhook SaaS→Marketing), `MARKETING_WEBHOOK_SECRET` (pra webhook Marketing→SaaS), `SOFIA_INTERNAL_TOKEN` (pra Sofia chamar Marketing).

---

## ✅ O que o Marketing já tem pronto esperando SaaS consumir

### Endpoints que SaaS deve CHAMAR

| URL | Método | Auth | Quando chamar |
|---|---|---|---|
| `https://app.scannerdasaude.com/api/onboarding/iniciar` | POST | HMAC `x-scanner-signature` com `SCANNER_WEBHOOK_SECRET` | Quando nutri clica "Virar franqueada" no painel dela |
| `https://app.scannerdasaude.com/api/webhooks/scanner-saas/produto-kiwify-sync` | POST | Mesma HMAC | Quando Aline salva `kiwify_product_id` na tela `/admin/exames-precisao` |
| `https://app.scannerdasaude.com/api/conversions/lead` | POST | header `x-sofia-token` = `SOFIA_INTERNAL_TOKEN` | Sofia identifica lead qualificado |
| `https://app.scannerdasaude.com/api/conversions/initiate-checkout` | POST | Mesma Sofia token | Sofia envia link Kiwify do teste |
| `https://app.scannerdasaude.com/api/conversions/schedule` | POST | Mesma Sofia token | Sofia confirma agendamento de consulta |

### Payloads esperados

**`POST /api/onboarding/iniciar`** (SaaS → Marketing quando nutri vira franqueada):
```json
{
  "scanner_user_id": "uuid-da-nutri-no-saas",
  "onboarding_token": "uuid-gerado-pelo-saas",
  "nome": "Ana Lima",
  "email": "ana@nutri.com",
  "whatsapp": "5541999999999",
  "plano_anterior": "premium"
}
```
Header: `X-Scanner-Signature: <hmac_sha256(body, SCANNER_WEBHOOK_SECRET)>`

Retorna `{ ok: true, link_onboarding: "https://app.scannerdasaude.com/onboarding?token=..." }` — SaaS envia esse link pra nutri.

**`POST /api/webhooks/scanner-saas/produto-kiwify-sync`** (quando Aline salva kiwify_product_id):
```json
{
  "scanner_user_id": "uuid-da-nutri",
  "email": "ana@nutri.com",
  "kiwify_product_id": "4fb9dc10-3537-11f1-ac0f-db2...",
  "exame_precisao_ativo": true
}
```
Mesma HMAC. Retorna 404 se nutri ainda não finalizou onboarding no Marketing — reenvia quando ela finalizar.

**`POST /api/conversions/lead`** (Sofia identificou lead qualificado):
```json
{
  "franqueadaId": "uuid-no-marketing",
  "leadRef": "frq_X_ad_Y",
  "paciente": { "email": "...", "phone": "...", "nome": "..." },
  "fbclid": "cookie_fbclid",
  "fbp": "cookie_fbp",
  "anuncioId": "opcional",
  "clientIp": "...",
  "userAgent": "..."
}
```
Header: `x-sofia-token: $SOFIA_INTERNAL_TOKEN`. Retorna `{ ok: true, eventId, capi: true }`.

**`POST /api/conversions/initiate-checkout`** (Sofia enviou link Kiwify) — mesmo payload do `/lead` + `valor` opcional (default R$1.800).

**`POST /api/conversions/schedule`** (Sofia confirmou consulta) — mesmo payload + `valor` (default R$650) + `dataConsulta`.

---

## 🚨 Endpoints que SaaS deve IMPLEMENTAR (Marketing vai chamar)

### 1. `POST /api/webhooks/venda-externa`

**Quando é chamado:** sempre que Kiwify aprova compra e Marketing processa → repassa pro SaaS.

**Header recebido:** `X-Marketing-Signature: <hmac_sha256(body, SCANNER_WEBHOOK_SECRET)>`

**Payload recebido:**
```json
{
  "kiwify_product_id": "uuid-do-produto",
  "kiwify_order_id": "ord_...",
  "franqueada_id": "uuid-no-marketing",
  "anuncio_id": "opcional",
  "valor": 1800,
  "currency": "BRL",
  "customer_email": "...",
  "customer_name": "...",
  "customer_phone": "...",
  "fbclid": "...",
  "event_time": "ISO timestamp"
}
```

**SaaS deve:**
- Validar HMAC (rejeitar 401 se inválido)
- Grava em `vendas_externas` (tabela nova no DB SaaS)
- Atualizar `nutricionistas.total_pacientes_pagos += 1`
- Espelhar no dashboard `/nutri/dashboard` da nutri

### 2. `POST /api/webhooks/onboarding-concluido`

**Quando é chamado:** Marketing dispara depois que nutri finaliza o wizard do onboarding.

**Header recebido:** `X-Marketing-Signature: <hmac_sha256(body, SCANNER_WEBHOOK_SECRET)>`

**Payload recebido:**
```json
{
  "scanner_user_id": "uuid-da-nutri-no-saas",
  "franqueada_id": "uuid-no-marketing",
  "email": "...",
  "onboarding_concluido_em": "ISO timestamp"
}
```

**SaaS deve:**
- Validar HMAC
- Atualizar status da nutri no `franquia_pipeline` pra "ativa"
- Notificar Fernanda/time comercial (CRM interno) que conta tá pronta

### 3. Sofia — eventos client-side via Meta Pixel

Sofia agora é URL multi-tenant (`scannerdasaude.com/sofia/[sofia_slug]`). A página precisa:

- **Carregar Meta Pixel** no HTML (usar `META_PIXEL_ID` — mesmo valor do Marketing)
- Disparar `PageView` automático ao carregar
- Capturar `fbclid` da query string → salvar em cookie `_fbclid` (90 dias)
- Capturar UTM `utm_variant` se presente (vem do A/B test: `sofia_direto` ou `lp_bridge`) → cookie `_funil_variante`
- Disparar `ViewContent` quando usuário envia primeira mensagem (sinal de engajamento real)
- Chamar endpoints `/api/conversions/lead`, `/initiate-checkout`, `/schedule` conforme progresso da conversa (ver payloads acima)

---

## 🔐 Secrets a configurar no Vercel `scanner-saude-b1jf`

```bash
# URL do Marketing (pra SaaS chamar)
MARKETING_APP_URL=https://app.scannerdasaude.com

# Shared secret entre SaaS e Marketing (HMAC bidirecional)
SCANNER_WEBHOOK_SECRET=<mesmo valor do Marketing>
MARKETING_WEBHOOK_SECRET=<mesmo valor do Marketing>

# Sofia chama endpoints Marketing com este token
SOFIA_INTERNAL_TOKEN=<mesmo valor do Marketing>

# Meta Pixel (pro SaaS carregar na URL Sofia — mesmo ID do Marketing)
META_PIXEL_ID=<ID compartilhado>
# Nota: CAPI server-side é feito pelo Marketing. SaaS usa apenas client-side do pixel na URL Sofia.
```

---

## 🧩 Novas tabelas no DB do SaaS (sugeridas)

### `vendas_externas`
Espelha vendas Kiwify processadas pelo Marketing.

```sql
CREATE TABLE vendas_externas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutricionista_id UUID REFERENCES nutricionistas(id),
  kiwify_order_id TEXT UNIQUE NOT NULL,
  franqueada_id_marketing TEXT,  -- uuid no marketing, string pra nao criar FK cross-DB
  anuncio_id_marketing TEXT,
  valor DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  fbclid TEXT,
  event_time TIMESTAMPTZ,
  recebido_em TIMESTAMPTZ DEFAULT NOW()
);
```

### Adições em `nutricionistas`
```sql
ALTER TABLE nutricionistas
  ADD COLUMN IF NOT EXISTS total_pacientes_pagos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sofia_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS franqueada_id_marketing TEXT;
```

---

## 🎯 Sofia Premium — qualificação de lead pra ticket alto

ICP que a Sofia precisa saber atrair (mesmo de `agentes/_icp.ts` no Marketing — replicar a lógica no Sofia):

**ATRAI:**
- Mulher 35-52, classe A baixa / B alta
- Já fez 2-4 nutris antes, FRUSTRADA
- Lê Pollan, Lustig, Ferriss. Sabe o que é MTHFR, microbioma, hashimoto
- Decide por VALOR, não preço. Pesquisa antes
- Se organiza financeiramente pra investir em tratamento de R$ 4-5k

**AFASTA (desqualificar com elegância):**
- Riquíssima de status (quer "nutri famosa", problema de ego)
- "Quero emagrecer urgente" sem fundamento
- Pede só preço sem se apresentar
- Compara com "qual o preço da nutri X que cobra Y"
- Quer cardápio pronto / dieta pronta

### Roteiro de qualificação Sofia

**Mensagem 1 (de boas-vindas):**
> Oi! Sou a Sofia, assistente da Dra. [nome]. Antes de qualquer coisa, conta um pouco da sua história — o que te trouxe aqui? O que você já tentou antes de chegar até nós?

**Sinais verdes na resposta:**
- Menciona testes laboratoriais já feitos (ex: "fiz tireoide, vitamina D, ferritina")
- Cita autores/livros/podcasts da área
- Conta jornada: "fiz 3 nutris, nenhuma me deu o que eu precisava"
- Verbaliza "quero entender meu corpo" (não "quero emagrecer")
- Pergunta sobre método antes de preço

**Sinais vermelhos (desqualificar):**
- "Qual o valor da consulta?" (sem se apresentar)
- "Tô precisando emagrecer pro casamento dia X"
- "Vi sua nutri no Instagram, deve ser cara, né?"
- "Vocês fazem desconto?"

**Mensagem 2 (se sinal verde):**
> Que bom que você já fez essa caminhada. Fez muito sentido o que você contou. Pra te explicar como a Dra. [nome] trabalha, ela usa nutrigenética + investigação metabólica completa — não é cardápio padronizado. Tem 3 perguntas rápidas pra ver se faz sentido pra vocês: [pergunta 1, 2, 3 — todas qualificando profundidade]

**Mensagem 3 (apresentar oferta):**
> Pelo que você me contou, faz total sentido começar com [Diagnóstico Inicial R$ 1.500: consulta + teste nutrigenético | Plano Anual R$ 4.700: 4 consultas + teste + suporte]. Quer que eu te explique o que cada um inclui?

### Frase de "saída elegante" pra lead vermelho

Não queimar lead — só não avançar agora. Talvez ele volte depois mais maduro:

> Entendi! Olha, do jeito que a Dra. [nome] trabalha, normalmente quem mais se beneficia é quem já passou por outras nutris e tá buscando uma abordagem mais profunda — ela trabalha com investigação completa, então é um processo mais longo (e investimento mais significativo). Se você quiser conhecer melhor antes de decidir, te mando o Instagram dela @[handle] pra você acompanhar o trabalho. Quando fizer sentido pra você, é só voltar! ✨

(NÃO mandar preço pra esse lead. NÃO insistir. Sair com classe.)

### A/B test de pitch (variar via UTM `utm_pitch`)

| Pitch | Quando | Conversão esperada |
|---|---|---|
| `discovery` (default) | Maior parte do tráfego | Oferta R$ 1.500 (Diagnóstico Inicial) → upsell anual na consulta |
| `premium_direct` | Tráfego de público mais qualificado (lookalike de quem já comprou) | Oferta direta R$ 4.700 anual em 12x |

Sofia detecta `utm_pitch` no parâmetro de entrada e ajusta abertura.

---

## 🧠 Sofia: inteligência central + persona por URL

Sofia é 1 agente só, roteia por URL:
- `scannerdasaude.com/sofia/f0813032` → Sofia carrega persona da nutricionista com `sofia_slug = 'f0813032'`
- Persona inclui: nome da nutri, valor consulta, valor teste, tom, pilares, história — resolvidos via lookup na tabela `nutricionistas`
- Slug `sofia_slug` é gerado pelo SaaS (hash curto ou sequencial)

### Quando Aline cadastra uma nova nutri na franquia:
1. Gera `sofia_slug`
2. Sincroniza com Marketing via novo endpoint (sugestão: estender `/api/webhooks/scanner-saas/produto-kiwify-sync` pra incluir `sofia_slug` no payload)

### Fluxo de uma conversa completa na Sofia:
```
1. Lead clica no ad → abre scannerdasaude.com/sofia/f0813032?fbclid=XXX
2. Sofia carrega Meta Pixel → PageView
3. Lead envia primeira mensagem → ViewContent
4. Sofia faz 2-3 perguntas de qualificação
5. Se qualificado (deu email/phone ou pediu agenda):
   → POST /api/conversions/lead (Marketing)
6. Sofia oferece consulta e responde dúvidas
7. Se lead aceita agendar:
   → POST /api/conversions/schedule (Marketing) com valor=650
   → Redireciona pra sistema de agendamento (ou passa pra secretaria humana)
8. Na consulta, nutri oferece teste genético:
   → Se lead manifesta interesse, Sofia/secretária envia link Kiwify
   → POST /api/conversions/initiate-checkout (Marketing) com valor=1800
9. Kiwify processa compra → webhook pro Marketing → Marketing processa + repassa pro SaaS (/webhooks/venda-externa)
```

---

## 🧪 A/B test de funil

Estrutura pra testar qual funil converte melhor:

| Variante | URL destino | Custom parameter |
|---|---|---|
| A — Sofia direto | `scannerdasaude.com/sofia/[slug]?utm_variant=sofia_direto` | `funil_variante=sofia_direto` |
| B — LP bridge | `app.scannerdasaude.com/nutri/[slug]?utm_variant=lp_bridge` | `funil_variante=lp_bridge` |

Marketing já captura `utm_variant` → cookie `_funil_variante` → passa nos eventos CAPI. Sofia precisa fazer o mesmo (capturar utm_variant → cookie → incluir em `custom_data` de cada chamada de conversão).

---

## 🤖 Fernanda (lado SaaS — completamente isolada)

**NÃO CONFUNDIR com Sofia.** Fernanda é o WhatsApp Business oficial (+55 41 9277-2344) aprovado pela Meta. Opera dentro do SaaS apenas:

- Webhook `/api/webhooks/whatsapp` no SaaS
- Dual-mode: sales (lead novo) + suporte (cliente assinante)
- **Não chama endpoints do Marketing**
- Chaves do Meta Cloud API (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`) ficam **apenas no Vercel SaaS**

---

## 📋 Checklist de implementação (ordem sugerida)

1. [ ] Configurar env vars no Vercel SaaS (secrets compartilhados)
2. [ ] Implementar `POST /api/webhooks/venda-externa` (criar tabela `vendas_externas`)
3. [ ] Implementar `POST /api/webhooks/onboarding-concluido` (atualizar pipeline)
4. [ ] Sincronizar tela `/admin/exames-precisao` — quando Aline salva, dispara POST pro Marketing `/webhooks/scanner-saas/produto-kiwify-sync`
5. [ ] Implementar `POST /api/plano/upgrade-franquia` — gera onboarding_token + chama Marketing `/api/onboarding/iniciar`
6. [ ] Sofia URL: carregar Meta Pixel + capturar fbclid + disparar eventos via chamadas ao Marketing
7. [ ] Adicionar campo `sofia_slug` em `nutricionistas` + sincronizar com Marketing
8. [ ] A/B test: Sofia captura `utm_variant` e passa nos eventos
9. [ ] Testar com uma nutri de teste end-to-end:
   - Upgrade → Marketing recebe
   - Onboarding completo → SaaS recebe callback
   - Aline salva kiwify_product_id → Marketing recebe
   - Ad direto pra Sofia → pixel dispara → eventos vão pra Marketing → CAPI Meta
   - Sofia agenda consulta → CAPI Schedule
   - Venda Kiwify → Marketing webhook → SaaS recebe venda-externa

---

## ⚠️ Pontos de atenção

- **Rotate secrets a cada 90 dias** (SCANNER_WEBHOOK_SECRET + MARKETING_WEBHOOK_SECRET + SOFIA_INTERNAL_TOKEN). Atualizar nos dois Vercels ao mesmo tempo.
- **Nunca faça query cross-DB.** Se precisar de dado do outro lado, exponha via endpoint + webhook.
- **Dedup de eventos:** todos os `event_id` são únicos — se CAPI recebeu mesmo `event_id` via pixel client + CAPI server, Meta deduplica automaticamente.
- **Sofia não deve disparar CAPI diretamente.** Sempre via Marketing (single tracking hub, audit único em `conversoes_registradas`).

---

_Doc gerado pela sessão Marketing. Atualizar conforme a integração avança._
