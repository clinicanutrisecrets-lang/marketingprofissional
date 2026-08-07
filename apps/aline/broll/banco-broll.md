# Banco de B-roll — biblioteca reutilizável da Aline

Objetivo: gerar uma biblioteca de B-roll reutilizável em vez de gerar reel a
reel. B-roll é reutilizável por natureza: sem fala, sem texto legível, boca
fechada, ação genérica e lenta. O mesmo clipe da cozinha serve pro reel de
TDAH, de cortisol, de microbiota — o que muda é o texto por cima (overlay
queimado na montagem ou CapCut).

## Motor de geração (revisado em 2026-08-07 pela sessão local)

A estratégia original apostava em **Seedance 2.5 ilimitado** como motor
principal. **Isso caiu**: o `seedance_2_5` não aceita `start_image` — só
`image_references` + `mode omni_reference`, que usa a imagem como referência
de aparência e **não preserva o enquadramento aprovado**. E entrega no
máximo 720p, contra até 4k do Kling.

Como o fluxo obrigatório é *frame aprovado → animar aquele frame*, o motor
das cenas com o rosto da Aline é o **Kling 3.0** (`kling3_0`, que aceita
`start_image`/`end_image`). O `kling3_0_turbo` é a versão mais barata —
comparar custo real com `generate cost` antes de escolher.

Divisão:

| Tipo de cena | Motor | Por quê |
|---|---|---|
| Com o rosto da Aline (frame Soul aprovado → animar) | `kling3_0` (ou `_turbo`) | único que aceita `start_image` |
| Sem rosto (molécula, comida, ambiente, mãos desfocadas) | `seedance_2_5` text-to-video | não depende de frame; aproveita ilimitado se houver |

## Orçamento

- Conta é plano **ultra**, com **3010 créditos** (não é o PLUS de 1.000/mês
  que a estratégia antiga assumia).
- A ~20-25 créditos/clipe no Kling, 3010 créditos ≈ 120-150 clipes — cabe
  nos 50-70 da meta, **mas sem margem infinita pra descarte e regeração**.
  Logo: gerar frame bom primeiro, animar só o aprovado, e medir com
  `generate cost` antes de cada lote.
- **A confirmar no site da Higgsfield** (o CLI não informa): se o plano ultra
  inclui alguma janela ilimitada. Se incluir, as cenas sem rosto saem de
  graça e os créditos ficam todos pras cenas com rosto.

## Dois destinos, um banco

O banco abastece duas frentes — cada clipe recebe tag de uso no índice:

- **[ORG] Orgânico @nutri_secrets** — foco em paciente: genes, microbiota,
  exames, casos clínicos como exemplo didático (conhecimento, nunca dados
  de paciente real), persona Detetive da Saúde. Ex.: reel do TDAH.
- **[ADS] Anúncios da formação em saúde integrativa** — foco em
  profissionais: Aline professora/palestrante/autoridade clínica. Cenas
  precisam funcionar com narração (voiceover) por cima.
- **[AMBOS]** — a maioria: B-roll neutro serve pras duas frentes.

## Cenários do banco (aprovados pela Aline)

Por cenário: 3-4 frames-base diferentes (enquadramento/luz/figurino) e, de
cada frame aprovado, 2-3 animações com movimentos de câmera distintos.
Duração por clipe: a mais curta que o modelo oferecer (5s cobre o corte de
4-6s usado na edição e economiza crédito). Meta: **50-70 clipes
aproveitáveis**.

| Cenário | Variações de ação | Uso |
|---|---|---|
| 1. Cozinha — refeições | café da manhã na bancada; montando almoço colorido; preparando jantar leve; finalizando uma sobremesa saudável | AMBOS |
| 2. Cozinha — pausa | sentada na cozinha tomando chá; tomando café devagar; mexendo tigela; lavando folhas | AMBOS |
| 3. Cafeteria | xícara perto do rosto olhando janela; lendo caderno fechado/genérico; olhar pra rua | ORG |
| 4. Laboratório | observando placa de Petri; analisando folha de resultado; ao microscópio (mãos paradas) | AMBOS |
| 5. Consultório / prática clínica | explicando exame ao paciente (de costas, desfocado); à mesa revisando pasta; acolhendo na porta; em pé ao lado da mesa, postura de escuta | AMBOS |
| 5b. Análise / leitura | lendo um exame impresso à mesa (folha genérica, conteúdo desfocado); lendo relatório encadernado; no computador de perfil, tela desfocada — enquadrada deixando espaço livre ao lado pra entrar a "segunda tela" na edição | AMBOS |
| 6. Palestra | em pé com microfone de mão abaixado, público desfocado; gesto estático apontando slide desfocado; caminhando devagar no palco | ADS |
| 7. Professora / aula | à frente de sala pequena com alunos de costas desfocados; ao lado de lousa com traços genéricos; mesa de estudo com livros fechados | ADS |
| Extras (se sobrar orçamento) | home office/abas abertas; lousinha; caminhada ao ar livre; escrivaninha escrevendo parada | ORG |

Todos seguem as regras fixas do `README.md`: um movimento de câmera,
boca fechada, sem manipulação fina, nenhum texto legível, pele natural.
Nas cenas [ADS], figurino um degrau mais formal (blazer, jaleco limpo) e
enquadramentos que deixem respiro pra headline do anúncio.

## Ordem de produção

| Fase | O quê |
|---|---|
| 1 | Treinar Soul ID `aline` (uma vez). Medir custo real de 1 frame e 1 clipe com `generate cost` e reportar à Aline. |
| 2 | **Piloto**: 1 cenário completo (sugerido: consultório/análise, que serve ORG e ADS) — frames → aprovação → 2 clipes. Valida qualidade e custo antes de escalar. |
| 3 | Frames dos demais cenários, em lote, pra aprovação da Aline. |
| 4 | Animar só os frames aprovados, cenário a cenário, com relatório de créditos gastos a cada lote. |
| 5 | Organização do banco + índice. |

O piloto existe pra não descobrir problema de qualidade depois de gastar
metade dos créditos. Frames custam pouco perto de vídeo — errar no frame é
barato, errar no vídeo não.

## Organização do banco

```
saida/banco/
  cozinha/cozinha-mexendo-v1.mp4 ...
  cafeteria/...
  laboratorio/...
  consultorio/...
  palestra/...
```

Índice em `saida/banco/INDICE.md` com: arquivo, cenário, ação, movimento
de câmera, trecho bom (in/out), e em quais reels já foi usado — pra não
repetir o mesmo clipe em reels consecutivos.

## Overlays de telas reais ("segunda tela")

Telas e documentos NUNCA são gerados por IA (sai texto embaralhado). O
conteúdo real entra na montagem, por cima do B-roll:

1. Aline manda o PDF (ou print) do layout real — plano alimentar, laudo de
   interpretação de exame, painel genético — **sem dados de paciente real**
   (usar exemplo/dados fictícios; se vier algo pessoal, eu confiro e
   mascaro nome/CPF/data antes de usar — nada identificável vai pro vídeo).
2. Eu renderizo o PDF em imagem, recorto a área boa e limpo.
3. Na edição, o print entra como "segunda tela": card flutuante ao lado
   dela no computador, ou insert em tela cheia de 1-2s entre cenas, com
   moldura na paleta da marca (mockup de navegador/tablet quando couber).

Efeito: o vídeo mostra o SEU sistema de verdade — autoridade que IA
nenhuma imita — e as cenas 5b já são geradas com respiro no enquadramento
pra esse overlay encaixar.

## Montagem dos reels

Eu monto (ffmpeg): seleção dos clipes do banco + ordem narrativa + cortes +
texto queimado na paleta da marca quando a Aline quiser. Entrega: MP4 único
pronto pra postar + clipes soltos caso queira editar no CapCut.

## Áudio / narração

Três caminhos, por ordem de automação:

1. **ElevenLabs via API (preferido pra ADS e reels narrados)** — a Aline
   tem conta ElevenLabs. Com a API key configurada (`ELEVENLABS_API_KEY`
   em env/secret da sessão — **nunca commitar**), eu: escrevo o roteiro de
   narração → gero a voz dela (voice clonada ou escolhida) via API → ajusto
   o corte das cenas ao ritmo da fala → entrego o MP4 com áudio embutido.
   Anúncio sai 100% pronto pra subir no Gerenciador.
2. **Aline manda o áudio pronto** (gravado ou exportado do ElevenLabs) —
   eu sincronizo na montagem e entrego o MP4 final.
3. **CapCut/Instagram** — só pro caso de música em alta do app (trending
   audio precisa ser adicionado dentro do app por licenciamento) ou se ela
   quiser legendas animadas estilo CapCut.

Orgânico com música em alta → caminho 3 (vídeo entregue mudo, texto
queimado). Orgânico narrado e anúncios → caminho 1 ou 2.
