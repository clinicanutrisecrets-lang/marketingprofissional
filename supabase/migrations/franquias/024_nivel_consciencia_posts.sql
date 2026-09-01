-- ============================================================
-- MIGRATION 024: Nível de consciência (Eugene Schwartz) no post
-- ============================================================
-- O gerador passou a escolher, pra CADA post, em que nível de consciência o
-- público está (inconsciente → consciente do problema → da solução → do
-- produto → mais consciente). Isso muda a copy do MESMO tema e é o eixo da
-- sequência da esteira de produtos.
--
-- Guardar o nível junto do post é o que permite, depois, olhar performance
-- por nível ("os posts de topo engajam, os de fundo convertem?") em vez de
-- só por ângulo.
--
-- ADITIVA: coluna nullable, sem default, sem tocar em linha existente. O
-- código que está no ar hoje não conhece a coluna e continua funcionando com
-- ela criada.
--
-- 🔴 ORDEM: TINHA que ser aplicada ANTES DO DEPLOY. O código novo escreve
-- posts_agendados.nivel_consciencia no insert do post; com a coluna ainda
-- inexistente, TODO insert falharia com 42703 e a semana inteira não seria
-- gerada.
--
-- ✅ JÁ APLICADA EM PRODUÇÃO em 01/09/2026 (projeto mfldshdxulqxskwcoxrl),
-- ANTES do deploy, justamente pra fechar essa janela. Conferido: a coluna
-- existe como TEXT nullable e a constraint
-- posts_agendados_nivel_consciencia_check está lá. Rodar de novo é seguro
-- (tudo é IF NOT EXISTS).

ALTER TABLE posts_agendados
  ADD COLUMN IF NOT EXISTS nivel_consciencia TEXT;

-- CHECK aceita NULL de propósito: post antigo (e post manual sem escolha)
-- fica sem nível, e isso não pode virar erro de insert.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_agendados_nivel_consciencia_check'
  ) THEN
    ALTER TABLE posts_agendados
      ADD CONSTRAINT posts_agendados_nivel_consciencia_check
      CHECK (
        nivel_consciencia IS NULL
        OR nivel_consciencia IN (
          'inconsciente',
          'consciente_problema',
          'consciente_solucao',
          'consciente_produto',
          'mais_consciente'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN posts_agendados.nivel_consciencia IS
  'Nível de consciência do público do post (Eugene Schwartz). Valores em lib/claude/consciencia.ts. NULL = post sem nível definido (anteriores à feature ou manuais).';

CREATE INDEX IF NOT EXISTS idx_posts_nivel_consciencia
  ON posts_agendados(franqueada_id, nivel_consciencia)
  WHERE nivel_consciencia IS NOT NULL;
