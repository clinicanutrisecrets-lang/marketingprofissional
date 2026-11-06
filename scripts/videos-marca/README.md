# Moldes dos vídeos de marca

Os moldes vêm do Claude Design (HTML "bundled": o template mora num
`<script type="__bundler/template">` e cada recurso num `__bundler/manifest`
em base64 + gzip). Antes de ir pra `apps/franquias/public/videos-marca/`
eles passam por um ajuste:

- `patch_marca.py <entrada.html> <saida.html> <uuid do .jsx standalone>`:
  adapta um vídeo feito SEM marca (o FTO lúdico e o CLOCK vieram assim).
  Põe o prelúdio de marca (`preludio_marca.js`: lê `?primaria=&secundaria=&logo=`
  e deriva as tintas), troca tiffany/roxo, as tintas e os degradês pelas cores
  da marca, troca a logo fixa por `LOGO()` e liga a legenda escrita e desliga o editor. Sol,
  laranja, vermelho, amarelo e as cores da comida ficam como estão. O uuid é o
  do `*-standalone.jsx` que aparece no `x-import` do template (`unpack.py` mostra).
- `repack.py`: lê e regrava o bundle. 🔴 Ao regravar o JSON, `</` vira
  `</`, senão o `</script>` dentro do template fecha o bloco e o molde
  não abre.

Molde novo: ajustar, copiar pra `public/videos-marca/`, gerar a prévia com
`packages/video-marca/render.cjs <url> <saida.jpg> --poster <segundo>` e
acrescentar em `VIDEOS_MARCA` (apps/franquias/src/lib/videos/marca.ts).
Mudou um molde que já existe: suba `versao`, que refaz o vídeo de todo mundo.

## Vídeos que fecham com o NOME da profissional (Black Friday, 06/11/2026)

- `patch_nome.py <entrada.html> <saida.html>`: para os vídeos feitos com o
  `video-kit` do Claude Design que trazem `nome`/`crn` nos tweaks (concepção,
  gestação, nutrigenética). O molde passa a ler `?nome=&registro=` (o
  registro vem pronto do servidor: "Nutricionista · CRN 10607/PR", ou nada),
  tira o "Nutricionista" fixo, troca a logo do Scanner pela de `?logo=` (sem
  logo a pílula some) e desliga o editor. As cores ficam as do vídeo.
- No catálogo, esses entram em `VIDEOS_BLACK_FRIDAY` com `comNome: true`, e o
  nome e o CRN passam a fazer parte da assinatura (trocou no cadastro, refaz).
