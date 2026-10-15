# Moldes dos vídeos de marca

Os moldes vêm do Claude Design (HTML "bundled": o template mora num
`<script type="__bundler/template">` e cada recurso num `__bundler/manifest`
em base64 + gzip). Antes de ir pra `apps/franquias/public/videos-marca/`
eles passam por um ajuste:

- `patch_fto.py <FTO_Marca.html> <saida>`: põe a cor padrão no COL (sem ela o
  molde quebrava ao abrir sem `?primaria=`) e desliga legenda e editor.
- `patch_clock.py <Gene_CLOCK.html> <saida>`: o CLOCK veio sem marca; copia o
  prelúdio de marca do FTO (precisa do FTO desempacotado em `fto/res/` com
  `unpack.py`), troca tiffany/roxo e as tintas pelas cores da marca, troca a
  logo fixa por `LOGO()` e desliga legenda e editor. Sol, laranja, vermelho e
  amarelo ficam como estão.
- `repack.py`: lê e regrava o bundle. 🔴 Ao regravar o JSON, `</` vira
  `</`, senão o `</script>` dentro do template fecha o bloco e o molde
  não abre.

Molde novo: ajustar, copiar pra `public/videos-marca/`, gerar a prévia com
`packages/video-marca/render.cjs <url> <saida.jpg> --poster <segundo>` e
acrescentar em `VIDEOS_MARCA` (apps/franquias/src/lib/videos/marca.ts).
Mudou um molde que já existe: suba `versao`, que refaz o vídeo de todo mundo.
