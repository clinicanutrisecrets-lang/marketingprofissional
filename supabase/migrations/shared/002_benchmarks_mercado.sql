-- ============================================================
-- Benchmarks de mercado — base pra avaliação automática de CPL/CAC
-- Seed inicial com pesquisa 2024/2025 (Meta Ads BR + relatórios públicos)
-- Fonte de verdade vai evoluindo com dados reais da própria rede.
-- ============================================================

CREATE TABLE benchmarks_mercado (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nicho             TEXT NOT NULL,
  objetivo_anuncio  TEXT NOT NULL,
  regiao            TEXT NOT NULL DEFAULT 'BR_geral',
  metrica           TEXT NOT NULL,               -- 'cpl', 'cac', 'cpm', 'ctr', 'custo_seguidor', 'cpa_consulta'
  valor_excelente   DECIMAL(10,2) NOT NULL,
  valor_bom         DECIMAL(10,2) NOT NULL,
  valor_mediano     DECIMAL(10,2) NOT NULL,
  valor_ruim        DECIMAL(10,2) NOT NULL,
  fonte             TEXT,
  atualizado_em     DATE DEFAULT CURRENT_DATE,
  observacoes       TEXT,
  UNIQUE(nicho, objetivo_anuncio, regiao, metrica)
);

CREATE INDEX idx_benchmarks_lookup ON benchmarks_mercado(nicho, objetivo_anuncio, regiao, metrica);

-- Leitura pública (vai aparecer no painel como comparador)
ALTER TABLE benchmarks_mercado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benchmarks_read_all" ON benchmarks_mercado FOR SELECT USING (true);

-- ============================================================
-- SEED INICIAL — valores aproximados de mercado (BR)
-- Atualizar mensalmente conforme dados reais chegam.
-- ============================================================

INSERT INTO benchmarks_mercado (nicho, objetivo_anuncio, regiao, metrica, valor_excelente, valor_bom, valor_mediano, valor_ruim, fonte, observacoes) VALUES
-- NUTRIÇÃO FUNCIONAL / INTEGRATIVA
('nutricao_funcional', 'receber_mensagens', 'BR_sul_sudeste', 'cpl', 8.00, 15.00, 25.00, 45.00, 'Meta Ads BR 2024 + estudo interno', 'Mensagem WhatsApp via Click-to-WhatsApp'),
('nutricao_funcional', 'agendar_consultas', 'BR_sul_sudeste', 'cpa_consulta', 60.00, 120.00, 200.00, 350.00, 'Meta Ads BR 2024', 'Conversão até agendamento efetivo'),
('nutricao_funcional', 'ganhar_seguidores', 'BR_geral', 'custo_seguidor', 0.80, 1.50, 2.50, 4.00, 'Hootsuite Social Trends BR 2024', 'Seguidor orgânico adquirido via anúncio'),
('nutricao_funcional', 'vender_teste_genetico', 'BR_geral', 'cac', 180.00, 320.00, 500.00, 800.00, 'Estudo interno Scanner da Saúde', 'Teste genético R$1800 — comissão nutri'),

-- NUTRIÇÃO ESPORTIVA
('nutricao_esportiva', 'receber_mensagens', 'BR_sul_sudeste', 'cpl', 10.00, 18.00, 30.00, 55.00, 'Meta Ads BR 2024', ''),
('nutricao_esportiva', 'agendar_consultas', 'BR_sul_sudeste', 'cpa_consulta', 80.00, 150.00, 250.00, 400.00, 'Meta Ads BR 2024', ''),
('nutricao_esportiva', 'ganhar_seguidores', 'BR_geral', 'custo_seguidor', 0.60, 1.20, 2.00, 3.50, 'Hootsuite BR 2024', 'Público interessado em fitness tende a ser mais barato'),

-- EMAGRECIMENTO
('emagrecimento', 'receber_mensagens', 'BR_geral', 'cpl', 6.00, 12.00, 20.00, 38.00, 'Meta Ads BR 2024', 'Volume alto, concorrência alta'),
('emagrecimento', 'agendar_consultas', 'BR_geral', 'cpa_consulta', 50.00, 100.00, 170.00, 300.00, 'Meta Ads BR 2024', ''),

-- SAÚDE FEMININA (hormonal, TPM, menopausa)
('saude_feminina', 'receber_mensagens', 'BR_geral', 'cpl', 12.00, 22.00, 35.00, 60.00, 'Meta Ads BR 2024', 'Nicho premium, ticket maior'),
('saude_feminina', 'agendar_consultas', 'BR_geral', 'cpa_consulta', 100.00, 180.00, 280.00, 450.00, 'Meta Ads BR 2024', ''),

-- ONCOLÓGICA
('nutricao_oncologica', 'agendar_consultas', 'BR_geral', 'cpa_consulta', 150.00, 250.00, 400.00, 650.00, 'Estudo interno', 'Ticket alto, nicho muito específico'),

-- MATERNO-INFANTIL
('materno_infantil', 'receber_mensagens', 'BR_geral', 'cpl', 10.00, 18.00, 30.00, 50.00, 'Meta Ads BR 2024', 'Mães engajam muito por WhatsApp'),

-- LONGEVIDADE
('longevidade', 'receber_mensagens', 'BR_sul_sudeste', 'cpl', 15.00, 28.00, 45.00, 75.00, 'Estudo interno', 'Público 50+ tem ticket alto'),
('longevidade', 'vender_teste_genetico', 'BR_geral', 'cac', 220.00, 380.00, 580.00, 900.00, 'Estudo interno', ''),

-- AUTOIMUNE / INTESTINO
('autoimune_intestino', 'receber_mensagens', 'BR_geral', 'cpl', 14.00, 25.00, 40.00, 70.00, 'Meta Ads BR 2024', 'Público muito qualificado, menor volume'),
('autoimune_intestino', 'vender_teste_genetico', 'BR_geral', 'cac', 200.00, 350.00, 520.00, 850.00, 'Estudo interno', '');

COMMENT ON TABLE benchmarks_mercado IS
  'Valores de referência por nicho/região/objetivo. Seed em abril/2026. Atualizar trimestralmente.';
