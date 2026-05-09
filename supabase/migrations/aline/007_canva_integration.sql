-- ============================================================
-- Integracao Canva Connect API (Studio Aline)
-- - Colunas em aline.perfis pra mapear Brand Templates por tipo de peca
-- - Coluna render_engine pra trocar entre Sharp composite (legado) e Canva
-- - Tabela aline.canva_connection: storage criptografado de tokens OAuth
-- - RPCs SECURITY DEFINER pra get/set tokens (mesmo padrao do Instagram)
-- ============================================================

-- 1. PERFIS — colunas pra mapear templates do Canva por tipo de peca
ALTER TABLE aline.perfis
  ADD COLUMN IF NOT EXISTS render_engine                 TEXT
    DEFAULT 'sharp'
    CHECK (render_engine IN ('sharp','canva')),
  ADD COLUMN IF NOT EXISTS canva_template_carrossel_id   TEXT,
  ADD COLUMN IF NOT EXISTS canva_template_feed_id        TEXT,
  ADD COLUMN IF NOT EXISTS canva_template_stories_id     TEXT;

COMMENT ON COLUMN aline.perfis.render_engine IS
  'Engine de renderizacao: sharp (composite legado) ou canva (auto-fill Brand Template).';
COMMENT ON COLUMN aline.perfis.canva_template_carrossel_id IS
  'Brand Template ID do Canva pra carrossel (4:5). Preenchido via UI de configuracao.';
COMMENT ON COLUMN aline.perfis.canva_template_feed_id IS
  'Brand Template ID do Canva pra feed estatico (1:1).';
COMMENT ON COLUMN aline.perfis.canva_template_stories_id IS
  'Brand Template ID do Canva pra stories (9:16).';

-- 2. CANVA_CONNECTION — uma conta Canva por instancia (single-row enforced via id fixo)
-- Futuro: pode virar per-user / per-franchise se necessario.
CREATE TABLE IF NOT EXISTS aline.canva_connection (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Tokens criptografados via pgsodium (mesma abordagem do instagram_access_token)
  access_token_enc      BYTEA NOT NULL,
  refresh_token_enc     BYTEA,
  token_expiry          TIMESTAMPTZ NOT NULL,
  -- Metadata da conexao
  canva_user_id         TEXT,
  canva_user_email      TEXT,
  scopes_concedidos     TEXT[],
  -- Auditoria
  conectado_em          TIMESTAMPTZ DEFAULT NOW(),
  conectado_por_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  atualizado_em         TIMESTAMPTZ DEFAULT NOW(),
  -- Single-row constraint: so existe uma conexao Canva ativa por vez
  singleton_lock        BOOLEAN UNIQUE DEFAULT TRUE CHECK (singleton_lock = TRUE)
);

COMMENT ON TABLE aline.canva_connection IS
  'OAuth tokens da Canva Connect API. Single-row (canva conta unica por instancia).';

ALTER TABLE aline.canva_connection ENABLE ROW LEVEL SECURITY;

-- Sem policies => so service_role acessa (via SECURITY DEFINER abaixo)

-- 3. RPCS pra OAuth Canva (mesmo padrao das funcoes do Instagram)

-- Salva (ou atualiza) tokens criptografados depois do callback OAuth
CREATE OR REPLACE FUNCTION aline.set_canva_credentials(
  p_access_token      TEXT,
  p_refresh_token     TEXT,
  p_token_expiry      TIMESTAMPTZ,
  p_canva_user_id     TEXT,
  p_canva_user_email  TEXT,
  p_scopes            TEXT[],
  p_user_id           UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO aline.canva_connection (
    access_token_enc,
    refresh_token_enc,
    token_expiry,
    canva_user_id,
    canva_user_email,
    scopes_concedidos,
    conectado_por_user_id
  ) VALUES (
    public.encrypt_token(p_access_token),
    CASE WHEN p_refresh_token IS NOT NULL
      THEN public.encrypt_token(p_refresh_token)
      ELSE NULL END,
    p_token_expiry,
    p_canva_user_id,
    p_canva_user_email,
    p_scopes,
    p_user_id
  )
  ON CONFLICT (singleton_lock) DO UPDATE SET
    access_token_enc      = EXCLUDED.access_token_enc,
    refresh_token_enc     = EXCLUDED.refresh_token_enc,
    token_expiry          = EXCLUDED.token_expiry,
    canva_user_id         = EXCLUDED.canva_user_id,
    canva_user_email      = EXCLUDED.canva_user_email,
    scopes_concedidos     = EXCLUDED.scopes_concedidos,
    conectado_por_user_id = EXCLUDED.conectado_por_user_id,
    atualizado_em         = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION aline.set_canva_credentials(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT[], UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION aline.set_canva_credentials(TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT[], UUID)
  TO service_role;

COMMENT ON FUNCTION aline.set_canva_credentials IS
  'Salva OAuth Canva criptografado. Idempotente: substitui conexao existente. Service role only.';

-- Retorna tokens decryptados pro pipeline de auto-fill
CREATE OR REPLACE FUNCTION aline.get_canva_credentials()
RETURNS TABLE (
  access_token   TEXT,
  refresh_token  TEXT,
  token_expiry   TIMESTAMPTZ,
  canva_user_id  TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    public.decrypt_token(c.access_token_enc) AS access_token,
    CASE WHEN c.refresh_token_enc IS NOT NULL
      THEN public.decrypt_token(c.refresh_token_enc)
      ELSE NULL END AS refresh_token,
    c.token_expiry,
    c.canva_user_id
  FROM aline.canva_connection c
  WHERE c.singleton_lock = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION aline.get_canva_credentials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION aline.get_canva_credentials() TO service_role;

COMMENT ON FUNCTION aline.get_canva_credentials IS
  'Retorna tokens Canva DECRYPTADOS pro pipeline. Service role only.';

-- Retorna apenas metadados (sem tokens) pra UI mostrar status da conexao
CREATE OR REPLACE FUNCTION aline.get_canva_connection_status()
RETURNS TABLE (
  conectado          BOOLEAN,
  canva_user_email   TEXT,
  conectado_em       TIMESTAMPTZ,
  expira_em          TIMESTAMPTZ,
  scopes_concedidos  TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE                      AS conectado,
    c.canva_user_email,
    c.conectado_em,
    c.token_expiry            AS expira_em,
    c.scopes_concedidos
  FROM aline.canva_connection c
  WHERE c.singleton_lock = TRUE
  LIMIT 1;

  -- Se nao retornou nada, registra como nao conectado
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TEXT[];
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION aline.get_canva_connection_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION aline.get_canva_connection_status() TO authenticated, service_role;

COMMENT ON FUNCTION aline.get_canva_connection_status IS
  'Status da conexao Canva (sem expor tokens). Authenticated + service role.';

-- Disconectar (apaga a row)
CREATE OR REPLACE FUNCTION aline.disconnect_canva()
RETURNS VOID AS $$
BEGIN
  DELETE FROM aline.canva_connection WHERE singleton_lock = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION aline.disconnect_canva() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION aline.disconnect_canva() TO service_role;

COMMENT ON FUNCTION aline.disconnect_canva IS
  'Remove conexao Canva. Service role only (chamada via API admin).';
