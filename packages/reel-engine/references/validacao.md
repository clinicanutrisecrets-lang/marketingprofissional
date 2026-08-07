# Validação de layout

A visualização de imagem às vezes não renderiza. Não confiar nela como única
verificação, validar por análise de pixels antes de entregar.

## Mapa textual

`assets/engine/mapa.py` reduz o frame a uma grade de caracteres, cada símbolo
sendo a cor dominante daquele bloco de ~20px. Permite "ver" a estrutura.

```bash
python3 assets/engine/mapa.py frame.jpg | sed -n '10,60p'
```

Legenda: `H` cabelo · `S` pele · `B` blusa · `K` ink · `W` branco ·
`R/A/M/T/X/O` acentos (coral, âmbar, mostarda, tiffany, roxo, rose) ·
`.` `,` `~` `=` fundos.

O que procurar:

- **Rosto**: precisa haver uma região contínua de `S` do meio da testa até o
  queixo, com `H` só emoldurando as laterais. Se `H` domina o centro, a franja
  está grande demais.
- **Card vs figura**: conferir se sobram colunas livres entre o card e a figura
  para a seta passar.
- **Overflow**: nenhuma linha de conteúdo abaixo de y 1590.

## Sonda de pixel

Para elementos finos (setas, glifos) o mapa não resolve, a linha some na média
do bloco. Sondar a cor exata numa janela pequena:

```python
import numpy as np
from PIL import Image
a = np.array(Image.open("frame.jpg").convert("RGB")).astype(int)
win = a[y-4:y+5, x-4:x+5].reshape(-1,3)
dist = np.abs(win - np.array(COR)).sum(axis=1).min()
print("presente" if dist < 110 else "ausente")
```

Verificar sempre:

- os três trechos de cada seta (run vertical, run horizontal, ponto final)
- os glifos de avião e marcador dentro dos badges do CTA
  (contar pixels rose dentro do círculo: > 400 significa que o glifo apareceu)

## Re-render parcial

Se só o texto de algumas cenas mudou, não refazer o vídeo inteiro. Calcular o
offset de frame de cada cena a partir das durações do SPEC e regravar só os
índices afetados por cima dos frames existentes. Um reel completo leva ~8 min de
render; quatro cenas levam ~80s.

## Erros já cometidos, para não repetir

| Sintoma no output | Causa |
|---|---|
| Personagem parece silhueta de luto | corpo em INK chapado sem fade nem traços faciais |
| Rosto minúsculo dentro do cabelo | polígono da franja descendo até a altura dos olhos |
| Texto sem acento e minúsculo | `ImageFont.load_default()`, sempre carregar as TTF |
| Texto ilegível sobre o corpo | legenda embaixo em vez de card lateral opaco |
| Animação lenta ao alongar a cena | entrada calculada com `t = fi/n` em vez de segundos |
| Seta cortando o rosto | cotovelo horizontal-primeiro; usar `mode="v"` |
| Bordas serrilhadas | desenhar em 1×; usar supersampling 2× + `reduce(2)` |
| Timeout do bash no render | render em blocos com `timeout 590`; `nohup &` morre ao fim da chamada |
| Travessão no texto publicado | rodar `grep -n ",\|,"` no SPEC antes de renderizar |
