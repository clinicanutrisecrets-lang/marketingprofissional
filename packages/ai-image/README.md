# @scanner/ai-image

Renderer de imagens geradas por IA pra feed, carrossel e stories do Instagram. Substitui Bannerbear e parte do uso do Creatomate (Creatomate segue só pra vídeo/reels).

## Providers suportados

- **OpenAI `gpt-image-1`** (env `OPENAI_API_KEY`) — qualidade máxima, ~$0,19/img
- **Google `gemini-2.5-flash-image`** (Nano Banana, env `GEMINI_API_KEY`) — ~$0,04/img, permite image-ref entre slides do mesmo carrossel

## Modo B (default): IA + Sharp overlay

A IA gera apenas o visual (safe-zone reservada por instrução no prompt). O Sharp insere texto em cima com fonte controlada (Georgia serif + sans-serif), cor da marca e hierarquia consistente. Zero risco de acento errado em português.

## Uso

```ts
import { renderImagemIA, renderCarrossel } from "@scanner/ai-image";

// Feed estático
const r = await renderImagemIA({
  tipo: "feed_imagem",
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY!,
  brand: {
    nomeMarca: "Dra. Ana Lima",
    corPrimariaHex: "#2F5D50",
    logoUrl: "https://.../logo.png",
    tomVisual: "editorial de saúde, sofisticado",
    nicho: "nutrição funcional e nutrigenética",
  },
  conteudo: {
    eyebrow: "Nutrição de Precisão",
    headline: "Seu metabolismo guarda segredos. A gente desvenda.",
    cta: "Falar com a gente",
  },
});
// r.buffer → PNG 1080x1080 pronto pra upload

// Carrossel (consistência visual entre slides)
const slides = await renderCarrossel({
  provider: "gemini",
  apiKey: process.env.GEMINI_API_KEY!,
  brand: {...},
  slides: [
    { eyebrow: "Você sabia?", headline: "Intestino produz 90% da serotonina" },
    { headline: "Da disbiose à ansiedade", corpo: "Nervo vago conecta..." },
    // ...
  ],
});
// slides[i].buffer → PNG 1080x1350 por slide
```

## Tipos

- `feed_imagem` → 1080x1080 (1:1)
- `feed_carrossel` → 1080x1350 (4:5)
- `stories` → 1080x1920 (9:16)

## Custos estimados

| Provider | Por imagem | Uso típico | Custo/mês |
|---|---|---|---|
| OpenAI (gpt-image-1) | ~$0,19 | Studio Aline (~150 imgs) | ~$30 |
| Google (Nano Banana) | ~$0,04 | Franquias (~5k imgs) | ~$200 |

Bannerbear pra aposentar: $49/mês fixo.

## Safe-zones por tipo

- `feed_imagem`: terço inferior (42% da altura)
- `feed_carrossel`: 45% inferior
- `stories`: banda vertical central (35-75%)
