# Hand-off pra plataforma própria (checkout Asaas) — o que ela precisa fazer

Este documento é **o contrato de integração** entre a **plataforma própria** (LP de vendas +
checkout Asaas + IA do WhatsApp) e o **Marketing** (`app.scannerdasaude.com`, hub de conteúdo +
tráfego + tracking). Substitui a integração antiga com Kiwify.

> Encaminhe este arquivo pro time/IA que está desenvolvendo a plataforma. Tudo que está aqui é
> necessário pra atribuição de anúncio → venda funcionar e pro público frio da Meta otimizar.

---

## 🎯 Visão de 1 parágrafo

O anúncio leva o paciente pra **LP de vendas** (na plataforma). A LP carrega o **Pixel da Meta**,
captura os **parâmetros de rastreio** (`fbclid`, `franqueada_id`, `anuncio_id`) e os **propaga**
até o checkout Asaas. Quando a venda é **aprovada** (ou **estornada/chargeback**), a plataforma
**avisa o Marketing por um webhook assinado**, levando esses parâmetros de volta. O Marketing
então grava a conversão e dispara o evento pra Meta (CAPI). A **IA do WhatsApp** faz o meio do
funil e avisa o Marketing dos eventos de **Lead** e **agendamento**.

Sem propagar `fbclid`/`anuncio_id`/`franqueada_id` da LP até o webhook, **a atribuição quebra** e
o público frio fica cego. Esse é o ponto nº 1.

---

## 1) O que a LP de vendas precisa fazer (rastreio)

1. **Carregar o Meta Pixel** (ID compartilhado, fornecido pelo Marketing — `META_PIXEL_ID`).
   - Disparar `PageView` ao carregar.
   - Disparar `ViewContent` quando houver engajamento real (rolar / clicar no CTA).
2. **Capturar parâmetros da URL do anúncio** e guardar em cookie (90 dias):
   - `fbclid` → cookie `_fbclid`
   - `franqueada_id` (ou a ref `/nome-da-nutri` resolvida pra id) → cookie `_frq`
   - `anuncio_id` (quando vier na URL) → cookie `_anuncio`
   - `fbp` (cookie que o próprio Pixel cria) — preservar.
3. **Propagar esses 4 valores** por toda a jornada: LP → WhatsApp → checkout Asaas → webhook de
   venda. (Detalhe de como guardar no Asaas no item 3.)
4. **Gerar um `event_id` único por compra** e usar o **mesmo** valor no Pixel client-side
   (`Purchase`) e no webhook que manda pro Marketing. Isso permite a Meta **deduplicar**
   o evento de Pixel com o de CAPI (senão a venda conta 2x).

---

## 2) Webhook de venda → Marketing (o principal)

A plataforma é a **fonte da verdade do pagamento**. Sempre que o Asaas confirmar uma mudança de
estado relevante, a plataforma chama:

```
POST https://app.scannerdasaude.com/api/webhooks/venda
Content-Type: application/json
X-Plataforma-Signature: <hmac_sha256_hex(rawBody, PLATAFORMA_WEBHOOK_SECRET)>
```

**Corpo (JSON):**

```json
{
  "evento": "venda_aprovada",            // ou "venda_estornada" | "chargeback"
  "pedido_id": "ord_abc123",             // ID estável do pedido (idempotência)
  "event_id": "uuid-mesmo-do-pixel",     // mesmo usado no Pixel client-side (dedup Meta)
  "franqueada_id": "uuid-no-marketing",  // OBRIGATÓRIO — identifica a nutri
  "anuncio_id": "uuid|null",             // atribuição direta (se conhecida)
  "fbclid": "string|null",               // fallback de atribuição
  "fbp": "string|null",                  // melhora o match quality
  "valor": 1800,
  "currency": "BRL",
  "produto": "teste_genetico",           // "consulta" | "plano_anual" | ...
  "cliente": {
    "email": "paciente@email.com",
    "phone": "5541999999999",
    "nome": "Maria Silva"
  },
  "event_time": "2026-06-24T13:00:00Z"
}
```

**Regras de robustez (importante):**

- **Assinatura:** `X-Plataforma-Signature` = HMAC-SHA256 **hex** do **corpo cru exato** (mesma
  string de bytes enviada), com o segredo compartilhado `PLATAFORMA_WEBHOOK_SECRET`. O Marketing
  recalcula e compara; rejeita **401** se não bater.
- **Idempotência:** o Marketing deduplica por `event_id` (e por `pedido_id`). **Reenviar o mesmo
  pedido é seguro** — não conta a venda 2x. Use isso na sua política de retry.
- **Retry:** se o Marketing não responder **2xx**, **repita com backoff exponencial** (ex: 2s, 4s,
  8s, 16s, depois a cada 5min por até 24h). O Marketing responde `200 {"ok":true}` no sucesso.
- **Reembolso/chargeback:** mande `evento: "venda_estornada"` ou `"chargeback"` com o **mesmo
  `pedido_id`**. O Marketing registra a reversão (e ajusta contadores/ROAS). **Não** reutilize o
  `pedido_id` de uma venda diferente.
- **Ordem:** se um estorno chegar antes da aprovação (corrida), o Marketing trata pela ordem de
  `event_time` — então **sempre preencha `event_time` correto**.

---

## 3) Como guardar o rastreio dentro do Asaas

O Asaas precisa carregar os parâmetros até o momento da confirmação. Use **um** destes:

- **`externalReference`** do pagamento/cobrança Asaas: gravar um JSON curto ou uma chave que
  aponte pro registro interno com `{ franqueada_id, anuncio_id, fbclid, fbp, event_id }`.
- ou **campos customizados / metadata** da cobrança, se o plano Asaas permitir.

Fluxo recomendado:
1. Na LP/checkout, antes de criar a cobrança Asaas, persista um registro interno
   `pedido → { franqueada_id, anuncio_id, fbclid, fbp, event_id }`.
2. Crie a cobrança Asaas com `externalReference = pedido_id`.
3. No **webhook do Asaas pra você** (`PAYMENT_CONFIRMED` / `PAYMENT_REFUNDED` /
   `PAYMENT_CHARGEBACK`), recupere o registro pelo `externalReference` e **enriqueça** o payload
   que você manda pro Marketing com os parâmetros de rastreio.

> Resumo: **o Asaas avisa você; você (com o rastreio guardado) avisa o Marketing.** O Marketing
> nunca fala direto com o Asaas.

---

## 4) IA do WhatsApp (meio do funil)

A IA central (número único, ref `/nome-da-nutri`) deve avisar o Marketing nos momentos-chave.
Mesma família de endpoints de antes, só muda a autenticação:

```
POST https://app.scannerdasaude.com/api/conversions/lead
POST https://app.scannerdasaude.com/api/conversions/schedule
POST https://app.scannerdasaude.com/api/conversions/initiate-checkout
Header: x-ia-token: <WHATSAPP_IA_TOKEN>
```

**Corpo comum:**

```json
{
  "franqueadaId": "uuid-no-marketing",   // resolvido pela ref /nome-da-nutri
  "leadRef": "frq_<id>_ad_<anuncioId>",  // se conhecido
  "paciente": { "email": "...", "phone": "...", "nome": "..." },
  "fbclid": "...",                        // CARREGAR da LP/wa.me — crítico p/ atribuição
  "fbp": "...",
  "anuncioId": "uuid|null",
  "valor": 650,                           // schedule=650 / initiate-checkout=1800 (default)
  "clientIp": "...",
  "userAgent": "..."
}
```

**Pontos críticos:**
- A IA **precisa carregar o `fbclid`** que veio do anúncio (via texto pré-preenchido do `wa.me`
  ou via sessão). Sem isso, lead e agendamento não se conectam ao anúncio.
- **Disparar `Lead`** assim que o paciente se qualifica (deu email/telefone ou demonstrou
  intenção real) — esse é o sinal que a Meta usa pra otimizar público frio.
- **Disparar `Schedule`** quando a consulta é confirmada.
- **Disparar `initiate-checkout`** quando enviar o link do checkout Asaas.
- O link de checkout enviado pela IA deve **embutir** `franqueada_id`, `anuncio_id`, `fbclid` e o
  `event_id` (pra fechar o ciclo até o webhook de venda).

---

## 5) Config que o Marketing fornece pra plataforma

| Item | Pra quê |
|---|---|
| `PLATAFORMA_WEBHOOK_SECRET` | Assinar o webhook de venda (HMAC) — mesmo valor nos 2 lados |
| `WHATSAPP_IA_TOKEN` | Auth dos endpoints de conversão da IA |
| `META_PIXEL_ID` | Pixel client-side na LP de vendas |
| `MARKETING_APP_URL` | Base das chamadas (`https://app.scannerdasaude.com`) |

> Rotacionar os segredos a cada 90 dias, atualizando os dois lados no mesmo deploy.

---

## 6) Lista de mapeamento de franqueada

Pra plataforma saber qual `franqueada_id` usar, ela precisa do mapa **ref `/nome-da-nutri` →
`franqueada_id`** (uuid no Marketing). Duas opções:
- O Marketing expõe um endpoint de consulta `GET /api/franqueadas/por-ref?ref=ana-lima`
  (a implementar no nosso lado), **ou**
- A plataforma mantém o mapa sincronizado no cadastro da nutri.

Definir qual no kickoff da integração.

---

## ✅ Checklist pro time da plataforma

- [ ] LP de vendas carrega Meta Pixel + captura `fbclid`/`franqueada_id`/`anuncio_id`/`fbp`
- [ ] `event_id` único por compra, compartilhado entre Pixel e webhook
- [ ] Persistir `pedido → rastreio` antes de criar cobrança Asaas (`externalReference`)
- [ ] Webhook do Asaas (confirmado/estornado/chargeback) → enriquecer → `POST /api/webhooks/venda`
- [ ] Assinatura HMAC-SHA256 hex do corpo cru com `PLATAFORMA_WEBHOOK_SECRET`
- [ ] Idempotência por `pedido_id` + retry com backoff até 2xx
- [ ] IA WhatsApp dispara `Lead`/`Schedule`/`initiate-checkout` carregando `fbclid`
- [ ] Link de checkout embute `franqueada_id`/`anuncio_id`/`fbclid`/`event_id`
- [ ] Segredos configurados nos dois lados
