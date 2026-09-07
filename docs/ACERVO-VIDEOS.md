# Acervo de vídeos e fotos da Aline — regras de triagem

Ela tem anos de material no iPhone (Zefa, Canadá, viagens, comida, consultório).
Muita coisa serve de **B-roll** e de **coletânea**, não de post inteiro.

Este documento existe pra qualquer sessão futura poder triar sem perguntar de novo.

## Como o material chega

O container não enxerga a galeria do iPhone. O caminho é o **Google Drive**:
ela sobe pelo app, e a sessão lê pelo conector do Drive.

**Como selecionar muito de uma vez no iPhone (app Fotos → Drive):**
1. Fotos → **Selecionar** → toque no primeiro item e **arraste o dedo** pela
   grade (não toque um a um; arrastando ele vai marcando em bloco).
2. Botão de compartilhar → **Drive**.
3. Escolher a pasta e **Enviar**.

Alternativa melhor pra lote grande: no app do **Google Drive**, botão **+** →
**Fazer upload** → **Fotos e vídeos** → selecionar em bloco. Esse caminho
mantém a qualidade original e não passa pela folha de compartilhamento.

⚠️ **Enviar no Wi-Fi e com o telefone na tomada.** Vídeo de iPhone é HEVC e
pesa; um lote de 50 vídeos passa fácil de 5 GB. O upload continua em segundo
plano, mas o app precisa ficar aberto em alguns iOS.

## Critérios de triagem (Aline, 06/09/2026)

### ❌ Descartar
- **Vídeo falando direto pra câmera.** É conteúdo pronto — ou já foi ao ar, ou
  o assunto envelheceu. Não reaproveita.
- **Vídeo já salvo com legenda queimada.** Legenda de outra época, outro
  formato, outra oferta. Não reaproveita.

### ✅ Guardar
- **Comida.** Prato, preparo, mesa, mercado. Uns são visivelmente mais bonitos
  que outros — na dúvida, guarda, a escolha fina é dela.
- **Paisagem.** Lago, árvores, neve, estrada, céu. Serve de respiro em vídeo
  falado e de fundo de citação.
- Guardar **só se casa com os temas** do calendário (ver `CALENDARIO-EDITORIAL.md`).

### 🎞️ Caso especial — coletânea
Vídeos antigos **dela** (época da Zefa, começo do Canadá): ela bebendo chá,
explicando alguma coisa, andando, cozinhando. Desses **não** se aproveita o
vídeo inteiro — se tira **frames** pra montar coletânea, como a da história
dela. Serve pra "quem eu era" / linha do tempo / prova de tempo de estrada.

## Pastas de saída

A triagem devolve organizada em três pastas:

| Pasta | O que entra |
|---|---|
| `comidas/` | B-roll de alimento, preparo, mesa, feira |
| `aline-reaproveitaveis/` | Ela em cena, sem falar pra câmera — vira frame de coletânea |
| `paisagens/` | Lago, árvores, neve, cidade, estrada |

Fora dessas três, nada é apagado: o que não classifica fica onde está, e a
sessão diz o que foi para cada lugar e por quê.

## Como a triagem é feita tecnicamente

`ffmpeg` não vem instalado no container, mas está disponível assim:

```
pip install imageio-ffmpeg
# binário em:
# /usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
```

Dele se extrai um quadro a cada N segundos, e os quadros é que são olhados —
não o vídeo inteiro. Um vídeo de 30s vira 4 ou 5 imagens, o que é suficiente
pra dizer se é comida, paisagem, ela falando pra câmera ou legenda queimada.

🔴 **Legenda queimada só aparece no quadro.** Não existe metadado que diga
isso — é preciso olhar. Por isso a extração de quadros não é opcional.
