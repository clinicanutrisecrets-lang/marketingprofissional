-- ============================================================
-- MIGRATION 025: Biblioteca de posts — arte em imagem + coleção
--                liberada por produto do Scanner Tratamentos
-- ============================================================
-- Até aqui todo post da biblioteca era um MODELO DO CANVA (canva_url) e
-- aparecia igual pra toda franqueada, agrupado por mês.
--
-- Esta migração acrescenta (tudo aditivo — post antigo continua idêntico):
--
--  * imagem_url  — arte pronta servida pelo próprio app
--                  (apps/franquias/public/biblioteca/...). Post pode ter
--                  imagem, Canva, ou os dois; o CHECK garante que tem ao
--                  menos um dos dois, senão o card nasceria sem ação.
--  * formato     — 'feed' (1080x1350) ou 'story' (9:16). O card mostra a
--                  proporção certa; story num moldura de feed sai cortado.
--  * colecao     — agrupa fora da grade de meses (ex.: 'nutrigenetica').
--                  NULL = grade mensal de sempre.
--  * requer_scanner_produto — text[] de scanner_produto_id. NULL/{} = todas
--                  as franqueadas veem. Com valor, só quem tem aquele
--                  produto ATIVO em produtos_scanner. É gate de RELEVÂNCIA,
--                  não de segurança: post de venda de um produto que a nutri
--                  não vende manda o seguidor dela pra um link que não existe.
--  * observacao  — recado da equipe pra nutri sobre AQUELE post (ex.: "a
--                  foto é da Aline, refaça com você").
--  * slug        — chave natural, pra este seed ser idempotente (rodar de
--                  novo atualiza, não duplica).
--
-- ⚠️ ORDEM: esta migração vem ANTES do deploy do app — a tela nova
-- seleciona as colunas novas, e SELECT com coluna inexistente falha
-- INTEIRO no PostgREST (a biblioteca ficaria em "erro ao carregar" pra
-- todo mundo). Ela é inerte pro app que está NO AR agora: só acrescenta
-- coluna, e o SELECT de hoje nem olha pra elas.
--
-- O SEED dos 5 posts mora em arquivo separado (026) porque só pode
-- entrar DEPOIS do deploy — ver o cabeçalho de lá.

ALTER TABLE biblioteca_posts
  ADD COLUMN IF NOT EXISTS slug                    TEXT,
  ADD COLUMN IF NOT EXISTS imagem_url              TEXT,
  ADD COLUMN IF NOT EXISTS formato                 TEXT NOT NULL DEFAULT 'feed',
  ADD COLUMN IF NOT EXISTS colecao                 TEXT,
  ADD COLUMN IF NOT EXISTS requer_scanner_produto  TEXT[],
  ADD COLUMN IF NOT EXISTS observacao              TEXT;

-- canva_url deixa de ser obrigatório: arte de imagem não tem modelo no Canva.
ALTER TABLE biblioteca_posts ALTER COLUMN canva_url DROP NOT NULL;

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'biblioteca_posts_tem_arte'
  ) THEN
    ALTER TABLE biblioteca_posts ADD CONSTRAINT biblioteca_posts_tem_arte
      CHECK (
        COALESCE(NULLIF(canva_url, ''), NULLIF(imagem_url, '')) IS NOT NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'biblioteca_posts_formato_valido'
  ) THEN
    ALTER TABLE biblioteca_posts ADD CONSTRAINT biblioteca_posts_formato_valido
      CHECK (formato IN ('feed', 'story'));
  END IF;
END
$do$;

CREATE UNIQUE INDEX IF NOT EXISTS biblioteca_posts_slug_uniq
  ON biblioteca_posts(slug) WHERE slug IS NOT NULL;

COMMENT ON COLUMN biblioteca_posts.requer_scanner_produto IS
  'scanner_produto_id que a franqueada precisa ter ativo em produtos_scanner pra ver o post. NULL = todas. Gate de relevância (a tela filtra), não de segurança.';
COMMENT ON COLUMN biblioteca_posts.observacao IS
  'Recado da equipe sobre este post (ex.: foto com pessoa real que a nutri não deve publicar como sua).';
