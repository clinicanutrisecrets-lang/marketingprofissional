-- ============================================================
-- SEED: 2 perfis fixos do Studio Aline
-- Aplica via Supabase SQL Editor.
-- Idempotente: se ja existem, nao duplica.
-- ============================================================

INSERT INTO aline.perfis (slug, nome, instagram_handle, objetivo, tom, pilares, regras_especiais, cor_primaria) VALUES
(
  'scannerdasaude',
  'Scanner da Saude',
  'scannerdasaude',
  'Vender o software Scanner da Saude para nutricionistas',
  'cientifico_acessivel',
  '[
    {"nome":"educacao_precisao","pct":30},
    {"nome":"transformacao_carreira","pct":30},
    {"nome":"bastidores_software","pct":20},
    {"nome":"prova_social","pct":10},
    {"nome":"venda_direta","pct":10}
  ]'::jsonb,
  'Publico exclusivo: nutricionistas clinicas',
  '#0BB8A8'
),
(
  'nutrisecrets',
  'Nutri Secrets',
  'nutrisecrets',
  'Educar sobre nutricao de precisao. 70% paciente final, 30% profissional.',
  'empatico_acolhedor',
  '[
    {"nome":"sinergias_nutricionais","pct":35},
    {"nome":"precisao_leigos","pct":25},
    {"nome":"conteudo_pessoal","pct":15},
    {"nome":"profissionais_saude","pct":15},
    {"nome":"scanner_mencao","pct":10}
  ]'::jsonb,
  'Max 1 em cada 5 posts menciona Scanner da Saude. Split 70/30 paciente/profissional.',
  '#D946EF'
)
ON CONFLICT (slug) DO NOTHING;

-- Verificacao: deve retornar 2 linhas
SELECT slug, nome, instagram_handle, ativo FROM aline.perfis ORDER BY slug;
