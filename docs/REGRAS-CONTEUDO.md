# Regras de conteúdo — Nutri Secrets

Regras que a Aline corrigiu à mão mais de uma vez. Estão escritas aqui para que
carrossel e vídeo nasçam certos e ela pare de revisar as mesmas coisas.

Vale para a skill `nutri-secrets-carrossel`, para o gerador de posts do app das
franqueadas e para quem estiver mexendo no corte de vídeo.

---

## 1. Carrossel

### 1.1 A capa é uma IDENTIDADE, não um assunto

Título de assunto gera salvamento. **Título de identidade gera envio** — e envio
é o sinal que leva o post a quem ainda não segue.

A leitora não pensa "isso é interessante", pensa **"isso sou eu"**, ou
**"isso é a minha irmã"**, e manda.

A fórmula tem quatro partes, nesta ordem:

**Capa: identidade + tempo.**
> Cansada há mais de 2 anos.

Quem ela é, e há quanto tempo. O tempo é o que transforma queixa em identidade.

**Subtítulo: a sequência vivida, na ordem em que dói.**
> Seu corpo está pedindo ajuda, você tenta mas se frustra. E o cansaço só aumenta.

Descreve a experiência, não o mecanismo. **Sem número e sem termo técnico aqui.**

**Terceira linha: a promessa, citando a frase que ela diz para si mesma.**
> Vou te contar por que você não deve dizer: "faz parte, tenho que me acostumar".

Repetir a frase da resignação é a parte mais forte. A pessoa se vê sendo citada.

**O número entra depois, na virada. Nunca na capa.**

### 1.2 O visual é o da marca, não editorial preto e branco

A **estrutura** acima é emprestada de posts que funcionam. O **visual não é.**

- Fundo em **cor da marca**, nunca branco com texto preto
- **Traços de line art** como decoração, usando a biblioteca que já existe
  (`packages/ai-image/src/lineArt.ts`, `ILUSTRACOES_DISPONIVEIS` e
  `sugerirIlustracao`)
- Paleta e mini-logo conforme a skill `nutri-secrets-carrossel`

Carrossel em preto e branco puro está **fora do padrão**.

### 1.6 Sobrepor público, em vez de triar

O mesmo carrossel serve paciente e profissional **na mesma peça**, sem precisar
separar por palavra-chave.

- A **capa e o subtítulo** falam com a paciente: identidade, sequência vivida,
  a frase que ela diz para si mesma.
- O **prêmio do final** serve ao profissional: é o que ele salva para usar.

A paciente se reconhece e leva a pergunta ao profissional dela. O profissional
salva. Um post, dois públicos, nenhuma triagem.

### 1.7 A sinergia é o prêmio, e ela sempre explica o PORQUÊ

A última lâmina de valor é a **sinergia**, e ela é o que faz o post ser salvo.

**Nunca listar combinação sem o mecanismo.** A regra é sempre:

> [Composto A] + [Composto B] → porque [o que A faz com B]

Falar em **composto bioativo e nutriente**, não em alimento genérico. É o que
separa "coma maçã" de nutrição: quem trabalha é a pectina e a quercetina, e o
alimento é como elas chegam na mesa (ver o dicionário da Fábrica).

Dose específica só com aviso de individualização. Fórmula com miligramas para
público leigo é terreno de farmacêutico, não de nutricionista.

O prêmio que ninguém mais tem: **a leitura da Fábrica** — onde aquela queixa
costuma nascer, e o que olhar antes de conduzir. Para o profissional isso é tão
salvável quanto uma fórmula.

### 1.8 Etiqueta de série na capa

Toda capa declara a que série pertence, numa linha pequena em cima:

> CANSAÇO · VOLUME 1
> PERIMENOPAUSA · O QUE O EXAME NÃO MOSTRA

É o que faz quem gostou de um post procurar os outros, em vez de voltar para o
feed. Resolve a permanência sem depender de "veja mais no perfil".

### 1.9 Post fixado de boas-vindas

Um dos três fixados é sempre de recepção, para quem chega pela primeira vez:
quem é a Aline, o que ela investiga, e por onde começar. É o que atende quem
vem de anúncio e não sabe onde pisou.

### 1.3 Contraste: o Tiffany é fundo, nunca cor de letra

Medido pela régua da WCAG sobre os HEX oficiais:

| Combinação | Razão | Serve para |
|---|---|---|
| Dark teal sobre branco | 8,10:1 | qualquer texto |
| Dark teal sobre bege | 6,61:1 | qualquer texto |
| Magenta sobre branco | 4,62:1 | qualquer texto |
| Magenta sobre bege | 3,77:1 | só título grande |
| Dark teal sobre Tiffany | 3,36:1 | só título grande |
| Branco sobre Tiffany | 2,41:1 | **reprova** |
| Tiffany como letra sobre branco ou bege | 2,41:1 e 1,97:1 | **reprova** |

O Tiffany tem claridade parecida com a do branco e a do bege, e duas cores de
claridade próxima não se separam em tela pequena.

### 1.4 Formato e ritmo

- **1080 × 1350 (4:5).** Quadrado desperdiça um quarto da altura de tela.
- A grade do perfil corta para 3:4: nada essencial encostado na borda lateral.
- Margem interna de 100 px.
- **Sete a nove lâminas.** A **terceira** é a de maior risco de abandono: é
  onde vai a virada, não a parte explicativa.
- **Uma ideia por lâmina.** Duas listas seguidas é onde o carrossel vira lista.
- Cada lâmina termina devendo alguma coisa à seguinte.

### 1.5 Tipografia

Três tamanhos, e só. Valores para a peça de 1080 × 1350:

- **Capa:** 90 a 130 px, duas ou três linhas no máximo
- **Título de miolo:** 60 a 72 px — é onde mora o número
- **Corpo:** nunca abaixo de 44 px, linha de 20 a 30 caracteres

Peso, tamanho e contraste decidem legibilidade, nessa ordem. A escolha da fonte
vem depois dos três.

---

## 2. Vídeo

### 2.1 Rosto falando é a base; b-roll é o corte de retomada

Para conteúdo que ensina, **o rosto falando sustenta mais tempo de tela do que
imagem bonita**. Contato visual e fala real seguram; b-roll como camada principal
não segura.

A biblioteca de b-roll não é a base do vídeo. Ela é o que **reseta a atenção**.

### 2.2 Um corte a cada 2 a 4 segundos

Depois de 12 a 15 segundos de quadro parado, parte da audiência rola a tela.
Qualquer coisa serve como corte: close, b-roll de dois segundos, gráfico na
tela, mudança de ângulo.

Um caso citado mostra o tamanho do efeito: cortes a cada 2,8 segundos, gancho
ajustado e CTA claro levaram a duração média assistida de **41% para 58%**, com
**salvamentos subindo 211%**.

### 2.3 A promessa nos dois primeiros segundos

O tempo médio assistido de Reels é de **8,5 segundos** (Metricool, 24,4 milhões
de posts). Sem "oi gente", sem contextualizar antes de entregar. O dado entra
antes do argumento.

### 2.4 Legenda

- **Duas linhas curtas** ganham de bloco denso que cobre meia tela
- Fonte grande, contraste alto
- **Sem sombra.** Sombra borra a letra em tela pequena, e é o erro mais comum

### 2.5 Duração

7 a 15 segundos para trend, 30 a 90 para conteúdo que ensina. Mas a duração não
decide nada sozinha: **conta o total de segundos assistidos**. Um vídeo de 45
segundos que dois terços terminam rende mais que um de 15 que todos terminam.

---

## 3. O que vale para os dois

- **Escrever para o ENVIO, não para a curtida.** Curtida distribui para quem já
  segue; envio no direct é o que atravessa para quem não segue. Uma frase por
  peça que faça a leitora pensar em uma pessoa concreta.
- **Nunca dizer "IA" ou "inteligência artificial".** Usar "algoritmo Scanner".
- **Processo funcional, nunca nome de doença como diagnóstico** (regra do CFN).
- **Sem promessa de prazo** ("em 7 dias", "em 2 horas") e sem polêmica.
- 🔴 **NUNCA falar de agrotóxico**, em post nenhum (Aline, 08/09/2026). É tema
  polêmico, divide a audiência e desvia a conversa do que ela tem a dizer.
  Vale para pesticida, veneno, "fruta suja", listas de resíduo e variações.
  E há um erro técnico junto, que quase entrou num post: **agrotóxico
  sistêmico vem desde a semente**, absorvido pela planta. Lavar, deixar de
  molho em bicarbonato ou descascar **não resolve** o sistêmico, só o resíduo
  de superfície. Prometer que resolve é afirmação falsa.
- **Motivo de hábito ganha de motivo polêmico.** No post da maçã, a frase da
  resignação virou *"a casca eu não como, nunca comi"* justamente por isso:
  descreve o que a maioria de fato faz, e não abre uma discussão que não é a
  da Aline.
- **Nada de xilitol, maltitol ou adoçante artificial** em receita ou copy.
- Termo técnico **sempre com tradução prática ao lado**, no padrão do dicionário
  da Fábrica (capacetinho, vassourinha, os quatro setores).


## 6. A Fábrica entra em TODO texto, sempre colada na tradução

Regra dada pela Aline em 08/09/2026, corrigindo um post que usava a palavra
"setor" sozinha numa validação. A observação dela: *"a fábrica e o dicionário
têm que ser explicados em todo texto até educar. Exemplo: vai falar da
ferritina, aí fala a ferritina, que é como se fosse uma parte da matéria-prima
da sua fábrica de saúde."*

**Nunca a palavra sozinha.** O padrão é sempre `termo + tradução`, na mesma
frase:

| ❌ Nu | ✅ Colado |
|---|---|
| "a ferritina" | "a ferritina, que é uma parte da **matéria-prima** da sua fábrica de saúde" |
| "é da logística" | "é da **logística**, que é o intestino e o que ele deixa passar" |
| "certo para o setor errado" | "certo **para outra pessoa**" (aqui o que entra é a individualidade) |
| "isso é maquinário" | "isso é **maquinário**, que é o jeito como a sua fábrica foi montada: a sua genética" |

🔴 **A pessoa não aprende o vocabulário porque leu uma vez o post do
dicionário.** Ela aprende porque encontra a palavra **toda vez**, sempre com a
explicação do lado, até o dia em que usa a palavra sozinha. Aí ela virou
leitora da Aline, e não leitora de qualquer nutricionista. É por isso que a
repetição com tradução não é redundância: **é o mecanismo.**

Vale também para a **etiqueta de série** na capa (§1.8): ela nomeia os dois
lados, `LOGÍSTICA · O INTESTINO`, `MAQUINÁRIO · A SUA GENÉTICA`, em vez de só
a palavra da casa.

## 7. Validar é não invalidar NADA no caminho

Também de 08/09/2026, e são duas correções seguidas dela no mesmo post.

O post valida a leitora e, sem perceber, tira a razão de outra pessoa: de quem
indicou o tratamento, do médico que pediu o exame, da amiga que sugeriu. Toda
vez que isso acontece, o post perde a leitora junto.

| ❌ Invalida | ✅ Soma |
|---|---|
| "Peça ferritina, **não** hemograma" | "Peça ferritina **além** do hemograma. Ele não está errado, responde outra pergunta." |
| "O tratamento estava errado" | "O tratamento estava certo **para outra pessoa**." |
| "Você tomou magnésio errado" | "Você tomou magnésio; o seu corpo é que recebeu pouco." |

🔴 **A individualidade é o que entra no lugar da culpa.** É a coisa mais
alinhada com quem ela é (mestrado em genética, o olhar multidisciplinar de
§4.4) e é o argumento do produto: não existe conduta certa no vácuo, existe
conduta certa **para aquela pessoa**.

## 8. O envio descreve o traço, não o rótulo

Correção dela no envio de um post: *"Manda para alguém que não tem problema em
iniciar o sono, mas acorda já cansada"* no lugar de "manda para a amiga que
dorme bem e acorda pior".

Quanto mais **específico e observável** o traço, mais a leitora vê o rosto de
alguém. Rótulo genérico ("quem vive cansada") não faz ninguém pensar em
ninguém. Comportamento descrito ("não tem problema em iniciar o sono, mas
acorda já cansada") faz.


## 9. Para quem é escrito (o público real, dito por ela em 08/09/2026)

Palavras dela: *"pessoas já conscientes do que é saudável, que já tomam
suplementos, mas frustradas que mesmo indo em médicos e nutris não melhoram."*

🔴 **Não é conteúdo de iniciante, e essa é a correção mais cara desta rodada.**
Metade da primeira versão do calendário explicava coisa que essa leitora já
sabe ("coma a fruta com casca", "beterraba faz bem"). Post que ensina o básico
para quem já passou do básico é lido como raso, e ela desliza.

O que essa leitora precisa não é saber que precisa comer bem. É entender **por
que o que ela já faz certo não está funcionando**. Consequências:

- **A validação nunca soa a lição.** Ela fez tudo certo mesmo. A peça que
  faltou não era dela: era de quem montou o conjunto.
- **A frustração dela tem endereço:** já foi a médico, já foi a nutricionista,
  já gastou com suplemento. O post não pode repetir o que esses já disseram.
- **O tchan tem que ser uma camada que ninguém deu.** Se é algo que a
  nutricionista dela já falou, o post não vale.

## 10. As quatro lentes. Todo post declara a sua.

A expertise da Aline, nas palavras dela: *"sinergia, biodisponibilidade,
alquimia de compostos bioativos, poder terapêutico dos alimentos, nutrição de
precisão, e correlação de sintomas e exames para causa raiz, tipo detetive
juntando as peças do quebra-cabeça."*

Isso não é bio de perfil: é a **régua de cada post**. Todo post é conduzido por
uma destas quatro, e ela vira etiqueta na peça:

| Lente | A pergunta que ela faz | Exemplo |
|---|---|---|
| **Biodisponibilidade** | o que entra, não o que você come | curcumina lipossolúvel sem gordura não chega; magnésio óxido não atravessa |
| **Sinergia** | o que só funciona acompanhado | vitamina C que converte o ferro; vitamina E que impede o lipossolúvel de oxidar |
| **Correlação exame × sintoma** | o que um número esconde | ferritina no limite com PCR alta é ferritina inflada, não estoque bom |
| **Causa raiz** | onde aquilo nasce | o mesmo cansaço nascendo em quatro setores, cada um com conduta oposta |

**Composto sozinho continua não sendo post** (§5.1). O que mudou é que agora
está nomeado *qual* cruzamento está sendo feito.

## 11. Todo mecanismo termina em "para QUEM isto serve"

Correção dela sobre o post da beterraba, e é generalizável: *"óxido nítrico
ajuda a proteger suas artérias para quem tem pressão alta, melhora a energia e
disposição, ajuda quem tem lipedema e varizes. Entende a diferença de aplicação
e identificação?"*

| ❌ Mecanismo sem endereço | ✅ Mecanismo com endereço |
|---|---|
| "o óxido nítrico relaxa a parede do vaso" | "protege a artéria de **quem tem pressão alta**, melhora **energia e disposição**, e ajuda **quem convive com varizes e lipedema**" |

🔴 **Mecanismo bonito não identifica ninguém.** Quem se reconhece é quem viu a
própria situação escrita. E identificação é o que produz o envio (§5.5): a
leitora com varizes manda para a irmã com varizes.

Vale para todo composto: depois de explicar o que ele faz, nomear **as pessoas
para quem aquilo muda alguma coisa**. Três ou quatro perfis, sem diagnosticar
ninguém (§5.4b: falar da população é educação; dizer "você tem" é diagnóstico).

## 12. Todo post abre com uma CENA

*"posts que criam storytelling"*. A cena é uma pessoa concreta que já fez tudo
certo, em duas frases, antes de qualquer explicação:

> *"Ela me mandou a foto da bancada antes da consulta. Nove potes. Todos bem
> indicados, um por um, por profissionais diferentes, em anos diferentes.
> Nenhum deles conversando com o outro."*

Sem nome, sem dado que identifique, sem diagnóstico. É o que faz a leitora
sentar para ler, e é o que separa carrossel de aula de carrossel de história.

## 13. Continuidade: prometer o próximo post, e cumprir

Também de 08/09. No post da beterraba ela pediu que a diferença entre o nitrato
dos vegetais e o nitrito conservante dos embutidos fosse **mencionada e
adiada**: *"que é outra história, depois a gente conta"*.

Isso faz três coisas ao mesmo tempo: evita o mal-entendido na hora, mostra que
existe mais camada onde a leitora achava que não tinha, e **cria motivo para
ela voltar**. É a versão honesta do gancho, porque a promessa é de conteúdo, não
de resultado.

🔴 **O que é prometido tem que entrar no calendário do mês seguinte.** Promessa
não cumprida é pior que promessa não feita.


## 14. Mini solução é algo que ela FAZ e SENTE. Tarefa não é mini solução.

Correção da Aline em 08/09/2026: *"lembra que a gente entrega sempre uma mini
solução? Você não entregou nenhuma mini solução aqui."* O que estava escrito era
"peça homocisteína", "peça insulina de jejum", "escreva os seus sintomas".

| ❌ Tarefa | ✅ Mini solução |
|---|---|
| "Peça o exame X" | Vitamina C na MESMA garfada do feijão; café só uma hora depois do almoço; laticínio em outra refeição |
| "Anote os seus sintomas" | Último café antes das 14h por 15 dias, e repare no sono e na tarde |
| "Leve ao seu médico" | Proteína no café da manhã: a fome das dez muda de tamanho |
| "Confira o seu laudo" | Folha verde escura CRUA todo dia; vire o pote e veja se é ácido fólico ou metilfolato |

O teste é simples: **ela consegue fazer amanhã, sozinha, sem gastar, e percebe
alguma diferença?** Se depende de terceiro, de dinheiro ou de exame novo, é
tarefa. Tarefa não constrói a crença de que o resto funciona.

## 15. 🔴 NUNCA mandar a leitora de volta ao profissional dela

Também de 08/09, e é a correção mais cara desta rodada: *"se ele já foi na
pessoa que acompanha e a pessoa disse que está normal, pra que que ele vai levar
lá? Vai ficar parecendo que a gente quer que ele confronte."*

"Leve essa pergunta para quem te acompanha" faz **duas** coisas ruins de uma vez:
pede que ela confronte alguém em quem confia, e **devolve o lead para outra
pessoa**. O post perde o foco do produto.

A estrutura correta do fim de todo post é sempre esta, nesta ordem:

1. **Faça isto hoje, sozinha** (a mini solução de §14)
2. **O que eu faço na consulta é…** (a pergunta que sobrou)
3. **O envio** (§8)

## 16. A lâmina 7 é a que decide se ela passa

Depois da abertura fixa da série, a primeira lâmina própria do post não anuncia
o assunto: ela **cria dívida**. A fórmula, ditada por ela:

> identificação + a frustração com o NOME CERTO + a promessa de uma descoberta

| ❌ Constatação | ✅ Dívida |
|---|---|
| "Está tudo normal." | *"Mesmo comendo saudável, e mesmo tendo feito exame de sangue onde o profissional disse que estava tudo normal, você volta pra casa com a mesma frustração: não saber mais o que fazer. Se esse é o seu caso, tem uma coisa no seu exame que ninguém te mostrou."* |

🔴 **Toda lâmina termina devendo alguma coisa à seguinte.** Se a leitora pode
parar ali satisfeita, ela para, e o conteúdo que a gente quer mostrar não é visto.

## 17. Escrever com as palavras DELA, não com as minhas

*"Que que é 'cansaço inteiro'? Essa não é palavra que a pessoa usa."*

Frase bonita que ninguém fala não gera reconhecimento, e sem reconhecimento não
há envio (§5.5). O vocabulário real da leitora:

> "não saber mais o que fazer" · "travar" · "voltar tudo" · "ler o mesmo
> parágrafo três vezes" · "esquecer o que foi buscar" · "já tentei de tudo" ·
> "cinco potes na bancada" · "cocô caro"

## 18. Número que impressiona é PROPORÇÃO, nunca "pelo menos um"

Correção dela sobre uma versão anterior deste calendário: *"as pessoas tinham
pelo menos um marcador fora do ideal? Ué, então os outros todos estavam
alterados, coitada dessa pessoa. Daí qualquer médico ou nutricionista teria
visto."*

🔴 **"Pelo menos um" não prova nada e ainda insinua que o profissional anterior
foi desatento.** O que prova é a fatia: *"de cada dez marcadores que PASSARAM
como normais, quatro não estavam no ponto."*

Vale para todo número de post: dizer **que parte do todo**, não que existiu ao
menos um caso.

## 19. As duas réguas do exame, sempre com os dois nomes

O vocabulário que sustenta o post do exame, e que impede a leitura de "o
laboratório errou":

- **Faixa de referência** — a impressa ao lado do resultado. Foi construída para
  separar quem está doente de quem não está, e é ótima nisso. O médico está
  certo em usá-la.
- **Faixa ideal** — o intervalo onde aquele marcador de fato trabalha bem.
  Ninguém imprime essa.

> Estar na primeira quer dizer que **você não está doente**. Não quer dizer que
> **você está bem**.

Dizer as duas em toda peça é o que mantém a §7 (validar sem invalidar ninguém).

## 20. Os números medidos da base clínica (08/09/2026)

Levantados no banco de produção do Scanner. **Não re-medir por chute e não
arredondar pra cima.** Se a base cresceu, medir de novo e atualizar AQUI.

| Número | O que é | Base |
|---|---|---|
| **43,7%** | mediana da fatia do exame que passou como normal e estava fora da faixa ideal, no grupo do cansaço | 56 pacientes com ≥ 8 marcadores avaliáveis |
| **42,3%** | a mesma mediana na base inteira | 204 pacientes |
| **7,5%** | dos pacientes com cansaço tinham o laudo REALMENTE limpo (média de 6 alterados por pessoa) | 80 pacientes |
| **68 / 26** | variações de risco que a pessoa do meio carrega, e quantas de risco alto | 161 pacientes com teste |
| **11 de 161** | não tinham nenhuma variação de risco | 161 |
| **38,5% × 5,5%** | causa raiz no maquinário, com teste × sem teste | análises da plataforma |
| **1 de 14** | pacientes que chegaram culpando o metabolismo e em quem a causa estava mesmo lá (em 8 estava na matéria-prima) | 14 |
| ferritina 57% · T4 livre 65% · estradiol 67% | dos "normais" desses marcadores estavam fora da faixa ideal, no grupo do cansaço | 26 a 53 medições cada |

🔴 **Três cuidados ao usar:**
1. **É a base dela, não a literatura.** "Nos meus atendimentos", "fui contar nos
   meus". Nunca "a ciência mostra".
2. **Hemograma diferencial, plaquetas e vitamina A ficaram FORA da conta** — o
   mesmo marcador chega em unidade diferente conforme o laboratório (percentual
   num, absoluto no outro) e comparar os dois inflava o resultado. Sem eles o
   número caiu de 47% para 41%, e é o de 41% que vale.
3. **O sintoma foi minerado do texto dos questionários**: é menção, não
   gravidade. "Dos que relatam cansaço" é honesto; "dos que sofrem de cansaço
   crônico" não é.


## 21. A validação não pode FECHAR o slide

Correção da Aline em 08/09/2026 sobre a lâmina que dizia *"o médico está certo em
usá-la"*: *"a pessoa vai parar ali. Você está falando que ele está certo, então
ela não continua."*

Concessão verdadeira é boa e é obrigatória (§7). Mas ela é um **ponto final**: a
leitora concorda, relaxa e para de arrastar. A validação tem que carregar o "mas"
**dentro dela**, na mesma respiração.

| ❌ Fecha | ✅ Valida e continua devendo |
|---|---|
| "Ela é ótima nisso, e o médico está certo em usá-la." | **"Ninguém está errado em usar ela. Ela só não foi feita pra você."** Foi feita pra quem está doente. Não pra quem não está doente e mesmo assim não está bem, que é exatamente onde você está. |
| "A faixa de referência não serve." | "Ela não é imprecisa: ela é **precisa para outra pergunta**." |

🔴 **Nenhuma lâmina pode terminar num lugar onde a leitora fica satisfeita.**

## 22. Todo post diz, escancarado, O QUE ISSO CUSTA

*"Essa tentativa e erro está custando o quê pro meu paciente? Não é só uma noite
mal dormida."*

O número prova o problema. **O custo é o que faz agir.** E o custo nunca é o
sintoma: é o que o sintoma tira da vida dela, escrito com o tema daquele post.

- Cansaço: chegar em casa sem energia pros filhos, render metade no trabalho e
  achar que ficou preguiçosa, desistir do treino e da viagem, começar a achar
  que é assim mesmo.
- Peso: parar de confiar no próprio corpo depois de cinco tentativas.
- Memória: travar no meio da frase numa reunião, o medo de que seja o começo de
  alguma coisa, mudar de função no trabalho.

E a régua do tempo: **cada tentativa que não era a certa custa uns três meses.
Três tentativas é quase um ano da vida dela.**

### 22b. 🔴 O custo NUNCA pode ser dito em dinheiro

Uma versão anterior fechava com *"a gente cobra por consulta, ele paga em tempo
de vida"*. A Aline vetou: soa como se o profissional segurasse o paciente por
interesse, e insinua que médico e nutri não resolvem porque não querem.

A versão certa é pela **ética e pela assimetria**, e ela precisa dizer as três
coisas nesta ordem:

1. **Ninguém age de má-fé.** "Nenhum médico e nenhuma nutricionista quer que o
   paciente volte sem estar melhor. Eu confio nas minhas colegas."
2. **A assimetria.** "Pra gente, uma hipótese que não deu certo é uma consulta de
   retorno. Pra ele, é mais um trimestre da vida dele."
3. **A pergunta que a ética faz.** Deixa de ser *"eu fiz o melhor com o que eu
   tinha?"* (a resposta é sim, e ela acalma) e passa a ser **"eu fui atrás do que
   estava faltando?"**.

## 23. 🔴 Nada de "laudo limpo", "pasta cheia" e outras gírias de consultório

*"Tem que aparecer que está suja, a pessoa? Essa subjetividade muita gente não
vai entender."*

"Limpo" implica que o exame de alguém é **sujo**, e a leitora não quer ser a suja.
"Pasta cheia" cada uma imagina de um jeito. Escrever o **fato literal**, mesmo
ficando mais comprido:

| ❌ Gíria | ✅ Fato |
|---|---|
| "laudo limpo" | "todos os resultados dentro da faixa de referência" |
| "exame sujo" | "seis marcadores fora da faixa de referência" |
| "pasta cheia de exames" | "anos de exames guardados" |

## 24. A dinâmica da palestra: identificar, e depois virar

*"Quando eu dou palestra eu falo: quem se identifica com A, quem se identifica
com B. E no final: mas pra ter certeza, você tem que fazer o teste."*

Descreva dois ou três perfis, peça que ela se identifique, e **depois vire**:
**identificar não é saber**. É o fecho que leva ao teste sem prometer resultado, e
é o melhor gerador de comentário que existe (*"me conta: você é das rápidas ou das
devagar?"*), o que puxa alcance para fora de quem já segue.

## 25. 🔴 O 5,5% NÃO é taxa de acerto de palpite

A Aline leu o número como *"eu só acertei 5,5% das vezes que achei que era
genética"*. **Isso não foi medido**, e afirmar seria inventar dado. O que foi
medido é onde a causa raiz caiu em cada pilha de análises.

A leitura verdadeira é a aritmética das duas, e é mais forte:

> Sem o teste eu aponto genética em 5,5% dos casos; com o teste, em 38,5%. Logo,
> **olhando só para o sintoma e para a característica da pessoa, eu perco quase
> SETE DE CADA OITO vezes em que a resposta estava na genética.**

E o remate: *"e eu tenho mestrado em genética. Se eu perco sete de cada oito, o
que acontece com o palpite de qualquer pessoa?"*

## 26. "Risco alto" precisa dizer risco DE QUÊ, e não é doença

É que a instrução diferente veio nas **duas cópias** do gene, uma do pai e uma da
mãe. Quando vem em uma só, a outra compensa em parte; quando vem nas duas, aquele
caminho passa a **exigir mais**: mais de um nutriente, mais tempo para limpar uma
substância, mais cuidado com um horário.

> **Não é sentença. É exigência. E exigência a gente atende.**

Sem essa explicação a leitora entende risco de doença, o post assusta, e assustar
não é da marca (§5.3).

### 26b. Nunca citar o número absoluto de pacientes da base do software

*"Fica parecendo que só 161 pacientes fizeram teste comigo, e eu já atendi mais de
cinco mil."* O software é recente; a clínica é antiga. **Sempre proporção**: "na
leitura típica", "a pessoa do meio carrega", "mais de nove em cada dez".

## 27. O post para a NUTRICIONISTA tem regras próprias

- **A primeira lâmina diz a profissão e o desejo**, nunca uma categoria. *"Para
  quem atende"* é vago e não recruta ninguém. **"Este é para a nutricionista que
  quer atender com precisão."** Melhor ainda quando nomeia o momento: *"para a
  nutricionista que já pede o teste genético e trava na hora de ler."*
- **Não usa a abertura fixa da série** ("você já tentou de tudo"): quem atende não
  se reconhece nela e passa direto.
- **O mesmo número serve os dois públicos, em peças diferentes.** Para a paciente:
  "quatro em cada dez que passaram não estavam no ponto". Para ela: a mesma fatia,
  mais o mecanismo (faixa de referência é estatística populacional para doença
  instalada) e o que fazer na próxima consulta.
- **Termina em chamada para COMENTAR, com palavra-chave** (LAUDO, TEMPO).
  Comentário puxa alcance e abre a janela do direct, e a palavra-chave diz ao robô
  qual é a dor daquela pessoa antes de qualquer conversa.

## 28. 🔴 O robô NUNCA joga o trial solto

Regra da Aline em 09/09/2026: *"não pode só jogar a pessoa pra ser trial, tem que
saber o que ela quer e dar o direcionamento, entender a relação da dor daquele
post. Senão ela só faz o trial e fica perdida olhando as quinhentas
funcionalidades."*

A sequência, em três passos:

1. **Entrega o que foi prometido, sem pedir nada.** Ela comentou LAUDO porque
   trava em interpretar: manda a ordem de leitura.
2. **Pergunta antes de oferecer.** "Você já usa algum sistema pra isso, ou faz à
   mão?" É essa resposta que decide o caminho e é ela que marca a pessoa.
3. **Oferece o teste GUIADO.** "Eu te libero 14 dias e te mando o caminho exato:
   sobe um laudo que você já tenha, a paciente responde o questionário, e você vê
   os Top 10 já priorizados e a apresentação pronta. Dá pra fazer com um caso seu
   hoje."

🔴 **A diferença está no passo 3.** "Faz um teste grátis" entrega a pessoa a uma
tela cheia de botão. **"Faz ISTO nos seus 14 dias"** entrega um resultado no
primeiro dia, com um caso real dela.

Vale igual do lado da paciente: quem comenta num post de cansaço não recebe
"agende sua consulta". Recebe a mini solução daquele post, e a pergunta de qual
dos quatro setores parece o dela.

## 29. A história das dez horas (material de post, contado por ela)

Antes do Scanner, a interpretação de um laudo nutrigenético era feita **em
planilha, e levava de seis a dez horas por paciente**: gene por gene, conferindo
cada genótipo, cruzando à mão com o sangue e com o questionário, escrevendo o
texto e montando a apresentação.

O que isso produzia, e é o que dá o post: o gargalo era ela; a hora dela valia
uma fração do que parecia; e, sem perceber, ela **começava a escolher não pedir o
teste** em alguns casos.

Hoje o caminho é subir o laudo, a paciente responder o questionário, e sair o
**Top 10 já priorizado** cruzado com sangue e sintoma, mais a **apresentação para
a paciente**.

⚠️ **Conferir com ela antes de publicar tempo exato.** "Menos de um minuto" foi
dito de fala e o que se mede hoje é a geração do Top 3 e da apresentação; cardápio
e suplementos são outras chamadas. Número de produto errado num post é pior que
post nenhum.


## 30. ⏳ PENDENTE DE GRAVAÇÃO COM ELA: a história do Consultório de Precisão

Pedido dela em 09/09/2026: *"não me deixe esquecer de te contar isso."* A história
ainda **não foi contada** e este bloco existe só para não se perder.

**O que ela adiantou que a história tem:**

- as **mentorias de marketing** que ela fez, e o quanto investiu na parte digital;
- a experiência **clínica** de mais de dez mil pacientes;
- o conhecimento **teórico** (mestrado em genética) somado ao **prático**;
- a parte de **rede social**, aprendida e paga;
- tudo isso convergindo para construir a **infraestrutura do Consultório de
  Precisão**, que é o que ela vende hoje para outras profissionais.

**Por que ela quer:** cria **identificação com quem atende**. A colega que lê
reconhece a própria jornada (investiu em curso, investiu em marketing, atende bem
e mesmo assim não escala) e entende que a infraestrutura existe porque alguém
igual a ela precisou dela primeiro.

**Onde vai:** carrossel, e **candidata a POST FIXADO** — o fixado que fala do
software. Hoje os três fixados são "Quem eu sou", "Ana Diamante" e "Por onde
começar" (ver `CALENDARIO-EDITORIAL.md`).

🔴 **Não escrever de imaginação.** Falta o relato dela: quais mentorias, quanto
tempo, o que deu errado no caminho, e qual foi a virada. Sem isso o post vira
biografia genérica, que é o oposto do efeito que ela quer. Cruzar com
`HISTORIA-ALINE.md`, que cobre a infância e a decisão pela nutrição, mas **não**
cobre esta fase, a de empreender.

Conecta com §29 (a história das dez horas em planilha), que é o pedaço técnico da
mesma virada: as duas provavelmente são o mesmo carrossel, ou dois de uma série.


## 31. 🔴 O post encanta com o MÉTODO, nunca com a agenda dela

Regra dada por ela em 09/09/2026: *"a consulta será com o meu time, porque eu
não estou atendendo agora, da licença maternidade. Então tem que encantar por
mim mas direcionar pro time sem deixar eles frustrados."*

Quem se apaixona por um **método** não se frustra com quem o aplica. Quem se
apaixona por uma **pessoa**, sim.

🔴 **Nenhum post promete "comigo".** A fórmula é sempre **"o que A GENTE faz na
consulta"**. "A gente" inclui a Aline sem prometê-la, e continua verdadeiro
quando ela voltar. Uma versão anterior destes carrosséis dizia "o que EU faço na
consulta" em seis lugares; foi corrigido.

### 31b. No direct, a troca é ANTECIPADA, nunca escondida

Quem descobre depois de já querer marcar se sente rebaixada. Quem é avisada
antes entende que está comprando um método, não uma agenda. A frase que resolve,
dita no momento do convite e não depois:

> *"Uma coisa importante: eu estou em licença maternidade, então quem vai te
> atender é uma das nutricionistas que eu formei. E eu digo isso com
> tranquilidade porque a leitura do seu caso é a mesma: o método é meu, a
> curadoria do sistema que lê o seu laudo é minha, e elas foram treinadas por
> mim."*

Ela faz três coisas de uma vez: antecipa, transfere a autoridade da pessoa para
o método (que é o que a clínica precisa para escalar além dela), e se apoia numa
verdade **verificável** — a curadoria do Scanner é dela mesmo, são 482 fichas
revisadas por ela, e é ela que lê o laudo de todo mundo.

⚠️ "Licença maternidade" não enfraquece: **humaniza**. É a única explicação que
ninguém contesta e que ainda aproxima.

🔴 **Não prometer o que não se cumpre.** Dizer que a Aline revê cada caso ou
aprova cada Top 3 só entra se for verdade operacional. Promessa que a paciente
descobre na consulta é pior que promessa não feita. **Pendente de confirmação
dela.**

## 32. 🔴 Não repetir "de graça"

*"Eu nunca sei se ficar falando toda hora a palavra de graça. Esse número vai
atrair o tipo de público que não paga nada."*

Ela tem razão: repetir gratuidade treina a audiência a esperar gratuidade, e
seleciona quem nunca compra. O rótulo da mini solução vira **"Pra fazer hoje"**
ou **"Comece por aqui"**, e o CTA nomeia **o que ela recebe**, não o preço:

> ❌ "Comenta DOPAMINA. É de graça, e vai no seu direct."
> ✅ "Comenta DOPAMINA e eu te mando o guia das duas, com o prato de cada uma e o
> que olhar no seu exame."

O valor mora na descrição do que chega, não no fato de não custar.

## 33. A mini solução é POR PERFIL quando o post separa perfis

Se o post pede que ela se identifique em A ou B (§24), ele **tem** que entregar a
saída de A e a saída de B. Post que separa e não resolve os dois lados deixa
metade da audiência sem nada.

E o perfil não é só o sintoma: descreve também **o que vem junto** (a rápida cria
muito e enjoa antes de terminar, vai bem sob pressão e trava sem prazo; a devagar
é detalhista, rumina discussão e trava quando a pressão aumenta). É isso que faz
a pessoa dizer "sou eu" em vez de "talvez".

## 34. Arte de carrossel: o sistema que ficou

Sete rodadas de correção dela em 08 e 09/09/2026. O que vale:

- 🔴 **Fundo claro SEMPRE, cor só em bloco.** Está na paleta gravada em
  `aline.perfis`: *"sempre fundo claro/branco, cor em blocos sólidos de destaque
  (faixas, números grandes, backgrounds de bullets)"*. Alternar lâminas inteiras
  de escuro e de Tiffany faz o olho reajustar a cada slide, e é aí que ela
  desiste. **A cor não segura atenção; a dívida segura.** A cor diz o que é
  importante.
- **Uma exceção, e ela significa algo:** a última lâmina inverte para o escuro,
  porque acabou o conteúdo e começou o convite.
- 🔴 **Texto grande, uma ideia por lâmina.** Título de 80 a 140 px, corpo de 44 a
  58, nunca parágrafo com lista embaixo. Carrossel que engaja não tem texto
  pequeno; a primeira versão tinha duas listas e um parágrafo numa lâmina só.
- 🔴 **Uma fonte só.** Montserrat em tudo; a serifada entra apenas na fala entre
  aspas, para marcar que aquilo é voz da pessoa. Uma lâmina tinha três fontes
  (display, corpo serifado e negrito display dentro do serifado).
- **Título dentro de bloco tem teto menor que título solto**, senão a última
  letra vaza (aconteceu com o "?" de "personalidade?").
- **A paleta verdadeira está em `aline.perfis`, não nos docs:** Tiffany
  **#0ABFBC**, roxo **#D946EF**, creme **#F5EFE2**, escuro **#1A1A2E**. O
  repositório guardava `#0ABAB5` e `#D6336C` (rosa framboesa), e foi esse rosa
  que ela reprovou. **O magenta da marca é um VINHO, não um rosa** — em peça, o
  acento sobre creme é **#8E2F4F**.
- **CTA em lâmina inteira**, nunca espremido embaixo de outra mensagem.

---

## Procedência

Os números de formato vêm dos levantamentos de 2026 da Metricool (24,4 milhões
de posts) e da Socialinsider (70 milhões). As referências de corte, legenda e
duração de vídeo vêm de blogs de ferramentas de edição, sem amostra publicada:
a direção é consistente entre elas, os valores exatos não são garantidos.

O teste de contraste foi calculado sobre os HEX oficiais da marca pela fórmula
da WCAG 2.1, critério AA.

As leituras de audiência da conta @nutri_secrets vêm do Raio-X do público
(`/perfis/nutrisecrets/publico`), lido pela API do Instagram.

---

## 4. Quem ela é, e quem ela NÃO é

Contexto completo em `docs/HISTORIA-ALINE.md`. O que muda a escrita de todo post:

### 4.1 Ela não é a nutricionista do "comer certinho"

Ela ama cozinhar, comer e viajar. Ama chocolate (tem uma linha de chocolate),
brigadeiro e sorvete. Para ela **alimentação é cultura, prazer e entretenimento**,
não só nutriente.

Um post que soe a suco detox, restrição moral, "alimento limpo" ou culpa
contradiz quem ela é — e ela corrige o post. A frase dela:

> "Não é pra gente tirar a beleza do alimento olhando só pro nutriente. Mas
> também não é pra esquecer o poder que a alimentação tem na nossa saúde."

As duas metades da frase valem juntas. Conteúdo que fica só na primeira vira
hedonismo sem ciência; só na segunda vira a nutricionista chata que ela não é.

### 4.2 PROIBIDO: "alimentação é remédio"

Ela não usa e não gosta. O remédio tem a função dele e o alimento tem a dele — e
reduzir a comida a farmacologia desrespeita as culturas milenares que cuidam da
saúde pelos alimentos e pelas ervas.

Também fora: "comida é o melhor remédio", "farmácia natural", "receita médica da
natureza" e variações.

### 4.3 A magia está no PASSADO. O presente é ciência.

Ela brincava de fazer poções quando criança, e é ela quem diz que "a cozinha
virou a minha magia, a panela virou o meu caldeirão". Mas o vocabulário mágico
tem um lugar só, e é o **tempo verbal**:

- **Passado — o que a criança via:** "quando eu era criança, eu via isso como
  magia."
- **Presente — o que a cientista sabe:** a frase dela, que é a ponte entre as
  duas e a melhor síntese da marca:

> **"Parece magia, mas é ciência."**

- **Registro permitido no presente:** **alquimia**, no sentido de ofício e de
  beleza da combinação. "Hoje eu trabalho com a alquimia dos compostos" é dela.

**Por que a regra é estrita.** Duas razões, as duas dela:

1. **Parte do público é religiosa.** Marca que se apresenta como mágica compete
   com a fé de quem lê, e perde. A religiosidade que aparece na história é a
   **da avó**, contada como memória — nunca uma posição da marca.
2. **Ela fala de ciência.** Mestrado em genética, pesquisa com bolsa, dez mil
   pacientes. Post que soe a misticismo joga fora a autoridade que sustenta um
   produto de R$ 3.500.

**PROIBIDO:** magia, mágico, feitiço, milagre, energia, cura espiritual,
"poder místico do alimento" — no presente, afirmando o que a comida faz.
**Permitido:** poção e caldeirão **quando narram a infância dela**; alquimia
como ofício; e a frase "parece magia, mas é ciência", que existe justamente
para desarmar a leitura mística antes que ela aconteça.

### 4.4 O olhar é multidisciplinar, nunca por pedaços

Mestrado em genética (individualidade), especialização em psicologia da nutrição
(o emocional impacta a alimentação e vice-versa), e a primeira pesquisa dela só
saiu porque professores de enfermagem, biologia e genética ajudaram.

Consequência prática: post que trata um sintoma como se tivesse **uma** causa
está contra o método. É sempre "quais são as causas possíveis, e qual é a sua".

---

## 5. Correlação é o núcleo. Composto sozinho não é post.

Regra dada pela Aline em 06/09/2026, e é a que separa o conteúdo dela de qualquer
perfil de nutrição. **O "por quê" da marca é a correlação.**

### 5.1 Um post sobre um composto sozinho nunca é bom

O post só existe quando cruza pelo menos duas coisas:

- composto **+ exame alterado**
- composto **+ outro sintoma**
- alimento **+ alimento que potencializa**
- gene **+ marcador de sangue + conduta**

"A quercetina é antioxidante" não é post. "Quem metaboliza cafeína devagar
precisa olhar o triglicerídeo" é post.

### 5.2 O tchan é obrigatório — e o teste dele é uma frase

> **"Não precisava de teste genético pra isso."**

Se o leitor pode dizer essa frase no fim do post, o post fracassou. Ele ensinou
algo verdadeiro e provou que a Aline é dispensável.

O tchan não é curiosidade: é a **camada que só aparece quando se cruza**. No
exemplo do café, o tchan não é "cafeína atrapalha o sono" (todo mundo sabe) — é
"você dormir bem NÃO prova que você metabolizou; e em quem metaboliza devagar o
mesmo café passa a pesar no sistema cardiovascular, o que se vê no
triglicerídeo".

### 5.3 Sempre uma saída, nunca medo

Toda correlação termina em algo que a pessoa pode fazer hoje, de graça — mudar o
horário, mudar a combinação, olhar um exame que ela já tem. **Post que só
assusta não é da marca**, e a própria história dela ("parece magia, mas é
ciência") existe para desarmar isso.

### 5.4 Solução PARCIAL é o diferencial dela. "Conduta" é o plano inteiro.

Correção da Aline (06/09/2026) sobre uma versão anterior desta regra, que estava
apertada demais e teria produzido post covarde.

**Conduta é a dieta inteira e a suplementação inteira.** Isso é da consulta.
Tudo abaixo disso é conteúdo, e é justamente o que diferencia o perfil dela:

| Pode, e deve | É da consulta |
|---|---|
| Uma receita com a quantidade de cada alimento | O cardápio da pessoa |
| Montar um prato, com as proporções | O plano alimentar completo |
| "Magnésio só faz o efeito X a partir de 350 mg" | A prescrição daquele paciente |
| O que combina com o quê, e em que horário | O protocolo individual |
| Qual exame olhar, e a faixa funcional | A interpretação do exame dela |

O post entrega **valor real e usável**. O que ele não entrega é **qual dessas
condutas válidas é a sua** — e essa pergunta é o produto.

Isso é mais forte que sonegar informação: quem recebeu uma receita que funcionou
acredita que o resto funciona também.

### 5.4b Pode falar de doença. Não pode DIAGNOSTICAR.

Também correção dela, e a linha é precisa:

- ✅ **"Para quem tem fibromialgia, os estudos mostram que…"** — fala de uma
  população e da literatura. É educação.
- ✅ **"Vamos traduzir essa ciência e descomplicar numa receita deliciosa"** —
  a ciência chega na cozinha, que é o trabalho dela.
- ❌ **"Você tem fibromialgia"** / "esses sintomas são fibromialgia" — estabelecer
  diagnóstico de quem lê. Isso a lei veda, e é só isso que ela veda.
- ❌ **"Isso trata / cura fibromialgia"** — promessa de resultado (regra 3).

> 🔴 **Esta regra vale SÓ para conteúdo de marketing.** O output clínico do
> Scanner — Top 3, análises, orientações, textos do portal da paciente — continua
> obrigatoriamente por **processo funcional**, sem nome de doença, como manda o
> CLAUDE.md do produto. São coisas diferentes: um post fala com uma audiência
> sobre a literatura; um laudo fala com uma pessoa sobre o corpo dela.

### 5.4c Receita é o que mais engaja — e é onde a ciência dela pousa

Palavras dela: **"a receita é sempre o que dá mais ibope"**. E não é concessão ao
algoritmo: receita é literalmente a sinergia acontecendo num prato, que é a
pergunta que ela faz desde a graduação.

Consequência para o calendário: **receita não é um post ocasional, é um formato
recorrente** — e é o melhor lugar para a correlação, porque ela aparece na
quantidade, na combinação e no modo de preparo, sem precisar de slide teórico.

O formato que junta tudo: *condição ou sintoma → o que os estudos mostram → o
composto e a dose que fazem efeito → a receita que entrega isso de um jeito
gostoso → manda pra alguém que passa por isso.*

### 5.5 O gatilho de envio vem escrito no post

Envio é a métrica que traz quem não segue — o post da maçã fez **7.400 envios**.
E envio acontece quando o leitor pensa em **uma pessoa específica**.

Então o post nomeia essa pessoa: *"manda pra aquele conhecido que toma café à
noite e dorme igual pedra"*. Não "compartilhe se gostou" — **a característica ou
o sintoma de alguém que o leitor conhece.**

### 5.6 O modelo do café, inteiro

Serve de gabarito para qualquer post de correlação:

1. **Capa** — a identidade: "Você toma café à noite e dorme igual pedra"
2. **A quebra** — dormir bem não prova que metabolizou
3. **O mecanismo** — o gene que decide a velocidade; quem é lento leva 6 a 8 horas
4. **A correlação (o tchan)** — em quem é lento, o mesmo café pesa no sistema
   cardiovascular. Cruze com o **triglicerídeo** (régua funcional da Aline:
   acima de 90 já pede atenção, muito antes do 150 do laboratório)
5. **A saída de graça** — café de dia, não à noite; se há ansiedade, o da tarde
   já pesa
6. **O que é da consulta** — a conduta depende do seu caso (é aqui que entram
   compostos como o resveratrol, sem dose e sem prescrição)
7. **O envio** — "manda pra aquela pessoa que…"

## 35. 🔴 O PÚBLICO É O PRODUTO: duas trilhas completas, nunca uma com dois botões

Correção da Aline em 10/09/2026, depois de eu propor **uma** página de entrega com
dois pares de botões: *"são duas páginas, uma pra paciente, uma pra profissional
de saúde, porque o produto também é diferente, a aula também é diferente, enfim,
tudo é diferente. Até a linguagem do material é diferente — o GLP-1 tem a versão
pra paciente e a versão pra profissional."*

Então a separação não acontece no fim, num `if` de botão. Ela acontece **na
origem**, e desce por tudo:

| | Paciente | Profissional |
|---|---|---|
| Carrossel | próprio | próprio |
| Material de isca | versão paciente | versão profissional |
| Aula paga | própria | própria |
| Página de entrega | própria | própria |
| Botão do fim | teste nutrigenético · epigenético · **combo com 20%** | testar o Scanner 14 dias · montar o Consultório de Precisão (agenda da Viviane) |

🔴 **A paciente nunca vê "monte seu consultório de precisão".** Um botão que não
é pra ela não é neutro: ele diz que o material não era pra ela.

**Quando separar na origem e quando separar no direct:**

- **Dois carrosséis** quando o assunto já nasce separado e as audiências nem se
  cruzam no feed (microbiota do lactente: a mãe e o pediatra não são o mesmo
  post). Palavra-chave diferente em cada um.
- **Um carrossel e a pergunta no direct** quando o sintoma é o mesmo para os dois
  (peso, cansaço, névoa mental). É o que a lâmina de CTA já faz: *"se você cuida
  de você… se você atende…"*. A resposta é o que decide o material, a aula e a
  página.

## 36. A entrega da aula paga NÃO vai para a área de curso

Também de 10/09: *"não aparecer lá no tratamentos como é o Lótus, porque é muita
informação num lugar só. Ela vai ficar abrir senha, coisa do tipo. O povo é meio
perdido."*

Para uma compra de impulso de R$ 29,90, **login é onde a pessoa desiste** — e a
plataforma de curso ainda enterra o botão que é o motivo da aula existir.

**O formato é uma coluna só, sem menu e sem senha:** vídeo no topo → material
para baixar → o fecho → **o botão**.

⚠️ Isso **não** é feature nova. `cursos.produtos.acesso_url` já manda o comprador
para uma URL externa em vez da área de curso (é o que o Caderno de Receitas
Fertilidade faz hoje, apontando para um app na Vercel), e
`cursos.matriculas.scanner_portal_token` já existe e já é usado — 26 das 217
matrículas têm token. É o mesmo padrão de link sem senha do portal da paciente e
da página de gestão do agendamento. Logo dá para entregar um **link pessoal**:
sem senha, e ainda assim sabendo quem abriu.

## 37. 🔴 A aula termina em venda — mas o pago tem que estar COMPLETO

A Aline: *"a aula tem que sempre terminar meio de venda, vincular aquele conteúdo
com o nutrigenético e o epigenético, e falar que o botão está embaixo."* Certo — e
tem uma trava que protege ela, porque **a aula é paga**.

A régua é a que ela mesma já usou no material do lactente: **o grátis é um
pedaço, o pago é completo, e o botão é o que vem DEPOIS de completo.**

O teste que decide: se a pessoa sentir que a aula guardou a parte boa para
vender, vira reembolso e boca ruim — e isso custa mais do que o combo ganha. O
epigenético não é o pedaço que faltou na aula; é o passo seguinte de quem já
entendeu a aula inteira.

## 38. 🔴 ÓBVIO, NÃO SUTIL — e "efeito" é palavra que viraliza

Correção da Aline em 10/09/2026 sobre a capa do carrossel do peso. Eu escrevi
*"Você emagrece, recupera, e começa de novo"* e ela cortou: *"tem que falar
assim: **engorda**, e começa tudo de novo. Não dá pra ser sutil, o povo não
entende, tem que ser óbvio."*

**"Recupera" é palavra de nutricionista. "Engorda de novo" é palavra de gente.**
A leitora não decodifica eufemismo em três segundos de feed — ela passa.

| ❌ Sutil | ✅ Óbvio |
|---|---|
| "recupera" | **"engorda tudo de novo"** |
| "e cada vez volta mais rápido" | **"ou nem isso: empaca no meio do caminho e não sai mais do lugar"** |
| "o cansaço aumenta" | "chega em casa sem energia pros filhos" |

🔴 **E a capa tem que cobrir os DOIS jeitos de fracassar**, não só um. Quem
emagrece e engorda de novo é um caso; quem **nem chega a emagrecer e empaca no
meio** é outro, e metade da audiência está nele. Capa que descreve só a sanfona
perde quem nunca saiu do lugar.

**"Efeito" é palavra dela, e funciona:** *"essa palavra 'efeito' sempre viralizou
em todos os posts que eu já fiz"*. Efeito sanfona, efeito rebote, efeito platô —
a leitora já usa o termo, então ele gera reconhecimento imediato (§17) sem custar
explicação. Preferir "efeito X" a descrever o fenômeno por extenso.

## 39. 🔴 A CONFERÊNCIA ANTES DE MANDAR — a lista roda aqui, não nela

Pedido da Aline em 10/09/2026: *"se precisa ser uma regra, porque eu fico tendo
que corrigir coisa óbvia, e você tem aí os agentes todos de marketing. Não era
pra eu estar falando tudo isso toda hora."*

**Ela está certa, e o diagnóstico é o pior possível: a regra já existia.** A capa
que ela devolveu terminava em *"o efeito sanfona não é falta de força de
vontade"* — uma conclusão, que satisfaz e encerra. A §21 diz, com essas palavras,
que *"nenhuma lâmina pode terminar num lugar onde a leitora fica satisfeita"*, e
a §1.4 diz que *"cada lâmina termina devendo alguma coisa à seguinte"*.

Ou seja: **regra nova não conserta isso.** O que faltou foi conferir a peça
contra as regras antes de mandar. Então o que entra aqui não é mais uma regra —
é a lista que se roda ANTES de entregar qualquer carrossel. Se um item falha, a
peça não sai; volta e conserta.

### A lista

1. **Toda lâmina termina devendo?** Leia só a ÚLTIMA frase de cada uma, em
   sequência, ignorando o resto. Se alguma delas puder ser lida como ponto final
   satisfatório, aquela lâmina é onde a leitora para. (§1.4, §16, §21)
2. **A terceira linha da capa ABRE um mistério?** Ela é a que decide o arrasto.
   Conclusão fecha; pergunta, "talvez", "o que ninguém te mostrou" abrem. O teste
   é o do detetive: *"vai desvendar esse mistério"*. (§16)
3. **A capa é óbvia ou sutil?** Palavra de gente, não de nutricionista. E cobre
   os DOIS jeitos de fracassar, não só um. (§38)
4. **Tem mini solução que ela FAZ e SENTE amanhã**, sem gastar e sem depender de
   terceiro? Tarefa não conta. (§14)
5. **Alguma lâmina manda de volta pro profissional dela?** Se sim, corta. (§15)
6. **Todo número é proporção**, nunca "pelo menos um" nem base absoluta. (§18, §26b)
7. **O vocabulário da Fábrica aparece colado na tradução**, nunca pelado. (§6)
8. **Nenhuma gíria de consultório** ("laudo limpo", "pasta cheia"). (§23)
9. **O custo está escancarado, e não é em dinheiro.** (§22, §22b)
10. **A validação carrega o "mas" dentro dela**, na mesma respiração. (§21)
11. **Promete "comigo"?** Se sim, troca por "a gente". (§31)
12. **Repete "de graça"?** Se sim, troca pelo que ela RECEBE. (§32)
13. **A arte:** fundo claro, Playfair no título e DM Sans leve no corpo, uma
    ideia por lâmina, e a última invertida para o escuro. (§34, §40)

🔴 **O item 1 é o que mais falha, e é o mais fácil de checar.** Ler só as últimas
frases em sequência leva trinta segundos e pega o defeito que ela mais corrige.

## 40. 🔴 A PALETA VEM DE `aline.perfis`, E "ESCURO É O TEXTO"

Correção da Aline em 10/09/2026: *"suas cores têm esse azul-marinho que não é
nosso, não é da Nutri Secrets."* Ela tinha razão: eu peguei `#161B33` e
`#F8F9FE` do guia de GLP-1 (que é peça do Scanner, outro perfil e outra paleta) e
usei como se fossem da marca dela.

**A fonte da verdade é a linha `nutrisecrets` de `aline.perfis`**, no banco do
Marketing (`mfldshdxulqxskwcoxrl`) — não um doc, não a memória, não outra peça
que por acaso ficou bonita:

| Token | Hex | Papel, nas palavras do campo `sistema_cor_regra` |
|---|---|---|
| tiffany | `#0ABFBC` | **fundo e bloco, nunca cor de letra** (contraste insuficiente sobre creme) |
| magenta | `#D946EF` | **contraste em destaque**: número, CTA, palavra da virada, marcador |
| creme | `#F5EFE2` | **o fundo** dos slides |
| escuro | `#1A1A2E` | **o texto** |

🔴 **"Escuro é o texto" — não é fundo de lâmina.** Eu vinha usando o escuro como
fundo da capa e do CTA, e é daí que saiu a sensação de azul-marinho. A regra
termina com *"nunca preto e branco editorial"*, que é o mesmo espírito: a peça
vive no creme.

⚠️ **`scannerdasaude` tem OUTRA paleta na mesma tabela** (roxo `#8B5CF6` como
primária, e uma cor por pilar de conteúdo). Peça do Scanner não é referência de
cor para peça da Nutri Secrets, por mais que o layout sirva de inspiração.

**Cinza de corpo não se inventa.** O `#6B7280` que eu estava usando veio do guia
do Scanner. O secundário sai do próprio escuro com opacidade, ou de um cinza
derivado dele — nunca de um cinza neutro de outro sistema.

## 41. 🔴 A ETIQUETA DE SÉRIE É O NOME DA SÉRIE, NÃO A NOSSA TAXONOMIA

Mesma correção, 10/09: a capa trazia **"O SINTOMA ENGANA · PESO"**, e ela cortou
o segundo pedaço: *"isso é pra gente. A pessoa não sabe o que é 'o sintoma engana
· peso'. Pode ser só 'o sintoma engana', e aí vem 'você emagrece e engorda tudo
de novo'."*

A leitora não conhece a nossa organização interna. **"PESO" ali é o nome da pasta
onde o post mora**, não informação para quem lê — e ainda rouba a surpresa que a
manchete ia dar duas linhas abaixo.

A etiqueta declara a série (§1.8) para quem gostou de um post procurar os outros.
Só isso. Assunto, tema, volume e número de episódio são catalogação nossa e ficam
no calendário.

## 42. 🔴 TODO POST TEM GENÉTICA — porque é o teste que a gente vende

Regra dada por ela em 10/09/2026: *"se a gente sempre vai tentar vender o teste
nutrigenético, o conteúdo que a gente entrega tem que ter algo genético. Mesmo
que também fale de exame de sangue, também fale de microbiota — mas tem que
falar de nutrigenético. E sempre dar essa energia de sinergia nutricional, de
alquimia."*

Post que explica tudo por exame de sangue e termina oferecendo teste genético
não fecha: a leitora não viu por que o teste responderia algo que o sangue não
respondeu. **A genética não é o CTA — ela é o miolo.** O sangue mostra como você
está hoje; o gene mostra como a máquina veio. São perguntas diferentes, e é essa
diferença que justifica a compra.

E junto vem a assinatura dela: **sinergia, biodisponibilidade, alquimia de
compostos bioativos**. Não é enfeite — é o que separa "coma maçã" de nutrição
(§1.7, §5.1).

## 43. 🔴 PROMETEU "NÃO É ONDE VOCÊ IMAGINA" TEM QUE DIZER ONDE É

A correção mais dura de 10/09, sobre o carrossel do peso: *"a gente acabou de
falar que não é onde ela imaginava, e daí não conta onde que é, e só fala
solução. Não dá pra entender isso."*

O carrossel ia da pergunta direto pra conduta. Faltava o miolo, que é **a lista
das possibilidades** — e é justamente ele que faz o post parecer investigação em
vez de dica.

**A sequência que fecha, e ela tem quatro tempos:**

1. **Não é onde você imagina.** (a virada)
2. **Então é onde?** — as possibilidades, com NOME. Quais nutrientes, quais
   genes, qual via. Sem nome não existe descoberta: existe suspense vazio.
3. **E em cada uma a conduta é DIFERENTE.** É aqui que o teste se vende sozinho,
   porque a leitora vê com os próprios olhos que a saída muda conforme a causa.
4. **Se identificar não é saber** (§24) → o teste.

🔴 **Nomear é obrigatório.** "Pode ser falta de vitamina" não descobre nada.
"Ferritina, vitamina D, B12, zinco, magnésio ou T3 — e todos podem estar dentro
do normal no seu exame" é uma descoberta.

🔴 **O ouro está onde a conduta se INVERTE.** No COMT, quem limpa dopamina rápido
precisa de mais proteína e quem limpa devagar piora com ela. Mesma queixa, mesmo
gene, conduta oposta. Esse é o argumento mais honesto que existe para o teste, e
nenhum concorrente consegue copiar sem ter a curadoria.

⚠️ **Conduta por gene NUNCA se escreve de cabeça.** Sai de `conteudo_genes`, que
tem os nomes que a Aline deu a cada um na Fábrica ("FTO, o Controlador das
Escolhas Alimentares"; "MC4R, o Controlador da Fome Emocional"; "LEPR, o Receptor
da Saciedade"; "IRS1, o Mensageiro da Insulina") e o `objetivo_nutricional` por
genótipo. Foi lá que apareceu o fato mais forte do post — o `rs9939609` registra
que **o padrão mediterrâneo neutraliza o efeito do FTO em ensaio clínico** — e
esse fato não estava em nenhum rascunho meu.

## 44. 🔴 MC4R É FOME EMOCIONAL (serotonina). SACIEDADE É LEPR E FTO.

Correção da Aline em 10/09/2026, e ela apanhou um erro meu de mistura: eu tinha
dado ao MC4R a conduta de saciedade mecânica ("salada antes do prato, não comer
em menos de dez minutos") e deixado o LEPR com uma conduta genérica.

**A confusão tem uma causa concreta: os dois SNPs de MC4R na curadoria têm nomes
e papéis DIFERENTES**, e eu puxei o campo de um enquanto citava o outro.

| SNP | Nome na Fábrica | Do que ele trata |
|---|---|---|
| `rs17782313` | **Controlador da Fome Emocional** | comer por emoção, estresse, prazer — *"mesmo quando o organismo não necessita de energia"*. É comportamento hedônico. |
| `rs12970134` | Centro de Controle da Fome | saciedade hipotalâmica, sinal de "chega" mais lento |

**A via do MC4R emocional é SEROTONINÉRGICA**, e está escrita na curadoria:
`aminoacidos_chave` traz *"triptofano (saciedade via serotonina)"*,
`vitaminas_chave` traz *"B6 piridoxal-5-fosfato (síntese de serotonina)"*, e
`minerais_chave` traz **cromo**, com a justificativa *"sensibilidade insulínica e
controle de compulsão por carboidrato"*. É isso que a Aline quis dizer com *"ele
também tem metabolismo de carboidrato diminuído"*.

**Saciedade, com fibra, é LEPR e FTO** — não MC4R. No LEPR o corpo produz leptina
e o cérebro não escuta, então o alvo é **desinflamar**, não comer menos.

⚠️ **Lição de método: citar um gene não basta, tem que citar o SNP.** É a REGRA
SUPREMA de `lib/conteudo-genes-lookup.ts` aparecendo no marketing — a chave é o
rs, nunca o nome do gene. Foi o mesmo erro que inverteu o CYP2C9 no laudo em PDF
(02/09), e ele reapareceu aqui, num carrossel.

## 45. "Emagrecer é mais do que caloria. É alquimia."

Frase dela, 10/09. É a assinatura que fecha a §42: o post pode falar de gene, de
exame e de microbiota, mas o que amarra tudo é **sinergia** — nutriente sozinho é
dose, nutriente no par certo é efeito.

⚠️ Nota de transcrição, para não se repetir: o áudio dela saiu como *"onde a
Valéria fala…"*, e eu procurei uma pessoa chamada Valéria na base inteira. Não
existe — ela disse *"é aí que **valeria** falar daquela parte"*. Antes de sair
procurando um nome próprio que apareceu uma vez só, considerar que pode ser o
verbo.
