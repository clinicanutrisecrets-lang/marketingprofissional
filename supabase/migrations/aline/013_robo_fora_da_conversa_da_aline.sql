-- 🔴 O robô nunca entra numa conversa que a Aline está tendo.
--
-- Incidente de 22/09/2026: a Aline mandou uma mensagem pra Mariana Uchoa,
-- a Mariana respondeu "Meu sonhooooooo" — pra ELA — e o robô respondeu por
-- cima, oferecendo teste genético. A Aline apagou a mensagem.
--
-- O Instagram manda um "eco" (is_echo) de toda mensagem que sai da conta,
-- inclusive as que a Aline digita no celular. O código recebia esse eco e
-- DESCARTAVA — jogando fora exatamente o sinal que evitaria o incidente.
--
-- aline_falou_em guarda quando ela mesma escreveu naquela conversa. Com isso
-- preenchido, o robô não responde ali nunca mais: é conversa pessoal dela.
--
-- Para distinguir o eco DELA do eco do próprio robô, as mensagens de saída
-- passam a guardar o message_id devolvido pela Meta em external_id: eco com
-- id conhecido é nosso, eco com id desconhecido é ela digitando.
alter table aline.ig_contatos
  add column if not exists aline_falou_em timestamptz;

comment on column aline.ig_contatos.aline_falou_em is
  'Quando a dona do perfil escreveu ela mesma nesta conversa. Preenchido = o robô não responde mais aqui.';

create index if not exists ig_contatos_aline_falou_idx
  on aline.ig_contatos (perfil_id) where aline_falou_em is not null;
