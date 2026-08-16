# Biblioteca de clipes

Todo clipe gerado serve a qualquer roteiro. O motor (`montar-video-h.py`)
aceita uma lista de `clipes` de fontes diferentes, então dá pra fechar uma
receita com a cena do laboratório, ou ilustrar "adoro cozinhar" com o
preparo do mousse.

Os arquivos ficam em `broll/video/`, fora do Git (o repositório é
público). O mapa de nomes está em `video/biblioteca.json`.

## O acervo, em 9:16

| nome | dur | o que tem |
|---|---|---|
| `centrifuga` | 20s | centrífuga (0-9s), micro+monitor (10-16s), cozinha (17-19s) |
| `micro` | 20s | monitor atravessado (0-5s), **microscópio (6-19s)** |
| `lab` | 15s | bancada com laudo, chá, bioimpedância, cozinha com bowl |
| `bolo` | 20s | cozinha, ela atrás do bolo (0-9s), depois zoom no rosto |
| `mousseA` | 19s | preparo: cacau, melado, canela, leite, verde virando marrom |
| `mousseB` | 20s | ingredientes, macro do cacau, abacate com azeite, finalização |
| `aveia1` | 15s | aveia, chia e melado, leite caindo, mistura |
| `aveia2` | 15s | geladeira, manga, nozes, colherada |
| `aveia3` | 15s | aveia caindo, leite, mistura, manga |
| `consult1` | 12s | consultório, blusa creme, laudo na mesa |
| `consult2` | 6s | consultório, ela ao computador |
| `consult3` | 6s | consultório; **os 3s iniciais mostram o verso do monitor** |

Total: ~183s de material aproveitável.

## O que isso resolve

Antes eu esticava um clipe curto com câmera lenta pesada pra alcançar a
duração da narração — o microscópio ficava parado tempo demais e a comida
não batia com a fala da receita. Cruzando o acervo, o "Meu dia" saiu a
**velocidade natural**, e as receitas caíram de 0,51× para ~0,80×.

## Trechos a evitar

- `micro` 0-6s: o monitor atravessa o quadro
- `consult3` 0-3s: verso do monitor
- `centrifuga` 10-16s: micro em zoom exagerado
- `centrifuga` 17-19s: enquadramento da cozinha que ela não gostou
- `consulta.mp4` (16:9) 40,5-44s: o sorriso que a IA deformou
