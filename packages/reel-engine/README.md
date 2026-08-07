# @scanner/reel-engine

Motor de **reels animados 9:16** (1080×1920, MP4) em Python/PIL + ffmpeg.
Origem: skill "nutri-secrets-reel" criada pela Aline no Claude (ver
`ORIGEM-SKILL.md`). Zero IA de imagem — cada frame é desenhado em código,
determinístico e com custo apenas de CPU.

## Formato

Reel "Detetive da Saúde": gancho → sintomas anotados sobre personagem →
genes com rsID → sinergias de alimentos com quantidades → exame de sangue →
microbiota → virada → CTA. Estrutura completa (~14 cenas) dura ~2min;
versões de 30s/60s = SPEC com menos blocos (1 sintoma+gene+sinergia ≈ 35s;
2 blocos ≈ 60s).

## Uso local

```bash
pip install pillow numpy && apt install ffmpeg
python3 engine/render_cli.py spec.json saida.mp4 --handle @fulana [--anuncio]
```

O SPEC é JSON declarativo — ver `engine/spec_exemplo_menopausa.py`.
Render: ~20s por cena (~5-7 min o reel completo).

## Worker sem servidor (GitHub Actions)

`.github/workflows/render-reel.yml` renderiza sob demanda e sobe o MP4 no
Supabase Storage (`franqueadas-assets`). A plataforma dispara via API do
GitHub (workflow_dispatch) passando o SPEC em base64. Secrets necessários
no repo: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE`.

## Parametrização por marca

- `--handle @fulana` — assinatura no rodapé
- `SPEC.assinatura` — nome/CRN exibidos
- `SPEC.cor_tema` — AMBER | CORAL | MUSTARD | TIFFANY | ROXO | ROSE | INK
- `--anuncio` + `build.CARIMBO` — versão para tráfego pago

## Quem escreve o SPEC

Um agente Claude (mesmo padrão do `gerador-sugestoes`): recebe tema + nicho,
valida associações gene/sintoma/alimento e devolve o JSON. Custo do SPEC:
~US$ 0,05–0,10 por reel. Render: R$ 0.
