-- ============================================================
-- MIGRATION 026: os 5 stories do teste genético na biblioteca
-- ============================================================
-- ✅ APLICADA EM PRODUÇÃO em 04/09/2026, depois do deploy READY do commit
-- af9116c e de conferir que as 5 artes respondem 200 em app.scannerdasaude.com.
--
-- 🔴 APLICAR SOMENTE DEPOIS DO DEPLOY do app (PR da coleção nutrigenética).
--
-- Motivo: quem filtra por produto é a TELA. O app que está no ar hoje lê a
-- biblioteca inteira sem olhar `colecao` nem `requer_scanner_produto` —
-- então, aplicado antes do deploy, este seed faria os 5 posts aparecerem
-- pra TODA franqueada (inclusive quem não vende teste genético) e com o
-- botão "Editar no Canva" quebrado, porque estes posts são arte pronta e
-- não têm modelo no Canva.
--
-- Depende da 025 (colunas colecao/imagem_url/requer_scanner_produto/slug).
-- As imagens são servidas pelo próprio app
-- (apps/franquias/public/biblioteca/nutrigenetica/) — sobem no MESMO deploy.

-- Liberados para quem tem teste genético ATIVO na Loja do Scanner
-- Tratamentos: DNA 360 e/ou Consulta Nutrigenética — as duas carregam
-- scanner_produto_id = 'teste_genetico'.
-- Idempotente por slug: rodar de novo atualiza legenda/arte.

INSERT INTO biblioteca_posts
  (slug, titulo, mes_ref, colecao, formato, canva_url, imagem_url,
   requer_scanner_produto, observacao, legenda, ordem, ativo)
VALUES
(
  'nutrigenetica-jornada-3-passos',
  'Chega de chutar: comece a sua jornada guiada com o DNA 360',
  'geral', 'nutrigenetica', 'story',
  NULL, '/biblioteca/nutrigenetica/jornada-3-passos.jpg',
  ARRAY['teste_genetico'], NULL,
  $legenda$Você já tentou várias coisas — e cada uma funcionou pra outra pessoa, não pra você.

Não é falta de disciplina. É que o seu corpo tem um jeito próprio de aproveitar nutrientes, de lidar com inflamação e de responder ao que você come.

O DNA 360 começa por aí, em 3 passos:

🧬 Passo 1 — mapeamos os seus genes com uma coleta simples, feita uma vez na vida.
🥗 Passo 2 — eu adapto a sua rotina ao que o mapa mostrou: comida, suplementação, horário, prioridade.
⭐ Passo 3 — você recebe o seu manual personalizado e passa a entender por que cada escolha está ali.

O teste não fecha diagnóstico. Ele entrega a informação que faz a conduta parar de ser tentativa.

Quer começar a sua jornada guiada? Comente DNA que eu te explico como funciona. ✨$legenda$,
  101, TRUE
),
(
  'nutrigenetica-manual-de-instrucoes',
  'De tentativas frustradas a dona do próprio corpo',
  'geral', 'nutrigenetica', 'story',
  NULL, '/biblioteca/nutrigenetica/manual-de-instrucoes.jpg',
  ARRAY['teste_genetico'], NULL,
  $legenda$De tentativas frustradas a dona do próprio corpo.

Toda dieta que você já fez foi escrita pra uma média. Nunca pra você.

O teste DNA 360 lê variações no seu DNA que ajudam a explicar como o seu corpo transforma o que chega: aproveitamento de vitaminas e minerais, resposta inflamatória, detoxificação, sensibilidade a gordura, a carboidrato, a cafeína.

Com esse mapa na mesa, a consulta muda de lugar: em vez de testar e esperar pra ver, a gente escolhe a partir do que o seu corpo já mostrou.

Uma coleta só, uma vez na vida — e um manual que continua servindo a cada novo exame e a cada fase que vier.

Comente MANUAL e eu te mando os detalhes. 🧬$legenda$,
  102, TRUE
),
(
  'nutrigenetica-nada-precisa-ser-chute',
  'Nada no seu corpo precisa ser um chute',
  'geral', 'nutrigenetica', 'story',
  NULL, '/biblioteca/nutrigenetica/nada-precisa-ser-chute.jpg',
  ARRAY['teste_genetico'], NULL,
  $legenda$Nada no seu corpo precisa ser um chute.

Nem o suplemento que a amiga indicou.
Nem a dieta que funcionou pra outra pessoa.
Nem o alimento que você cortou "por via das dúvidas" e nunca soube se precisava.

O teste nutrigenético mostra como o seu organismo funciona por dentro — e transforma palpite em conduta.

A coleta é simples: um swab na parte interna da bochecha, sem agulha, feito uma vez na vida. O resultado vira o meu ponto de partida pra montar o que é seu.

Quer entender o seu manual? Me chama aqui. 🧬$legenda$,
  103, TRUE
),
(
  'nutrigenetica-manual-do-metabolismo',
  'O manual de instruções do seu metabolismo',
  'geral', 'nutrigenetica', 'story',
  NULL, '/biblioteca/nutrigenetica/manual-do-metabolismo.jpg',
  ARRAY['teste_genetico'], NULL,
  $legenda$O manual de instruções do seu metabolismo existe. Ele só nunca te foi entregue.

O seu DNA carrega instruções sobre como o corpo aproveita cada nutriente, como lida com o excesso, o que ele pede mais e o que processa devagar.

Quando essas instruções entram na consulta, três coisas mudam:

• a suplementação para de ser genérica;
• a alimentação passa a respeitar o que o seu corpo já faz bem;
• o acompanhamento deixa de ser tentativa e vira estratégia.

Uma coleta, uma vez na vida, 100% focada no seu DNA.

Comente EU QUERO e eu te explico o passo a passo. 🧬$legenda$,
  104, TRUE
),
(
  'nutrigenetica-pov-encontrou-o-teste',
  'POV: você encontrou o teste que entrega o manual do seu metabolismo',
  'geral', 'nutrigenetica', 'story',
  NULL, '/biblioteca/nutrigenetica/pov-encontrou-o-teste.jpg',
  ARRAY['teste_genetico'],
  $obs$A foto é da Aline segurando o kit. Não publique como se fosse você: regrave com o seu kit, no seu cenário — a arte serve de referência de enquadramento e do texto na tela. A legenda pode ir igual.$obs$,
  $legenda$POV: você finalmente encontrou o teste que entrega o manual de instruções do seu metabolismo. 🧬

Não é mais um exame que devolve um número e te deixa sozinha com ele.

É um mapa que ajuda a explicar por que o seu corpo responde do jeito que responde — e que fica valendo pra vida toda, servindo de referência pra cada exame que você fizer daqui pra frente.

Se você já tentou de tudo e nada parecia ter sido feito pra você, é bem provável que faltasse justamente essa parte.

Comente POV que eu te conto como funciona. ✨$legenda$,
  105, TRUE
)
-- índice único é PARCIAL (slug IS NOT NULL) — a inferência precisa repetir o predicado.
ON CONFLICT (slug) WHERE slug IS NOT NULL DO UPDATE SET
  titulo                 = EXCLUDED.titulo,
  mes_ref                = EXCLUDED.mes_ref,
  colecao                = EXCLUDED.colecao,
  formato                = EXCLUDED.formato,
  canva_url              = EXCLUDED.canva_url,
  imagem_url             = EXCLUDED.imagem_url,
  requer_scanner_produto = EXCLUDED.requer_scanner_produto,
  observacao             = EXCLUDED.observacao,
  legenda                = EXCLUDED.legenda,
  ordem                  = EXCLUDED.ordem,
  ativo                  = EXCLUDED.ativo;
