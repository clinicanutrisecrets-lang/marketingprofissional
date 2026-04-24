-- ============================================================
-- MIGRATION 015: Sub-rotinas 7f + 7g da Skill Tracao
-- ============================================================
-- 7f_compartilhamento_lateral: conteudo desenhado pra ser compartilhado
--   lateralmente (nutri-manda-pra-nutri, mulher-manda-pra-amiga).
--   Principal mecanica de crescimento quando nao tem budget de ads.
-- 7g_plano_reativacao: plano de 14 dias pra ressuscitar perfil que
--   perdeu tracao (pattern interrupt + reacender audiencia dormente).

ALTER TABLE tracao_conteudo
  DROP CONSTRAINT IF EXISTS tracao_conteudo_tipo_check;

ALTER TABLE tracao_conteudo
  ADD CONSTRAINT tracao_conteudo_tipo_check CHECK (tipo IN (
    '7a_hooks_alta_tracao',
    '7b_pilares_tracao',
    '7c_plano_misto',
    '7d_bio_destaques',
    '7e_analise_viralidade',
    '7f_compartilhamento_lateral',
    '7g_plano_reativacao'
  ));
