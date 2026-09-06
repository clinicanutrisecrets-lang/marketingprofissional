# @scanner/corte-ia

Gravação do teleprompter (até 60 s) → reel 9:16 editado, sem editor.

Fluxo completo:

1. **App** (`apps/franquias/src/lib/corte/`): a nutri grava no teleprompter com
   cronômetro de 60 s; ao parar, o vídeo bruto sobe direto do navegador pro
   bucket `videos-biblioteca` (URL assinada) e uma linha entra em `cortes_ia`.
   A plataforma dispara o workflow `render-corte.yml`.
2. **Worker** (`pipeline.py`, GitHub Actions):
   - normaliza o vídeo (fps fixo, MP4)
   - transcreve local com faster-whisper (timestamp por palavra)
   - pede o **plano** pro Claude: capa, palavra-chave por trecho, b-roll do
     catálogo (`videos_franqueada` da nutri + `acervo_videos`, o acervo
     compartilhado com o Studio Aline) e correções de termos técnicos
   - renderiza (`render.py`) e sobe o MP4 pro bucket `franqueadas-assets`
   - marca `pronto` ou `erro` na tabela
3. **App**: a aba Vídeos lista os cortes com status e se atualiza sozinha.

## Template visual (`render.py`)

- Capa gigante nos 3 primeiros segundos (assunto em Tiffany, complemento em branco).
- Palavra-chave grande no topo, trocando por trecho, com fade e zoom.
- Legendas palavra a palavra alternando por frase: grande em caixa alta embaixo
  (palavra falada em âmbar com "pulo") e pílula arredondada (palavra falada em
  itálico), ora sobre o vídeo, ora abaixo da palavra-chave.
- B-roll entra por corte seco, 3 a 6 s, nunca nos 3 s iniciais nem nos 4 s finais.
- Vídeo em pé preenche a tela (faixas escuras semitransparentes atrás dos textos).
  Vídeo deitado vira faixa central sobre fundo azul-marinho.
- Áudio normalizado pra -16 LUFS, fade de saída, barra de progresso no rodapé.

Fontes: Inter e Fraunces do `reel-engine` (variáveis). Como libass não
sintetiza negrito em fonte variável, o render gera instâncias Bold/Black em
tempo de execução com fontTools.

## Rodar local

```bash
pip install faster-whisper anthropic fonttools requests
export SB_URL=... SB_KEY=... ANTHROPIC_API_KEY=...
python3 packages/corte-ia/pipeline.py --corte-id <uuid>

# só o render, com transcrição e plano prontos:
python3 packages/corte-ia/render.py --video in.mp4 --transcricao t.json \
  --plano plano.json --broll-dir ./broll --handle @fulana --out saida.mp4
```

## Liberação

Teste fechado: só e-mails em `CORTE_IA_EMAILS` (padrão: conta da Aline).
`CORTE_IA_EMAILS=*` abre pra todas. `CORTE_BROLL_FRANQUEADA_ID` aponta a
franqueada dona da biblioteca de coringas compartilhada (ver
`docs/broll-coringas.md`).
