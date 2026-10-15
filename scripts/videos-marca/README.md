# Moldes dos vídeos de marca

Os moldes vêm do Claude Design (HTML "bundled": o template mora num
`<script type="__bundler/template">` e cada recurso num `__bundler/manifest`
em base64 + gzip). Antes de ir pra `apps/franquias/public/videos-marca/`
eles passam por um ajuste:

- `patch_marca.py <entrada.html> <saida.html> <uuid do .jsx standalone>`:
  adapta um vídeo feito SEM marca (o FTO lúdico e o CLOCK vieram assim).
  Põe o prelúdio de marca (`preludio_marca.js`: lê `?primaria=&secundaria=&logo=`
  e deriva as tintas), troca tiffany/roxo, as tintas e os degradês pelas cores
  da marca, troca a logo fixa por `LOGO()` e desliga legenda e editor. Sol,
  laranja, vermelho, amarelo e as cores da comida ficam como estão. O uuid é o
  do `*-standalone.jsx` que aparece no `x-import` do template (`unpack.py` mostra).
- `repack.py`: lê e regrava o bundle. 🔴 Ao regravar o JSON, `</` vira
  `</`, senão o `</script>` dentro do template fecha o bloco e o molde
  não abre.

Molde novo: ajustar, copiar pra `public/videos-marca/`, gerar a prévia com
`packages/video-marca/render.cjs <url> <saida.jpg> --poster <segundo>` e
acrescentar em `VIDEOS_MARCA` (apps/franquias/src/lib/videos/marca.ts).
Mudou um molde que já existe: suba `versao`, que refaz o vídeo de todo mundo.
