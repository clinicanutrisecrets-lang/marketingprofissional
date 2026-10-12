# Calendário editorial do @scannerdasaude — as quatro primeiras semanas

Gravado em `aline.posts` do perfil `scannerdasaude` (`a092bdb6-…`) em 12/10/2026,
pelo script `supabase/dados/calendario-scanner-2026-10-12.sql`. A tela é
`studio.scannerdasaude.com/perfis/scannerdasaude/feed`. Este arquivo é a fonte que
sobrevive: mudou aqui, rode o script de novo (ele apaga só os posts que ele mesmo
criou, pelo `prompt_usado = 'calendario-scanner-2026-10-12'`, e só os que não foram
ao ar).

## Para quem é o perfil

O @nutri_secrets fala com a PACIENTE. O @scannerdasaude fala com a PROFISSIONAL.

| público | peso no calendário | o que ela quer ouvir |
|---|---|---|
| **Nutricionista** | 8 de cada 12 posts | paciente que não melhora, consulta que demora, exame pra digitar, como vender o teste genético |
| **Médico** | 2 de cada 12 | a mesma leitura de exame e genética, mais injetáveis, estoque e pedido de exame |
| **Outras profissões** (fisio, enfermeiro, farmacêutico, biomédico, dentista) | 1 de cada 12 | "isso também é pra mim?" — o sistema mostra só o que o conselho dela permite |
| **Todas** | 1 de cada 12 | o convite da conversa com o time |

## O teste de fracasso de todo post

> **"Isso eu já faço na planilha."**

Se a profissional pode dizer essa frase no fim, o post mostrou uma tarefa, não uma
mudança. Todo post termina numa coisa que ela NÃO consegue fazer sozinha hoje
(cruzar gene, exame e sintoma; mostrar o resultado pra paciente; saber o que a
medicação dela permite) ou num tempo que ela devolve pra própria vida.

## O molde

1. **A capa é a frase que ela diz no consultório**, não o nome do recurso.
   "Ela mandou 12 páginas de exame" e não "Leitura automática de PDF".
2. **Validar antes de mostrar.** Nenhum post diz que ela atende errado. O protocolo
   que não funcionou estava certo para OUTRA paciente.
3. **A tela de verdade.** Todo post de bastidor mostra o Scanner aberto (conta demo,
   paciente de exemplo Paula). Print ou gravação, nunca mockup inventado.
4. **Um ganho por post.** Um recurso, uma dor. Lista de funcionalidades não vende.
5. **O fim é convite**, e o envio nomeia uma colega concreta ("a colega que ainda
   digita exame à noite").

## Regras que valem aqui igual ao resto do projeto

- Zero travessão.
- Nunca "IA" nem "inteligência artificial", nunca estrelinha. É **algoritmo Scanner**.
  Se perguntarem direto no comentário: a parte operacional (ler PDF, gerar post) usa
  inteligência artificial; a correlação clínica é o algoritmo Scanner. Fornecedor
  nunca se nomeia.
- Nunca número que não está no banco ou no código. Preço só o que existe
  (planos a partir de R$ 97/mês). Nada de "X nutris usam", "Y% mais vendas".
- Conteúdo é EDUCAÇÃO PROFISSIONAL (exceção de 26/07 do CLAUDE.md do Scanner):
  falar de uma condição é permitido; prometer resultado de paciente não é.
- Depoimento só real e autorizado. Sem depoimento, mostra a tela.

## Ritmo

Três semanas ensinando, uma convidando. **Segunda, quarta e sexta às 12h** (hora do
almoço de quem atende; 15h UTC). Por semana: 2 carrosséis + 1 reel.
Stories todo dia útil: um bastidor curto da tela (15 s) + uma enquete
("você ainda digita exame?", "quanto tempo dura a sua primeira consulta?").

## Por que três por semana e não quatro

O perfil está parado. Constância vence volume: três que saem toda semana valem mais
que quatro que param na segunda semana. Subir pra quatro quando as artes estiverem
saindo sem atraso.

## As doze peças

| semana | dia | tipo | público | capa | o ganho |
|---|---|---|---|---|---|
| 1 (19/10) | seg | carrossel | nutri | Sua paciente fez tudo certo e não emagreceu. A culpa não é dela, nem sua | protocolo certo pra outra pessoa; gene, exame e sintoma juntos |
| 1 | qua | reel | nutri | Ela mandou 12 páginas de exame. Você ia digitar um por um? | sobe o PDF, o Scanner lê, você confere |
| 1 | sex | carrossel | nutri | MTHFR alterado não quer dizer a mesma coisa pra toda paciente | gene lido junto com homocisteína, B12 e folato |
| 2 (26/10) | seg | carrossel | nutri | Consulta de uma hora e meia e metade dela digitando | o tempo que volta |
| 2 | qua | reel | nutri | Tudo alterado no exame. Por onde você começa? | o Top 3 de prioridades |
| 2 | sex | carrossel | médico | Médico, a mesma paciente que melhora no papel e não na vida | Scanner médico: leitura de exame e genética + injetáveis e estoque |
| 3 (02/11) | seg | carrossel | nutri | Ferritina 30 é normal. Normal pra quem? | faixa do laboratório × faixa funcional, as duas na tela |
| 3 | qua | reel | nutri | A paciente toma Hidantal. E agora, o que você pode prescrever? | verificador de interações medicação × suplementos |
| 3 | sex | carrossel | outras profissões | Fisio, enfermeiro, farmacêutico, biomédico: o Scanner também é pra você | o sistema mostra o que o seu conselho permite |
| 4 (09/11) | seg | carrossel | nutri | O que muda quando a consulta começa pelo DNA da paciente | Consultório de Precisão: teste com logística, páginas montadas pelo time |
| 4 | qua | reel | nutri | Mostrar o teste genético pra paciente sem virar aula de genética | a Apresentação de Consulta Nutrigenômica |
| 4 | sex | carrossel | todas | Meia hora com o time pra ver onde o Scanner entra na sua rotina | o convite da conversa |

O texto completo de cada uma está na legenda do post no Studio.

## O que este calendário NÃO resolve sozinho

- **Arte.** Os posts nascem "em produção, sem arte ainda". Quem faz a arte é a
  próxima etapa (prints da conta demo + o modelo de carrossel).
- **Responder comentário e direct.** O robô do Instagram só responde quem tem papel
  no app da Meta enquanto a revisão não sai. Por isso o CTA é "link na bio", não
  "comenta SCANNER".
- **Publicar sozinho.** Depende de conectar o Instagram do Scanner no Studio
  (passo a passo no fim de `apps/aline/STUDIO-AUTOMACAO.md`).
