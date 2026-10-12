-- Calendário do @scannerdasaude (4 semanas, 12 posts). Fonte: docs/CALENDARIO-SCANNER.md
-- Idempotente: apaga só o que este script criou e que não foi ao ar, e insere de novo.
-- Sem ponto e vírgula dentro das legendas (o MCP do Supabase trava com isso).

delete from aline.posts
 where perfil_id = 'a092bdb6-6b9d-437c-8773-459fb03ff1cd'
   and prompt_usado = 'calendario-scanner-2026-10-12'
   and data_hora_postada is null
   and instagram_post_id is null;

insert into aline.posts
  (perfil_id, semana_ref, tipo, status, origem, aprovacao_tipo, midia_pendente,
   pilar, angulo, data_hora_agendada, copy_legenda, copy_cta, prompt_usado)
select 'a092bdb6-6b9d-437c-8773-459fb03ff1cd', semana::date, tipo, 'aguardando_midia', 'manual_aline',
       'bloco_semanal', true, pilar, angulo, quando::timestamptz, legenda, cta, 'calendario-scanner-2026-10-12'
from (values
('2026-10-19','feed_carrossel','dor da nutri','protocolo genérico × individualidade','2026-10-19 15:00+00',
$$Sua paciente fez tudo certo e não emagreceu. A culpa não é dela, nem sua
Ela seguiu o cardápio. Você montou um bom plano. E a balança não andou.
O plano não estava errado. Ele estava certo para outra pessoa.
Duas pacientes com o mesmo peso e o mesmo exame podem ter máquinas diferentes: uma tem a matéria-prima em falta (vitaminas e minerais no exame), outra tem o maquinário mais lento (as variações genéticas), outra tem a logística travada (intestino e inflamação).
O Scanner cruza os três com os sintomas do questionário e mostra qual setor da fábrica trava ESTA paciente.
Envia pra colega que já trocou três vezes o cardápio da mesma paciente.$$,
'Teste o Scanner pelo link na bio.'),
('2026-10-19','reels','bastidor','leitura do PDF de exame','2026-10-21 15:00+00',
$$Ela mandou 12 páginas de exame. Você ia digitar um por um?
Roteiro do reel: abre o PDF de 12 páginas na tela. Corta para o Scanner: sobe o arquivo, os marcadores aparecem com valor, unidade e referência do laboratório. Você confere e corrige o que quiser antes de salvar.
Fala final: a noite que você passava digitando exame agora é sua.
Envia pra colega que ainda digita exame à noite.$$,
'Link na bio.'),
('2026-10-19','feed_carrossel','ciência aplicada','MTHFR × homocisteína × B12 × folato','2026-10-23 15:00+00',
$$MTHFR alterado não quer dizer a mesma coisa pra toda paciente
O gene sozinho é só uma parte da história. A variação muda a velocidade de uma etapa da metilação, que é parte do maquinário da fábrica.
O que diz se essa etapa está pesando HOJE é o resto: homocisteína, B12, folato e o que ela sente.
Gene alterado com homocisteína ideal é uma conduta. Gene alterado com homocisteína alta e cansaço é outra.
É essa leitura que o Scanner faz junto: gene, exame e sintoma na mesma tela, e as formas ativas das vitaminas já na prescrição.
Envia pra colega que atende paciente com o laudo genético na mão e não sabe por onde começar.$$,
'Salva este post para a próxima paciente com MTHFR.'),
('2026-10-26','feed_carrossel','dor da nutri','tempo de consulta','2026-10-26 15:00+00',
$$Consulta de uma hora e meia e metade dela digitando
Digitar exame. Somar caloria do cardápio. Montar prescrição. Escrever orientação. Formatar PDF.
Nada disso é o que a paciente veio buscar. Ela veio pela sua leitura do caso dela.
No Scanner o exame entra pelo PDF, o cardápio já sai com calorias e micronutrientes, a prescrição sai agrupada por cápsula e o PDF sai com a sua marca.
Você revisa. A decisão continua sendo sua.
Envia pra colega que termina a consulta e ainda tem uma hora de trabalho pela frente.$$,
'Link na bio.'),
('2026-10-26','reels','bastidor','Top 3 de prioridades','2026-10-28 15:00+00',
$$Tudo alterado no exame. Por onde você começa?
Roteiro do reel: mostra uma paciente com exame, teste genético e questionário. Clica em gerar a análise. Aparecem as três prioridades, cada uma com os genes, os exames e os sintomas que sustentam a escolha.
Fala final: quando tudo está alterado, a pergunta não é o que está errado. É o que, se melhorar primeiro, puxa o resto junto.
Envia pra colega que trava diante de um exame todo vermelho.$$,
'Link na bio.'),
('2026-10-26','feed_carrossel','médico','Scanner médico','2026-10-30 15:00+00',
$$Médico, a mesma paciente que melhora no papel e não na vida
O exame normalizou. Ela continua cansada.
O que costuma faltar não é mais um exame. É cruzar o que já existe: a genética, o exame funcional e o que ela sente.
O Scanner médico faz essa leitura e ainda organiza a parte da sua rotina que nenhum outro sistema cobre junto: prescrição de injetáveis, estoque com lote e validade, pedido de exame e a equipe da clínica com permissões.
Envia pro colega médico que trabalha com medicina integrativa.$$,
'Conheça o Scanner médico pelo link na bio.'),
('2026-11-02','feed_carrossel','ciência aplicada','faixa do laboratório × faixa funcional','2026-11-02 15:00+00',
$$Ferritina 30 é normal. Normal pra quem?
A faixa do laboratório diz se o valor está dentro do esperado para a população. Ela não diz se está bom para a sua paciente.
Ferritina é parte da matéria-prima da fábrica. Com o estoque baixo, a energia cai antes de o hemograma acusar.
No Scanner as duas faixas aparecem lado a lado: a do laboratório e a funcional, que muda com sexo, idade, fase do ciclo e gestação.
Envia pra colega que já ouviu da paciente que o exame dela deu tudo normal.$$,
'Salva para a próxima vez que o exame der tudo normal.'),
('2026-11-02','reels','bastidor','verificador de interações','2026-11-04 15:00+00',
$$A paciente toma Hidantal. E agora, o que você pode prescrever?
Roteiro do reel: a nutri digita a medicação que não conhece. O Scanner explica que é fenitoína, mostra as depleções conhecidas e dá o veredito de cada suplemento da prescrição: manter, ajustar o horário, cautela ou trocar.
Fala final: a medicação é decisão do médico. O que você prescreve ao lado dela é seu, e agora você prescreve sabendo.
Envia pra colega que já travou diante de uma medicação desconhecida.$$,
'Link na bio.'),
('2026-11-02','feed_carrossel','outras profissões','o sistema segue o conselho','2026-11-06 15:00+00',
$$Fisio, enfermeiro, farmacêutico, biomédico: o Scanner também é pra você
O exame, a genética e o questionário da sua paciente contam a mesma história, seja qual for a sua profissão.
No cadastro você escolhe a sua profissão e o Scanner mostra o que o seu conselho permite. Leitura de exame, teste genético e acompanhamento valem para todas. Prescrição de suplementos aparece para quem o conselho autoriza.
Os documentos saem com o seu registro e o seu conselho.
Envia pra colega de outra profissão que trabalha com saúde integrativa.$$,
'Link na bio.'),
('2026-11-09','feed_carrossel','convite','Consultório de Precisão','2026-11-09 15:00+00',
$$O que muda quando a consulta começa pelo DNA da paciente
A primeira consulta deixa de ser tentativa. Você já sabe qual setor da fábrica tende a travar.
No Consultório de Precisão o teste genético vai com logística pronta: a paciente compra pela sua página, o kit chega na casa dela, o laudo cai no seu sistema.
Suas páginas de venda são montadas pelo nosso time a partir das suas respostas. Você revisa e começa a vender.
Envia pra colega que quer começar a trabalhar com nutrigenética.$$,
'Conheça o Consultório de Precisão pelo link na bio.'),
('2026-11-09','reels','bastidor','Apresentação de Consulta Nutrigenômica','2026-11-11 15:00+00',
$$Mostrar o teste genético pra paciente sem virar aula de genética
Roteiro do reel: tela cheia com a Apresentação de Consulta Nutrigenômica. Passa pelos slides: os genes que mais pesam para ela, o que cada um faz na fábrica, o que fazer com isso no prato.
Fala final: a paciente não precisa entender genética. Ela precisa entender o corpo dela. E sair da consulta querendo começar.
Envia pra colega que já fez uma devolutiva de teste e sentiu a paciente boiando.$$,
'Link na bio.'),
('2026-11-09','feed_carrossel','convite','conversa com o time','2026-11-13 15:00+00',
$$Meia hora com o time pra ver onde o Scanner entra na sua rotina
Você conta como atende hoje. A gente mostra, na tela, o que o Scanner tira das suas costas e o que acrescenta à sua consulta.
Sem compromisso de assinar. Planos a partir de R$ 97 por mês.
Envia pra colega que vive dizendo que precisa organizar o consultório.$$,
'Agende a conversa pelo link na bio.')
) as v(semana, tipo, pilar, angulo, quando, legenda, cta);
