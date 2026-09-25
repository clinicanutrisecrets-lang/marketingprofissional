-- O público que a profissional declarou no onboarding do Scanner, espelhado
-- aqui pelo cron diário que já sincroniza o catálogo de produtos.
--
-- Por que espelhar em vez de buscar na hora: a geração semanal roda num cron
-- e não pode depender de uma chamada HTTP ao Hub no instante em que escreve o
-- post. É a mesma decisão de produtos_scanner, pelo mesmo motivo.
--
-- NULL é estado legítimo e o mais comum hoje: significa "ela não respondeu o
-- questionário", e aí a copy segue sem restrição, nunca com restrição
-- inventada.
--
-- Aditiva. Aplicada em produção em 25/09/2026.
alter table public.franqueadas
  add column if not exists publico_briefing jsonb,
  add column if not exists publico_briefing_em timestamptz;

comment on column public.franqueadas.publico_briefing is
  'Público declarado no onboarding do Scanner (quem atende, faixa etária, queixas, o que NAO atende). Espelho: a fonte é o Hub, via GET /api/integrations/marketing/publico. NULL = nao respondeu.';
