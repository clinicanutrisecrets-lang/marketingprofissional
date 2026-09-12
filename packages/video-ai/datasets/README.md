# Datasets do Nutri Video AI

Uma pasta por estilo. Jogue aqui as fotos e os vídeos curtos (≤ 5 s) que
representam o visual que o LoRA tem que aprender:

```
datasets/
  receitas/   ← 20 a 40 fotos/vídeos: mesma luz, mesma paleta, mesma louça
  ciencia/    ← renders de DNA, moléculas, bactérias (vêm do Blender, Fase 3)
```

Regras:
- **JPG, PNG, WebP** para foto; **MP4, MOV, WebM, M4V** para vídeo.
- **HEIC não entra** (o conversor não lê). No iPhone: Ajustes → Câmera →
  Formatos → *Mais compatível*, ou exporte como JPG antes de copiar.
- O **nome do arquivo vira a legenda de emergência** quando não há chave da
  Anthropic (`brownie-cacau-close-corte.mp4` → "brownie cacau close corte,
  vídeo curto, …"). Com a chave, o modelo descreve a cena e o nome só ajuda.
- Vídeo maior que 5 s é cortado no **miolo** (`--trecho inicio` corta do começo).
  Vídeo em pé de celular sai em pé (a orientação é respeitada).
- O que fica versionado é só o `dataset.json` de cada pasta (hash, legenda e
  onde o pacote está). Mídia, `preparado/`, `frames/` e `zips/` ficam fora do git.
