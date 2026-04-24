-- ============================================================
-- MIGRATION 012: Email Queue (delays + cron processador)
-- ============================================================
-- Fila de emails transacionais com agendamento. Usado pra:
--   - Email "sua LP esta no ar" 18-24h apos finalizar onboarding
--   - Email "primeira semana pronta pra aprovar" 30-46h apos
--   - Outros emails programaticos no futuro
--
-- Cron /api/cron/processar-email-queue (a cada 30min) le entradas
-- com status='pendente' AND scheduled_for <= now(), envia via Resend,
-- marca status='enviado' OR 'falhou' (+ retry counter).

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID REFERENCES franqueadas(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL,                  -- 'lp_pronta', 'primeira_semana_pronta', etc
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  reply_to TEXT,

  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'enviado', 'falhou', 'cancelado')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,

  resend_id TEXT,                      -- ID retornado pelo Resend p/ tracking

  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_processavel
  ON email_queue(status, scheduled_for)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_email_queue_franqueada
  ON email_queue(franqueada_id, criado_em DESC)
  WHERE franqueada_id IS NOT NULL;

COMMENT ON TABLE email_queue IS
  'Fila de emails transacionais com agendamento. Cron processador roda a cada 30min.';
