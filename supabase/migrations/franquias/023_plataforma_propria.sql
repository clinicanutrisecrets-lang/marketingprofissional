-- 023_plataforma_propria.sql
-- Suporte ao novo fluxo de pagamento (plataforma própria + checkout Asaas) e
-- à IA central no WhatsApp, substituindo Kiwify + Sofia.
-- Ver docs/DECISOES-ARQUITETURA-2026-06.md e docs/HANDOFF-PLATAFORMA-PROPRIA.md.

-- 1) conversoes_registradas: aceitar reversões (Refund) e novas origens.
ALTER TABLE conversoes_registradas
  DROP CONSTRAINT IF EXISTS conversoes_registradas_tipo_check;
ALTER TABLE conversoes_registradas
  ADD CONSTRAINT conversoes_registradas_tipo_check CHECK (tipo IN (
    'Lead',
    'Schedule',
    'InitiateCheckout',
    'Purchase',
    'Refund'            -- estorno/chargeback (value negativo)
  ));

ALTER TABLE conversoes_registradas
  DROP CONSTRAINT IF EXISTS conversoes_registradas_origem_check;
ALTER TABLE conversoes_registradas
  ADD CONSTRAINT conversoes_registradas_origem_check CHECK (origem IN (
    'sofia',              -- legado
    'kiwify_webhook',     -- legado
    'admin_manual',
    'pixel_client',
    'plataforma_propria', -- webhook de venda (Asaas)
    'whatsapp_ia'         -- IA central no WhatsApp (lead/schedule/checkout)
  ));

-- 2) RPC de contador no anúncio (não existia — o webhook Kiwify chamava no vazio).
-- Incrementa na venda (p_valor > 0) e decrementa na reversão (p_valor < 0).
-- Mantém purchases >= 0 e recalcula ROAS = valor_purchases / gasto_total.
CREATE OR REPLACE FUNCTION incrementar_purchases_anuncio(
  p_anuncio_id UUID,
  p_valor DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE anuncios
  SET
    purchases = GREATEST(0, purchases + CASE WHEN p_valor >= 0 THEN 1 ELSE -1 END),
    valor_purchases = GREATEST(0, COALESCE(valor_purchases, 0) + p_valor),
    roas = CASE
      WHEN COALESCE(gasto_total, 0) > 0
        THEN GREATEST(0, COALESCE(valor_purchases, 0) + p_valor) / gasto_total
      ELSE NULL
    END
  WHERE id = p_anuncio_id;
END;
$$;

COMMENT ON FUNCTION incrementar_purchases_anuncio IS
  'Atualiza purchases/valor_purchases/roas do anúncio. p_valor negativo = reversão (estorno/chargeback).';
