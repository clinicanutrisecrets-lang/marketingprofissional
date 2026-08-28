# Como pedir um vídeo em outra sessão

Tudo que monta os vídeos está neste repositório e funciona em qualquer
sessão. **O que não viaja são os clipes.** Eles ficam na pasta de uploads
da sessão em que foram enviados, e essa pasta morre com a sessão. Por isso
a primeira parte deste guia é sobre onde guardar o material, não sobre o
prompt.

---

## 1. Onde o material precisa estar

Duas opções, e a segunda é a que resolve de vez.

**Reenviar na conversa.** Funciona sempre e não depende de nada. O custo é
subir os mesmos arquivos de novo toda vez.

**Google Drive.** Uma pasta só, com nome fixo, e qualquer sessão com o
conector do Drive ligado acha e baixa sozinha. Sugestão de estrutura:

```
Nutri Secrets/
  broll/
    consultorio/    consult1.mp4, consult2.mp4, lab.mp4, centrifuga.mp4, micro.mp4
    receitas/       mousseA.mp4, mousseB.mp4, aveia1.mp4, aveia2.mp4,
                    aveia3.mp4, salmao.mp4, bolo.mp4
    audios/         narracoes gravadas por ela
```

Vale renomear os arquivos para os apelidos que a biblioteca usa
(`consult1`, `lab`, `mousseA`…). Hoje eles têm nome de hash e ninguém
consegue pedir "usa o lab" olhando para
`6bb801d9-hf_20260812_201657_a1ca2a81…mp4`.

---

## 2. O prompt para colar

Depois que a pasta existir, é isso, sem adaptação:

> Clone o repositório `clinicanutrisecrets-lang/marketingprofissional` e
> leia `apps/aline/broll/` inteiro, começando por `BIBLIOTECA-CLIPES.md`,
> `GUIA-HIGGSFIELD-SITE.md` e `README.md`. Eles explicam a marca, as regras
> de montagem e os defeitos conhecidos de cada clipe.
>
> Meu B-roll está no meu Google Drive, em `Nutri Secrets/broll`. Baixa tudo
> e refaz o `video/biblioteca.json` apontando para os arquivos baixados,
> mantendo os apelidos que já estão lá.
>
> Depois monta [DESCREVE O VÍDEO AQUI] e me entrega o mp4 aqui na conversa.
>
> Use `montar-video-h.py` com um roteiro JSON, como os que estão em
> `roteiros/`. Antes de renderizar, rode o aviso de repetição e resolva o
> que ele apontar.

Se for reenviar os arquivos em vez de usar o Drive, troca o segundo
parágrafo por: *"Vou subir os clipes aqui na conversa. Monta o
`video/biblioteca.json` com os caminhos deles."*

---

## 3. O que a sessão precisa ter instalado

O motor depende de coisas que não estão no repositório. Peça para a sessão
conferir e instalar antes:

```bash
# ffmpeg com zscale e tonemap (o vídeo de iPhone é HDR)
ffmpeg -hide_banner -filters | grep -E "zscale|tonemap"

# detector de rosto YuNet — usa o media.githubusercontent, não o raw:
# no raw vem um ponteiro de LFS de 131 bytes, não o modelo
sudo mkdir -p /usr/local/share/yunet && sudo curl -fsSL -o /usr/local/share/yunet/yunet.onnx \
  https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx

# transcrição, quando houver áudio dela
pip install faster-whisper opencv-python pillow fonttools

# fontes: Montserrat (marca), Playfair Display (títulos de conteúdo),
# EB Garamond (vídeos pessoais)
```

Se faltar a Playfair estática, ela é gerada da variável com
`fontTools.varLib.instancer`.

---

## 4. O que NÃO pedir

**Não peça para commitar clipe, foto ou áudio.** O repositório é público.
As pastas de mídia já estão no `.gitignore` e deve continuar assim.

**Não peça vídeo de família aqui.** O montador de memória
(`montar-memoria.py`) é genérico e pode ficar no repositório, mas o roteiro
com nome, data e os arquivos do Alexander não entram. Isso fica só na
conversa.

---

## 5. Os dois montadores

| Arquivo | Para quê | Como corta |
|---|---|---|
| `montar-video-h.py` | reel de conteúdo, anúncio, consulta | corte seco, porque o que importa é a informação |
| `montar-memoria.py` | mesversário, retrospectiva, homenagem | dissolvência, porque a passagem entre momentos é o assunto |

O de conteúdo lê `roteiros/*.json` e faz sozinho: legenda que desvia do
rosto e prefere o vão do meio, correção do vocabulário de gene, aviso de
plano repetido e de trecho que atravessa virada de cena.

O de memória faz sozinho: tone mapping do HDR do iPhone, zoom lento em
foto parada, recorte 9:16 com foco declarado, e a duração de cada cena
calculada pelo tamanho da frase que ela carrega.

---

## 6. Como ele entrega o vídeo na conversa

Não tem segredo nem ferramenta especial: o mp4 é escrito em disco e
enviado na conversa como arquivo. O limite é **30 MB**, então vídeo longo
precisa de uma passada de compressão antes:

```bash
ffmpeg -i saida.mp4 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -movflags +faststart saida-leve.mp4
```

Um reel de 60 a 80 segundos em 1080x1920 sai por volta de 20 MB com
`-crf 26`, sem perda visível no celular. As tags de cor não são enfeite:
sem elas o Instagram reinterpreta e a imagem esverdeia.
