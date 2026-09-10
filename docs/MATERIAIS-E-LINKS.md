# Materiais de captação — o que existe e qual é o link

Fonte única dos links que o robô do Instagram entrega no direct. Antes de
prometer material em post ou em fluxo, conferir aqui: material anunciado que
cai em 404 é o pior desfecho possível — a pessoa comentou, recebeu o link e
levou uma página de erro.

## Regra de entrega: SEMPRE link, nunca arquivo

O direct do Instagram **não anexa arquivo**. A API de mensagens entrega texto,
botão e link — só isso. Então a pergunta "mando PDF ou link?" não existe na
prática: manda-se link. O que muda é o que está do outro lado dele.

Isso tem uma consequência boa que vale explorar: link é rastreável e arquivo
não. Quando o material vira uma página nossa, dá pra saber quantas pessoas de
fato abriram — e mandar o lembrete só pra quem não abriu.

## Os links

| Material | Público | Link | O que é |
|---|---|---|---|
| Microbiota do lactente — 8 estratégias | Paciente (mãe) | `scannerdasaude.com/materiais/microbiota-lactente-8-estrategias.pdf` | PDF |
| SOP / SOMP — guia clínico | Nutricionista | `somp.scannerdasaude.com` | App (projeto Vercel `somp`) |
| Análogos de GLP-1 — conduta nutricional | Nutricionista | `glp1.scannerdasaude.com` | App (projeto Vercel `glp-1`) |
| Planner da Formação | Nutricionista | `scannerdasaude.com/planner` | Página do Scanner |
| Espiadinha da Formação | Interessada na Formação | `scannerdasaude.com/espiadinha-formacao` | Página do Scanner, sem porta de ativação |
| Triagem clínica — Disbiose & SII | Nutricionista | `guias.scannerdasaude.com/intestino` | App (43 perguntas, Roma IV + Bristol + ACG SIBO/IMO 2020, 10 hipóteses com conduta, doses e referências) |
| Dicionário da Fábrica da Saúde | Nutricionista | `scannerdasaude.com/materiais/dicionario-fabrica-da-saude.pdf` | PDF |

## 🔴 `detetiveintestino.scannerdasaude.com` NÃO é a triagem

Esse subdomínio já está apontado para o projeto Vercel **`intestino-app`** — o
app do **paciente**, que hoje só tem deploy de *preview* (por isso responde
404 em produção). A triagem clínica é material da **nutricionista**: 43
perguntas, critérios de Roma IV, doses de suplemento. Público diferente,
material diferente. Publicar uma coisa no endereço da outra faria o link do
post de paciente abrir uma tela de conduta com posologia.

## Guia novo: um arquivo e uma linha

O `guias.scannerdasaude.com` é servido pelo **próprio Scanner**, por rewrite no
`middleware.ts` — o mesmo padrão que já roda no `medico.`, no
`experienciaclinica.` e no `imunogut.`. Então guia novo **não precisa** de
repositório no GitHub nem de projeto na Vercel:

1. o arquivo vai para `scanner-saude/public/guias/`;
2. uma linha entra no mapa `guias` do `middleware.ts`;
3. o link nasce no deploy seguinte.

O SOMP e o GLP-1 têm projeto próprio porque nasceram antes deste caminho. Não
precisam ser migrados — só não vale a pena repetir aquilo daqui em diante.

🔴 **O mapa é explícito de propósito.** `public/guias/` também guarda PDF
interno (Vera, MESA, epigenético); servir a pasta inteira publicaria esses
arquivos num endereço adivinhável. `tests/guias-subdominio.test.ts` trava isso e
trava também destino que aponta para arquivo inexistente.

⚠️ **Uma coisa só ela consegue fazer:** apontar `guias.scannerdasaude.com` para o
projeto `scanner-saude-b1jf` no painel da Vercel (Domains → Add). É clique
único, uma vez só — depois disso todo guia novo entra sem tocar em domínio.

## 🔴 Três materiais prometidos que estão em 404 hoje

Os protocolos de **resveratrol**, **CoQ10** e **quercetina** foram cadastrados
em 04/09 na `base_conhecimento` com `status='aprovado'`, apontando para
`scannerdasaude.com/materiais/protocolos/...` — **e os arquivos não existem no
repositório**. A Fernanda já está servindo esses links. Ou os PDFs sobem, ou as
linhas voltam para `rascunho`.
