-- ============================================================
-- MIGRATION 043: Vídeos da Black Friday para as PARCEIRAS (Aline, 06/11/2026)
-- ============================================================
-- As parceiras da Black Friday de fora do Consultório não têm conta neste
-- app: elas usam o painel de Tratamentos. O painel pede o vídeo com o nome
-- delas e a narração por um canal assinado
-- (/api/integrations/tratamentos/videos-bf), e os mesmos workers montam.
--
-- O dono da linha passa a ser OU uma franqueada OU uma parceira
-- (parceira_chave = id da conta dela no Tratamentos, cursos.nutris.id).
-- Aditiva: nenhuma linha muda; toda leitura existente filtra por
-- franqueada_id (ou pelo id), então linha de parceira não aparece pra
-- ninguém aqui. A política de RLS também é por franqueada_id.
-- Rodar de novo é seguro.

ALTER TABLE videos_marca ALTER COLUMN franqueada_id DROP NOT NULL;
ALTER TABLE videos_marca ADD COLUMN IF NOT EXISTS parceira_chave TEXT;
ALTER TABLE videos_marca DROP CONSTRAINT IF EXISTS videos_marca_dono_check;
ALTER TABLE videos_marca ADD CONSTRAINT videos_marca_dono_check
  CHECK ((franqueada_id IS NOT NULL) <> (parceira_chave IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_videos_marca_parceira
  ON videos_marca(parceira_chave, video_id, criado_em DESC) WHERE parceira_chave IS NOT NULL;

ALTER TABLE narracoes_video ALTER COLUMN franqueada_id DROP NOT NULL;
ALTER TABLE narracoes_video ADD COLUMN IF NOT EXISTS parceira_chave TEXT;
ALTER TABLE narracoes_video DROP CONSTRAINT IF EXISTS narracoes_video_dono_check;
ALTER TABLE narracoes_video ADD CONSTRAINT narracoes_video_dono_check
  CHECK ((franqueada_id IS NOT NULL) <> (parceira_chave IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_narracoes_video_parceira
  ON narracoes_video(parceira_chave, ref, criado_em DESC) WHERE parceira_chave IS NOT NULL;
