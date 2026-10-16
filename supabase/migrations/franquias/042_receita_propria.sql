-- "Esta é uma receita sua?" nas fotos de comida (Aline, 16/10/2026).
-- Sim: ela escreve ingredientes e modo de preparo, e a foto vira candidata ao
-- carrossel de SINERGIA da semana, no lugar das receitas do Lótus.
-- Não: a foto é só ilustrativa, pros posts de alimentação (como já era).
-- null = ainda não respondeu (segue ilustrativa).
-- Aditiva: sem estas colunas a sinergia segue com as receitas do Scanner.
alter table public.arquivos_franqueada
  add column if not exists eh_receita boolean,
  add column if not exists receita_ingredientes text,
  add column if not exists receita_modo_preparo text;
