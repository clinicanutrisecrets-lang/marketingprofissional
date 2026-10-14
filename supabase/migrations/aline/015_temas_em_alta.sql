-- Radar de temas em alta do Studio (Aline 14/10/2026: "é o seu trabalho
-- procurar coisas em alta"). Um lote por perfil por dia, montado pelo cron
-- /api/cron/temas-em-alta. Aditiva. Só a chave de serviço lê e escreve.
create table if not exists aline.temas_em_alta (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references aline.perfis(id) on delete cascade,
  data_ref date not null,
  manchete text not null,
  fonte text,
  url text,
  fato text not null,
  angulo text not null,
  assunto text not null,
  relevancia int not null default 5,
  post_id uuid references aline.posts(id) on delete set null,
  descartado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index if not exists temas_em_alta_perfil_data on aline.temas_em_alta (perfil_id, data_ref desc);
create unique index if not exists temas_em_alta_perfil_manchete on aline.temas_em_alta (perfil_id, manchete);
alter table aline.temas_em_alta enable row level security;
