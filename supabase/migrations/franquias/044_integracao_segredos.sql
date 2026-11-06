-- ============================================================
-- MIGRATION 044: segredos de integração guardados no banco (Aline, 06/11/2026)
-- ============================================================
-- O canal Tratamentos → Marketing dos vídeos das parceiras precisa de um
-- segredo compartilhado (VIDEOS_PARCEIRAS_SECRET). Sem acesso para cadastrar
-- variável na Vercel, o mesmo valor fica aqui e no banco do Scanner
-- (cursos.integracao_segredos). A variável da Vercel, se existir, vence.
-- RLS ligado e NENHUMA política: só a chave de serviço (servidor) lê.
-- O VALOR não vai no arquivo: é inserido à parte, direto no banco.

CREATE TABLE IF NOT EXISTS integracao_segredos (
  chave       TEXT PRIMARY KEY,
  valor       TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE integracao_segredos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON integracao_segredos FROM anon, authenticated;
