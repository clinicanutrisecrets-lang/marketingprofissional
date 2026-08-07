# Banco de B-roll — estratégia dos 33 dias ilimitados

Objetivo: aproveitar a janela de **Seedance 2.5 ilimitado (33 dias)** do
plano PLUS pra gerar uma biblioteca de B-roll reutilizável da Aline, em vez
de gerar reel por reel. Vídeo na janela custa zero crédito; os 1.000
créditos/mês ficam reservados pro treino do Soul ID e pros frames.

B-roll é reutilizável por natureza: sem fala, sem texto legível, boca
fechada, ação genérica e lenta. O mesmo clipe da cozinha serve pro reel de
TDAH, de cortisol, de microbiota — o que muda é o texto por cima (CapCut ou
overlay queimado na montagem).

## A conta

- Pagando por crédito (Kling 3.0): ~20-25 créditos/clipe → 1.000 créditos
  ≈ 2-3 reels/mês. **Não é esse o plano.**
- Com Seedance 2.5 ilimitado: clipes de vídeo = 0 crédito por 33 dias.
  Limite real vira tempo de fila ("unlimited mode allows fewer parallel
  gens") — irrelevante, eu deixo gerando em lote em background.
- Créditos pagos: Soul ID (uma vez) + frames estáticos. Nos 7 primeiros
  dias, Nano Banana 2 ilimitado (2K) ajuda a baratear teste de frames.
- Resultado esperado: um mês de assinatura → banco que abastece meses de
  reels.

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
Cada clipe em 10s (duração padrão do ilimitado) — na edição eu corto o
trecho bom de 4-6s. Meta: **50-70 clipes aproveitáveis**.

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
| Extras (se sobrar janela) | home office/abas abertas; lousinha; caminhada ao ar livre; escrivaninha escrevendo parada | ORG |

Todos seguem as regras fixas do `README.md`: um movimento de câmera,
boca fechada, sem manipulação fina, nenhum texto legível, pele natural.
Nas cenas [ADS], figurino um degrau mais formal (blazer, jaleco limpo) e
enquadramentos que deixem respiro pra headline do anúncio.

## Cronograma da janela de 33 dias

| Fase | Dias | O quê |
|---|---|---|
| 0 | antes de assinar | Fotos de treino prontas e revisadas + login feito. Só assinar com isso pronto, pra janela contar produzindo. |
| 1 | 1-2 | Treinar Soul ID `aline`. Confirmar custos reais (`generate cost`) e se o Seedance 2.5 ilimitado aceita image-to-video com frame Soul. |
| 2 | 2-7 | Frames de TODOS os cenários (Nano Banana 2 ilimitado nos 7 primeiros dias + Soul frames). Aprovação da Aline em lote. |
| 3 | 8-30 | Animação em massa dos frames aprovados no Seedance ilimitado. QC meu (descarte e regeneração ilimitada). Entrega parcial semanal. |
| 4 | 30-33 | Últimas regenerações e organização final do banco. |

Plano B se o ilimitado não aceitar Soul/image-to-video: cenas com a Aline
vão pro Kling 3.0 pago (~12-15 clipes escolhidos a dedo cabem nos créditos)
e o ilimitado cobre cenas sem rosto (moléculas, comida, ambientes).

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
