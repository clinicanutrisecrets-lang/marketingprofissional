-- ============================================================
-- Criptografia de tokens sensíveis (Instagram, Meta Ads, HeyGen, etc)
-- Usa pgsodium (crypto_secretbox) — extensão nativa do Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgsodium" CASCADE;

-- Key pra criptografia simétrica (rotacionável)
-- Gerada UMA vez e armazenada. Não versionar o valor em git.
-- Ver: https://supabase.com/docs/guides/database/pgsodium

-- Função helper pra criptografar texto com key global
CREATE OR REPLACE FUNCTION encrypt_token(plain TEXT)
RETURNS BYTEA AS $$
DECLARE
  key_id UUID;
BEGIN
  -- Usa a key padrão do Vault (primeiro cria se não existir)
  SELECT id INTO key_id FROM pgsodium.valid_key WHERE name = 'scanner_tokens' LIMIT 1;
  IF key_id IS NULL THEN
    key_id := (pgsodium.create_key(name := 'scanner_tokens')).id;
  END IF;
  RETURN pgsodium.crypto_aead_det_encrypt(
    convert_to(plain, 'utf8'),
    convert_to('scanner_tokens_aad', 'utf8'),
    key_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_token(cipher BYTEA)
RETURNS TEXT AS $$
DECLARE
  key_id UUID;
BEGIN
  SELECT id INTO key_id FROM pgsodium.valid_key WHERE name = 'scanner_tokens' LIMIT 1;
  IF key_id IS NULL THEN
    RAISE EXCEPTION 'scanner_tokens key not found in vault';
  END IF;
  RETURN convert_from(
    pgsodium.crypto_aead_det_decrypt(
      cipher,
      convert_to('scanner_tokens_aad', 'utf8'),
      key_id
    ),
    'utf8'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apenas service_role pode chamar essas funções
REVOKE ALL ON FUNCTION encrypt_token(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION decrypt_token(BYTEA) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION encrypt_token IS
  'Criptografa token usando pgsodium + key scanner_tokens. Service role only.';
COMMENT ON FUNCTION decrypt_token IS
  'Descriptografa token. APENAS no servidor via service_role.';

-- ============================================================
-- Migrar colunas de token existentes: TEXT → BYTEA criptografado
-- ============================================================

-- Franqueadas
ALTER TABLE franqueadas
  ADD COLUMN instagram_access_token_enc BYTEA,
  ADD COLUMN meta_ads_access_token_enc  BYTEA;

-- Copiar valores existentes (se houver — nesse momento tudo é NULL, mas deixo safe)
UPDATE franqueadas
SET
  instagram_access_token_enc = CASE WHEN instagram_access_token IS NOT NULL
    THEN encrypt_token(instagram_access_token) ELSE NULL END,
  meta_ads_access_token_enc  = CASE WHEN meta_ads_access_token IS NOT NULL
    THEN encrypt_token(meta_ads_access_token) ELSE NULL END;

-- Remover colunas plaintext (passou dados pra encrypted)
ALTER TABLE franqueadas
  DROP COLUMN instagram_access_token,
  DROP COLUMN meta_ads_access_token;

-- Renomear pra ficar no mesmo nome original (mas agora encrypted)
ALTER TABLE franqueadas
  RENAME COLUMN instagram_access_token_enc TO instagram_access_token;
ALTER TABLE franqueadas
  RENAME COLUMN meta_ads_access_token_enc TO meta_ads_access_token;
