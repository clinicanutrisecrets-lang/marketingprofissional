-- ============================================================
-- MIGRATION 023: Produtos do Scanner Tratamentos + SSO do Scanner SaaS
-- ============================================================
-- Parte da integração "Marketing Profissional dentro do Scanner":
--
-- 1. produtos_scanner: cache local dos produtos que a nutri vende no
--    Scanner Tratamentos (tratamentos.scannerdasaude.com). Sincronizado
--    via GET {SCANNER_SAAS_URL}/api/integrations/marketing/produtos
--    (o Hub é o gateway — Marketing nunca fala direto com o Cursos).
--    Usado pela seção "Posts de venda" e injetado no contexto de TODA
--    geração de copy (links/preços reais, nunca inventados).
--
-- 2. O SSO (rota /sso deste app) loga a nutri vinda do Scanner via JWT
--    HS256 (MARKETING_SSO_SECRET) — não precisa de schema novo, mas fica
--    documentado aqui porque chega no mesmo deploy.
--
-- ⚠️ Aplicar ANTES ou JUNTO do deploy do app: o código degrada com
-- mensagem amigável se a tabela ainda não existir (sync falha e a tela
-- avisa), mas o fluxo só completa com ela criada.

CREATE TABLE IF NOT EXISTS produtos_scanner (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id       UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  produto_id          TEXT NOT NULL,          -- id do produto no Scanner Cursos (cursos.produtos.id)
  nome                TEXT NOT NULL,
  tipo                TEXT,                   -- 'curso' | 'ebook' | 'programa_anual' | 'teste' | 'app' | 'consulta'
  descricao           TEXT,
  scanner_produto_id  TEXT,                   -- slug interno do Scanner (ex: 'teste_epigenetico')
  preco_centavos      INTEGER,
  parcelas_max        INTEGER,
  checkout_url        TEXT NOT NULL,          -- URL REAL do checkout no tratamentos.scannerdasaude.com
  ativo               BOOLEAN DEFAULT TRUE,   -- false = sumiu do catálogo na última sincronização
  sincronizado_em     TIMESTAMPTZ DEFAULT NOW(),
  criado_em           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (franqueada_id, produto_id)
);

CREATE INDEX IF NOT EXISTS idx_produtos_scanner_franqueada_ativo
  ON produtos_scanner(franqueada_id, ativo);

-- RLS: nutri LÊ os próprios produtos; escrita é só via service role
-- (rota de sync) — sem policy de INSERT/UPDATE pra authenticated.
ALTER TABLE produtos_scanner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produtos_scanner_self_read" ON produtos_scanner FOR SELECT USING (
  franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()) OR is_admin()
);

COMMENT ON TABLE produtos_scanner IS
  'Cache dos produtos da nutri no Scanner Tratamentos. Fonte: Hub /api/integrations/marketing/produtos. Nunca editar à mão — sync sobrescreve.';
