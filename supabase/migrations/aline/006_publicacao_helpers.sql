-- ============================================================
-- Helpers pra pipeline de publicacao automatica (Studio Aline)
-- - RPC pra decryptar token na hora de publicar
-- - RPC pra setar token criptografado quando OAuth concluir
-- ============================================================

-- Retorna dados completos do perfil (com token decryptado) pra pipeline de publicacao.
-- SECURITY DEFINER => so service_role consegue chamar (RLS protege chamadas anon).
CREATE OR REPLACE FUNCTION aline.get_perfil_publicacao(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  nome TEXT,
  instagram_handle TEXT,
  instagram_conta_id TEXT,
  access_token TEXT,
  token_expiry TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.slug,
    p.nome,
    p.instagram_handle,
    p.instagram_conta_id,
    CASE WHEN p.instagram_access_token IS NOT NULL
      THEN public.decrypt_token(p.instagram_access_token)
      ELSE NULL END AS access_token,
    p.instagram_token_expiry AS token_expiry
  FROM aline.perfis p
  WHERE p.slug = p_slug
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION aline.get_perfil_publicacao(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION aline.get_perfil_publicacao(TEXT) TO service_role;

-- Atualiza credenciais Instagram do perfil (chamada pelo callback OAuth).
-- Recebe token em texto plano e criptografa internamente.
CREATE OR REPLACE FUNCTION aline.set_perfil_instagram_credenciais(
  p_slug              TEXT,
  p_conta_id          TEXT,
  p_access_token      TEXT,
  p_token_expiry      TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  UPDATE aline.perfis
  SET
    instagram_conta_id     = p_conta_id,
    instagram_access_token = public.encrypt_token(p_access_token),
    instagram_token_expiry = p_token_expiry,
    atualizado_em          = NOW()
  WHERE slug = p_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil aline.% nao encontrado', p_slug;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION aline.set_perfil_instagram_credenciais(TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION aline.set_perfil_instagram_credenciais(TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

COMMENT ON FUNCTION aline.get_perfil_publicacao IS
  'Retorna perfil + access_token DECRYPTADO pro publisher. Service role only.';
COMMENT ON FUNCTION aline.set_perfil_instagram_credenciais IS
  'Salva credenciais OAuth Instagram criptografadas. Service role only.';
