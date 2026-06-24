# Decisões de Arquitetura — Junho 2026 (pivôs ativos)

> **Este documento tem precedência** sobre `HANDOFF-PENDENCIAS.md`, `HANDOFF-SAAS.md` e
> `PRONTO-PRA-PRODUCAO.md` onde houver conflito. Aqueles docs descrevem o estado anterior
> (Kiwify + Sofia URL-chat) e devem ser lidos como histórico.

Atualizado na sessão de revisão de qualidade (branch `claude/studio-marketing-quality-review-kvmmgd`).

---

## 🔄 Pivô 1 — Pagamento: Kiwify → plataforma própria (checkout Asaas)

**O que muda:**

- O **Kiwify sai**. A venda do teste/consulta passa a ser processada pela **plataforma própria**
  (desenvolvida internamente) usando o **checkout do Asaas**.
- A plataforma própria é a **source of truth do pagamento**. Quando uma venda é aprovada
  (ou estornada), ela **dispara um webhook assinado (HMAC SHA256) pro Marketing**, no mesmo
  espírito do antigo webhook Kiwify — o Marketing **só escuta**.
- O `kiwify_product_id` como chave de identificação da nutri **sai**. A venda passa a trazer
  **`franqueada_id` + ref do anúncio (`anuncio_id` e/ou `fbclid`) no próprio payload**.

**Contrato do novo webhook** (substitui `/api/webhooks/kiwify`):

```
POST /api/webhooks/venda
Header: X-Plataforma-Signature: <hmac_sha256(rawBody, PLATAFORMA_WEBHOOK_SECRET)>
Body (JSON):
{
  "evento": "venda_aprovada" | "venda_estornada" | "chargeback",
  "pedido_id": "ord_...",            // idempotência (event_id = venda_<pedido_id>)
  "franqueada_id": "uuid-no-marketing",
  "anuncio_id": "uuid|null",         // atribuição direta quando disponível
  "fbclid": "string|null",           // fallback de atribuição
  "valor": 1800,
  "currency": "BRL",
  "produto": "teste_genetico" | "consulta" | "plano_anual",
  "cliente": { "email": "...", "phone": "...", "nome": "..." },
  "event_time": "ISO-8601"
}
```

**O Marketing deve:**
1. Validar HMAC (`PLATAFORMA_WEBHOOK_SECRET`); rejeitar 401 se inválido.
2. Dedup por `event_id = venda_<pedido_id>` (constraint única em `conversoes_registradas`).
3. Resolver a franqueada por `franqueada_id` (não mais por produto).
4. Gravar em `conversoes_registradas` (`tipo=Purchase`, `origem=plataforma_propria`).
5. Disparar **CAPI Purchase** (valor real do pedido).
6. **Tratar reembolso/chargeback** — ganho novo que o Kiwify não tinha:
   `venda_estornada`/`chargeback` → registrar conversão negativa e (opcional) CAPI refund.
7. Incrementar/decrementar contador no anúncio conforme o evento.

**Migration:** depreciar `franqueadas.kiwify_product_id` e `exame_precisao_ativo` ligados ao
Kiwify; adicionar campos genéricos de integração com a plataforma própria se necessário.

**Env vars:** `PLATAFORMA_WEBHOOK_SECRET` (novo). `KIWIFY_WEBHOOK_SECRET` fica deprecado.

---

## 🔄 Pivô 2 — Atendimento: Sofia (URL-chat) → IA central no WhatsApp

**O que muda:**

- A **Sofia URL-chat sai**. Entra **uma IA central no WhatsApp oficial**, número único,
  identificando a nutri pelo padrão **`/nome-da-nutri`** (texto pré-preenchido no link
  `wa.me` ou comando de roteamento na primeira mensagem).
- A IA central **qualifica o lead e dispara os eventos de funil automaticamente** (Lead,
  Schedule), do mesmo jeito que a Sofia disparava — mas agora pelo canal WhatsApp.
- O `SOFIA_INTERNAL_TOKEN` é substituído por um token genérico de serviço da IA
  (`WHATSAPP_IA_TOKEN`); os endpoints de conversão continuam, só muda quem chama e a auth.

**Endpoints de conversão (continuam, re-autenticados):**

| Endpoint | Quando | Auth nova |
|---|---|---|
| `POST /api/conversions/lead` | IA identifica lead qualificado | `x-ia-token: WHATSAPP_IA_TOKEN` |
| `POST /api/conversions/schedule` | IA confirma agendamento | idem |
| `POST /api/conversions/initiate-checkout` | IA envia link de checkout Asaas | idem |

**Payload** passa a trazer `franqueadaId` resolvido pela ref `/nome-da-nutri` + `fbclid`.

**⚠️ Ponto crítico de atribuição:** sem a Sofia, é a **IA do WhatsApp** que precisa marcar os
eventos de meio de funil. Se ela não disparar `Lead`/`Schedule`, a Meta perde o sinal e o
público frio fica cego. Esse é o item que **não pode falhar** na migração.

---

## 🔄 Pivô 3 — LP de vendas mora na plataforma própria

- A **LP de vendas** (página que recebe o tráfego do anúncio e leva ao WhatsApp/checkout)
  passa a viver na **plataforma própria**.
- O **Marketing** continua dono do **conteúdo orgânico, do motor de anúncios e do tracking
  hub (CAPI + `conversoes_registradas`)**. Ele **manda tráfego** (pixel) e **recebe os
  eventos**, mas não hospeda a LP de venda nem o checkout.
- A LP atual `/nutri/[slug]` no Marketing fica como **bridge opcional/legado**; o destino
  estratégico do tráfego é a LP da plataforma própria.

---

## 📌 Reposicionamento do app Marketing

Com os 3 pivôs, o **Marketing** vira **hub de Conteúdo + Tráfego + Tracking**:

```
Plataforma própria (LP de vendas + checkout Asaas + IA WhatsApp)
   │  webhook venda (HMAC)            ▲  tráfego com pixel + ref da nutri
   ▼                                  │
Marketing (app.scannerdasaude.com)
   ├── Motor orgânico (skills + planejamento semanal)
   ├── Motor de anúncios (cria/otimiza campanhas Meta, benchmarks)
   └── Tracking hub (CAPI, conversoes_registradas, ROAS, atribuição)
```

---

## ✅ Checklist da migração (ordem)

- [ ] `/api/webhooks/venda` (Asaas/plataforma própria) + dedup + CAPI + reembolso
- [ ] Migration depreciando `kiwify_product_id`
- [ ] Re-auth dos endpoints de conversão (`x-ia-token`) + resolução por ref `/nome-da-nutri`
- [ ] Garantir eventos de meio de funil disparados pela IA do WhatsApp
- [ ] Apontar CTA da LP `/nutri/[slug]` (se mantida) pro WhatsApp único + ref
- [ ] Env vars: `PLATAFORMA_WEBHOOK_SECRET`, `WHATSAPP_IA_TOKEN`; deprecar `KIWIFY_*`, `SOFIA_*`
