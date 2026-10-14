-- "Minhas fotos" descritas pelo conteúdo (Aline, 14/10/2026: "se o
-- profissional sobe foto dele, o sistema consegue usar no slide que tem
-- condizente?"). Ao subir, o sistema descreve a foto e marca os assuntos e a
-- altura do rosto; a montagem da semana escolhe a foto pelo texto do slide.
-- Aditiva: sem estas colunas o código segue com o rodízio de sempre.
alter table public.arquivos_franqueada
  add column if not exists assuntos text[],
  add column if not exists descricao_auto text,
  add column if not exists foco_y numeric,
  add column if not exists descrito_em timestamptz;
