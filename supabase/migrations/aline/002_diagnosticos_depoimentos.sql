-- ============================================================
-- MIGRATION 002 (aline): Skill 1 (Diagnóstico) + campos complementares
-- ============================================================
-- - Campos novos em aline.perfis (bio_atual, historia_pessoal)
-- - Nova tabela aline.diagnosticos_perfil (espelho do public.diagnosticos_perfil)
-- - Nova tabela aline.depoimentos (alimenta Skill 6 - Storytelling)

-- Campos novos em perfis
ALTER TABLE aline.perfis
  ADD COLUMN IF NOT EXISTS bio_atual           TEXT,
  ADD COLUMN IF NOT EXISTS historia_pessoal    TEXT,
  ADD COLUMN IF NOT EXISTS valor_consulta      DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS valor_teste         DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS publico_alvo        TEXT,
  ADD COLUMN IF NOT EXISTS diferenciais        TEXT,
  ADD COLUMN IF NOT EXISTS nicho_principal     TEXT,
  ADD COLUMN IF NOT EXISTS palavras_chave      TEXT[],
  ADD COLUMN IF NOT EXISTS palavras_evitar     TEXT,
  ADD COLUMN IF NOT EXISTS paleta_cores        JSONB,
  ADD COLUMN IF NOT EXISTS sistema_cor_regra   TEXT;

-- =============== CORES CORRETAS DOS 2 PERFIS ===============
-- Scanner da Saúde: paleta multicolor sólida (cores da logo S)
-- Nutri Secrets: verde tiffany da logo + magenta contrastante
--
-- IMPORTANTE: cor_primaria passa a ser o DEFAULT (1ª escolha)
-- e paleta_cores lista as opções pra rotacionar por post/peça.

UPDATE aline.perfis
  SET nicho_principal     = 'medicina_precisao_saas_nutricionistas',
      publico_alvo        = 'Nutricionistas clinicas brasileiras que querem escalar consultorio digital',
      cor_primaria        = '#8B5CF6',
      cor_secundaria      = '#3B82F6',
      paleta_cores        = '[
        {"nome": "roxo",    "hex": "#8B5CF6", "uso": "educacao_precisao"},
        {"nome": "azul",    "hex": "#3B82F6", "uso": "bastidores_software"},
        {"nome": "tiffany", "hex": "#14B8A6", "uso": "transformacao_carreira"},
        {"nome": "amarelo", "hex": "#FBBF24", "uso": "prova_social"},
        {"nome": "vermelho","hex": "#EF4444", "uso": "venda_direta"},
        {"nome": "magenta", "hex": "#D946EF", "uso": "bonus_variacao"}
      ]'::jsonb,
      sistema_cor_regra   = 'rotaciona por pilar de conteudo: cada pilar tem uma cor dominante; sempre fundo claro/branco, cor em blocos solidos de destaque (faixas, numeros grandes, backgrounds de bullets)'
  WHERE slug = 'scannerdasaude';

UPDATE aline.perfis
  SET nicho_principal     = 'nutricao_de_precisao_e_nutrigenetica',
      publico_alvo        = 'Mulheres 30-55 preocupadas com saude preventiva; profissionais de saude',
      valor_consulta      = 650,
      valor_teste         = 1800,
      cor_primaria        = '#0D9488',
      cor_secundaria      = '#D946EF',
      paleta_cores        = '[
        {"nome": "tiffany_escuro", "hex": "#0D9488", "uso": "primaria_dominante"},
        {"nome": "magenta",        "hex": "#D946EF", "uso": "contraste_destaque"},
        {"nome": "creme",          "hex": "#FAF6F0", "uso": "fundo_editorial"}
      ]'::jsonb,
      sistema_cor_regra   = 'primaria verde tiffany dominante, magenta usado com parcimonia (CTAs, bullets, numeros) para contraste editorial; fundo creme neutro'
  WHERE slug = 'nutrisecrets';

-- =============== DIAGNÓSTICOS ===============
CREATE TABLE IF NOT EXISTS aline.diagnosticos_perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,

  diagnostico_primeira_impressao TEXT,
  clareza_posicionamento TEXT,
  linha_editorial_atual TEXT,

  forcas JSONB DEFAULT '[]'::jsonb,
  fraquezas JSONB DEFAULT '[]'::jsonb,
  gargalos_crescimento JSONB DEFAULT '[]'::jsonb,
  gargalos_conversao JSONB DEFAULT '[]'::jsonb,
  erros_percepcao JSONB DEFAULT '[]'::jsonb,
  oportunidades_rapidas JSONB DEFAULT '[]'::jsonb,
  ideias_reposicionamento JSONB DEFAULT '[]'::jsonb,

  sugestoes_bio JSONB DEFAULT '[]'::jsonb,
  sugestoes_destaques JSONB DEFAULT '[]'::jsonb,
  sugestoes_linha_editorial TEXT,

  mudancas_priorizadas JSONB DEFAULT '[]'::jsonb,

  fonte_dados_ig JSONB,
  fonte_dados_perfil JSONB,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'visualizado', 'aprovado', 'editado', 'descartado')),
  feedback TEXT,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  visualizado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aline_diag_perfil
  ON aline.diagnosticos_perfil(perfil_id, criado_em DESC);

-- =============== DEPOIMENTOS ===============
-- Alimenta Skill 6 (Storytelling + Prova Social).
-- Pode ser caso da própria nutri/marca ou depoimento anônimo.
CREATE TABLE IF NOT EXISTS aline.depoimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,

  titulo TEXT NOT NULL,
  quem_era TEXT,                      -- "Marina, 42, executiva com diabetes familiar"
  problema_inicial TEXT NOT NULL,     -- situação antes
  ponto_ruptura TEXT,                 -- o que fez procurar
  solucao_aplicada TEXT NOT NULL,     -- o que foi feito (protocolo genérico, sem prescrição)
  resultado TEXT NOT NULL,            -- transformação (sem peso/medida especifica, respeita CFN)
  objecoes_relatadas TEXT,            -- objeções que a paciente tinha

  anonimo BOOLEAN DEFAULT TRUE,
  idade_aproximada INTEGER,
  genero TEXT,
  regiao TEXT,

  autorizacao_uso BOOLEAN DEFAULT TRUE,
  fonte TEXT DEFAULT 'relato_nutri'
    CHECK (fonte IN ('relato_nutri', 'screenshot_whatsapp', 'video', 'audio')),
  midia_url TEXT,

  usado_em_posts JSONB DEFAULT '[]'::jsonb,
  usado_em_ads JSONB DEFAULT '[]'::jsonb,

  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aline_depo_perfil
  ON aline.depoimentos(perfil_id, ativo);

COMMENT ON TABLE aline.diagnosticos_perfil IS
  'Skill 1 do Agente Organico: diagnostico estrategico por perfil.';
COMMENT ON TABLE aline.depoimentos IS
  'Skill 6 do Agente Organico: casos/depoimentos para storytelling.';
