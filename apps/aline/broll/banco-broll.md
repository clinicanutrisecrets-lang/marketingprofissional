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

## Cenários do banco (aprovados pela Aline)

Por cenário: 3-4 frames-base diferentes (enquadramento/luz/figurino) e, de
cada frame aprovado, 2-3 animações com movimentos de câmera distintos.
Cada clipe em 10s (duração padrão do ilimitado) — na edição eu corto o
trecho bom de 4-6s. Meta: **40-60 clipes aproveitáveis**.

| Cenário | Variações de ação | Usos típicos |
|---|---|---|
| 1. Cozinha | mexendo tigela; montando prato colorido; lavando folhas; café da manhã na bancada | sinergia alimentar, receitas, rotina |
| 2. Cafeteria | xícara perto do rosto olhando janela; lendo caderno fechado/genérico; olhar pra rua | ganchos de estilo de vida, cortisol, sono |
| 3. Laboratório | observando placa de Petri; analisando folha de resultado; ao microscópio (mãos paradas) | nutrigenética, exames, microbiota |
| 4. Consultório | explicando exame ao paciente (de costas, desfocado); à mesa revisando pasta; acolhendo na porta | exames, consulta, autoridade clínica |
| 5. Palestra | em pé com microfone de mão abaixado, público desfocado; gesto estático apontando slide desfocado; caminhando devagar no palco | autoridade, eventos, institucional |
| Extras (se sobrar janela) | home office/abas abertas; lousinha; caminhada ao ar livre; escrivaninha escrevendo parada | ganchos de TDAH/foco, didáticos |

Todos seguem as regras fixas do `README.md`: um movimento de câmera,
boca fechada, sem manipulação fina, nenhum texto legível, pele natural.

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

## Montagem dos reels

Eu monto (ffmpeg): seleção dos clipes do banco + ordem narrativa + cortes +
texto queimado na paleta da marca quando a Aline quiser. Entrega: MP4 único
pronto pra postar (áudio/música ela escolhe no app do Instagram) + clipes
soltos caso queira editar no CapCut.
