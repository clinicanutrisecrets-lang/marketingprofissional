-- ============================================================
-- Robô do Instagram: BOTÕES com ramificação nas regras (respostas rápidas
-- da API do Instagram) + memória dos últimos botões por contato.
--
-- Pra migrar o fluxo "GLP1" do ManyChat: comentário → DM com pergunta e
-- botões (Outro profissional / Sim, sou nutri / Não, sou paciente) → cada
-- botão manda a própria resposta, tag e sequência (follow-up em 23h).
--
-- Aditiva. Pode aplicar antes ou depois do deploy.
-- ============================================================

ALTER TABLE aline.ig_regras
  ADD COLUMN IF NOT EXISTS opcoes JSONB NOT NULL DEFAULT '[]'::jsonb;
COMMENT ON COLUMN aline.ig_regras.opcoes IS
  'Botões da resposta privada: [{rotulo (≤20 chars), resposta, tags[], sequencia_id}]. A pessoa toca, e o robô executa a opção.';

ALTER TABLE aline.ig_contatos
  ADD COLUMN IF NOT EXISTS ultimas_opcoes JSONB;
COMMENT ON COLUMN aline.ig_contatos.ultimas_opcoes IS
  'Botões que o robô ofereceu por último a este contato: {regra_id, opcoes:[rotulo]}. Serve pra casar resposta digitada ("2", "sim sou nutri") quando o toque não vem com payload.';
