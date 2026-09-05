-- ============================================================
-- Robô do Instagram (Studio Aline) — "ManyChat próprio"
--
-- O que entra:
--   1. aline.perfis ganha o login direto do Instagram (app "Automacao NS",
--      caso de uso "Gerenciar mensagens e conteúdo no Instagram") e a
--      configuração das chaves gerais da automação.
--   2. Tabelas da automação, TODAS no schema aline (zero toque em tabela
--      compartilhada):
--        ig_contatos          quem já interagiu (IGSID, username, tags, janela 24h)
--        ig_regras            gatilho → resposta (comentário, DM, story)
--        ig_sequencias        régua de mensagens
--        ig_sequencia_passos  passos da régua (atraso + texto)
--        ig_fila              envios agendados (sequência, resposta privada)
--        ig_mensagens         log de tudo que entrou e saiu (dedup por id da Meta)
--
-- ⚠️ TOKEN: as RPCs de 006 (get_perfil_publicacao / set_perfil_instagram_
-- credenciais) chamam public.encrypt_token/decrypt_token, que NÃO existem
-- em produção (a migração shared/001 nunca foi aplicada) — e a coluna
-- instagram_access_token em produção é TEXT, não BYTEA. Por isso o Studio
-- passa a cifrar o token NO APP (AES-256-GCM, ENCRYPTION_KEY — o mesmo
-- padrão do app das nutris) e grava o texto cifrado direto na coluna.
-- As RPCs de 006 ficam como estão, sem uso.
--
-- Aditiva. Pode aplicar antes ou depois do deploy.
-- ============================================================

ALTER TABLE aline.perfis
  ADD COLUMN IF NOT EXISTS instagram_login_tipo TEXT NOT NULL DEFAULT 'facebook'
    CHECK (instagram_login_tipo IN ('facebook', 'instagram')),
  ADD COLUMN IF NOT EXISTS instagram_user_id    TEXT,
  ADD COLUMN IF NOT EXISTS instagram_username   TEXT,
  ADD COLUMN IF NOT EXISTS webhook_assinado_em  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS automacao_config     JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN aline.perfis.instagram_login_tipo IS
  'facebook = fluxo antigo por Página (graph.facebook.com); instagram = login direto do Instagram (graph.instagram.com).';
COMMENT ON COLUMN aline.perfis.instagram_user_id IS
  'ID da conta profissional do Instagram (o que chega em entry.id dos webhooks). instagram_conta_id guarda o id app-scoped do /me.';
COMMENT ON COLUMN aline.perfis.automacao_config IS
  'Chaves gerais do robô: {agradecer_comentarios, responder_dm_scanner, texto_encaminhar_humano, assinatura}.';

-- ─── Contatos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aline.ig_contatos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id               UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  igsid                   TEXT NOT NULL,             -- Instagram-scoped user id
  username                TEXT,
  nome                    TEXT,
  tags                    TEXT[] NOT NULL DEFAULT '{}',
  primeira_interacao_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_interacao_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_msg_recebida_em  TIMESTAMPTZ,               -- abre a janela de 24h da Meta
  precisa_humano          BOOLEAN NOT NULL DEFAULT FALSE,
  precisa_humano_motivo   TEXT,
  silenciado              BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (perfil_id, igsid)
);
CREATE INDEX IF NOT EXISTS ig_contatos_perfil_ultima_idx
  ON aline.ig_contatos (perfil_id, ultima_interacao_em DESC);

-- ─── Regras ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aline.ig_regras (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id           UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  ativa               BOOLEAN NOT NULL DEFAULT TRUE,
  gatilho             TEXT NOT NULL
    CHECK (gatilho IN ('comentario', 'dm', 'story_reply', 'story_mention')),
  palavras_chave      TEXT[] NOT NULL DEFAULT '{}',  -- vazio = qualquer texto
  media_ids           TEXT[] NOT NULL DEFAULT '{}',  -- vazio = qualquer post (só comentário)
  resposta_publica    TEXT,                          -- resposta no próprio comentário
  resposta_privada    TEXT,                          -- DM (privada no comentário ou resposta na DM)
  sequencia_id        UUID,                          -- FK abaixo (tabela criada depois)
  tags_adicionar      TEXT[] NOT NULL DEFAULT '{}',
  uma_vez_por_contato BOOLEAN NOT NULL DEFAULT TRUE,
  prioridade          INTEGER NOT NULL DEFAULT 100,  -- menor = avaliada antes
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ig_regras_perfil_idx ON aline.ig_regras (perfil_id, ativa, gatilho);

-- ─── Sequências ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aline.ig_sequencias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id   UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  ativa       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aline.ig_sequencia_passos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequencia_id    UUID NOT NULL REFERENCES aline.ig_sequencias(id) ON DELETE CASCADE,
  ordem           INTEGER NOT NULL,
  atraso_minutos  INTEGER NOT NULL DEFAULT 0,   -- contado a partir do passo anterior
  texto           TEXT NOT NULL,
  UNIQUE (sequencia_id, ordem)
);

ALTER TABLE aline.ig_regras
  DROP CONSTRAINT IF EXISTS ig_regras_sequencia_fk,
  ADD CONSTRAINT ig_regras_sequencia_fk
    FOREIGN KEY (sequencia_id) REFERENCES aline.ig_sequencias(id) ON DELETE SET NULL;

-- ─── Fila de envios ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aline.ig_fila (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id     UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  contato_id    UUID NOT NULL REFERENCES aline.ig_contatos(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('dm', 'private_reply', 'comment_reply')),
  destino       TEXT NOT NULL,       -- IGSID (dm) ou comment_id (private_reply / comment_reply)
  texto         TEXT NOT NULL,
  enviar_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'enviado', 'falhou', 'cancelado')),
  erro          TEXT,
  sequencia_id  UUID REFERENCES aline.ig_sequencias(id) ON DELETE SET NULL,
  passo_ordem   INTEGER,
  regra_id      UUID REFERENCES aline.ig_regras(id) ON DELETE SET NULL,
  enviado_em    TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ig_fila_pendente_idx
  ON aline.ig_fila (status, enviar_em) WHERE status = 'pendente';

-- ─── Log de mensagens e comentários ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS aline.ig_mensagens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id     UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  contato_id    UUID REFERENCES aline.ig_contatos(id) ON DELETE SET NULL,
  canal         TEXT NOT NULL CHECK (canal IN ('dm', 'comentario', 'story_reply', 'story_mention')),
  direcao       TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  external_id   TEXT,               -- mid da DM ou id do comentário (dedup)
  media_id      TEXT,               -- post/story a que se refere
  texto         TEXT,
  origem        TEXT,               -- 'regra' | 'ia_agradecimento' | 'ia_scanner' | 'sequencia' | 'manual'
  regra_id      UUID REFERENCES aline.ig_regras(id) ON DELETE SET NULL,
  payload       JSONB,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ig_mensagens_external_uniq
  ON aline.ig_mensagens (perfil_id, direcao, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ig_mensagens_contato_idx
  ON aline.ig_mensagens (contato_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS ig_mensagens_perfil_idx
  ON aline.ig_mensagens (perfil_id, criado_em DESC);

-- ─── RLS: mesmo padrão do schema (só super_admin) ─────────────────────────
ALTER TABLE aline.ig_contatos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.ig_regras            ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.ig_sequencias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.ig_sequencia_passos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.ig_fila              ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.ig_mensagens         ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ig_contatos','ig_regras','ig_sequencias','ig_sequencia_passos','ig_fila','ig_mensagens'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "aline_%s_admin" ON aline.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "aline_%s_admin" ON aline.%I FOR ALL USING (
         EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = ''super_admin'')
       )', t, t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_aline_ig_contatos_atualizado ON aline.ig_contatos;
CREATE TRIGGER trg_aline_ig_contatos_atualizado BEFORE UPDATE ON aline.ig_contatos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();
DROP TRIGGER IF EXISTS trg_aline_ig_regras_atualizado ON aline.ig_regras;
CREATE TRIGGER trg_aline_ig_regras_atualizado BEFORE UPDATE ON aline.ig_regras
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();
DROP TRIGGER IF EXISTS trg_aline_ig_sequencias_atualizado ON aline.ig_sequencias;
CREATE TRIGGER trg_aline_ig_sequencias_atualizado BEFORE UPDATE ON aline.ig_sequencias
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();
