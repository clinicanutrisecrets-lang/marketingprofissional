# @scanner/corte-ia

Gravação do teleprompter (até 60 s) **ou vídeo do celular (até 3 min)** →
reel 9:16 editado, sem editor.

Dois modos, um worker só:

| modo | entra | sai |
|---|---|---|
| `fala` (o de sempre) | gravação com voz | reel legendado, com b-roll e limpeza |
| `clipe_frase` | um clipe da biblioteca + uma frase | vídeo curto 9:16 com a frase grande em cima |

O `clipe_frase` (`clipe_frase.py`) **não passa por transcrição, limpeza nem
plano do Claude** — não há fala pra transcrever. Ele baixa o clipe, escreve a
frase e sobe: leva segundos e custo de modelo ZERO. A URL do clipe é
resolvida no worker a partir do id (`videos_franqueada` da nutri ou
`acervo_videos`); aceitar o endereço vindo da tela transformaria o worker num
buscador de qualquer endereço da internet.

Fluxo completo (modo `fala`):

1. **App** (`apps/franquias/src/lib/corte/`): a nutri grava no teleprompter com
   cronômetro de 60 s; ao parar, o vídeo bruto sobe direto do navegador pro
   bucket `videos-biblioteca` (URL assinada) e uma linha entra em `cortes_ia`.
   A plataforma dispara o workflow `render-corte.yml`.
2. **Worker** (`pipeline.py`, GitHub Actions):
   - normaliza o vídeo (fps fixo, MP4)
   - transcreve local com faster-whisper (timestamp por palavra)
   - **limpa** (`limpeza.py` + `recorte.py`): tira pausa morta, falsa partida
     e hesitação, e remapeia a transcrição pro novo tempo
   - pede o **plano** pro Claude: capa, palavra-chave por trecho, b-roll do
     catálogo (`videos_franqueada` da nutri + `acervo_videos`, o acervo
     compartilhado com o Studio Aline) e correções de termos técnicos
   - sem b-roll no catálogo, busca no banco de imagem (`broll_pexels.py`)
   - **filtra** a imagem, se a nutri pediu (`packages/video-filtro`)
   - renderiza (`render.py`) no **estilo de legenda** escolhido e sobe o MP4
     pro bucket `franqueadas-assets`
   - marca `pronto` ou `erro` na tabela
3. **App**: a aba Vídeos lista os cortes com status e se atualiza sozinha.

## Limpeza da gravação (`limpeza.py`)

Tira pausa, "ãã" e frase recomeçada. **A transcrição propõe, o áudio
confirma**: buraco no reconhecimento não é prova de silêncio, então todo corte
de pausa é a interseção entre o buraco e o silêncio medido no áudio
(`ffmpeg silencedetect`). Sem essa medição o módulo fica desconfiado.

As travas estão escritas no topo do arquivo e provadas em `test_limpeza.py`
(as três principais foram conferidas **vermelhas** sem o conserto). Resumo:
corte sempre cai em silêncio; primeira e última palavra nunca somem; remoção
de FALA tem teto próprio; estourou o teto, não corta nada e diz por quê.

## Filtro e estilo de legenda

A nutri escolhe na hora de gravar (faixa embaixo da câmera, como no Instagram):

| filtro | o que faz |
|---|---|
| `nenhum` | imagem como a câmera gravou |
| `pele` | pele, cabelo e dentes. Não desenha nada no rosto: serve pra qualquer pessoa |
| `completo` | o de cima + batom vinho e delineador levantado (o olho de gatinho) |

🔴 **Não há prévia ao vivo.** O filtro roda no worker, depois. A tela diz isso
em vez de fingir um efeito que não é o que vai sair.

Estilos de legenda em `legenda_estilos.py` (`classica`, `editorial`,
`impacto`). A `classica` é o default e o fallback, e `golden/classica.ass`
prova que ela saiu byte a byte igual à versão anterior a esta mudança.

## Regras de conteúdo

O corte segue `docs/REGRAS-CONTEUDO.md` (seção 2, Vídeo). O que está codificado
aqui e **não deve ser afrouxado sem mudar o documento antes**:

| Regra | Onde vive |
|---|---|
| 2.1 rosto é a base, b-roll é retomada (máx. 25% do vídeo) | `SYSTEM_PLANO`, `timeline()` |
| 2.2 um corte a cada 2 a 4 s | `cadenciar()` + `CORTE_MAX_SEG` |
| 2.3 promessa nos 2 primeiros segundos (capa sai em 2 s) | `COVER_SEG` |
| 2.4 legenda de duas linhas, fonte grande, **sem sombra** | estilos `Cap`/`PillTxt` |
| 3. sem "IA" (é "algoritmo Scanner"), CFN, sem prazo, sem adoçante | `SYSTEM_PLANO` |

Como a gravação tem um ângulo só, o corte a cada 2 a 4 s no trecho de rosto é
um **punch-in** (aproxima e afasta) — a regra aceita close e mudança de ângulo
como corte.

## Template visual (`render.py`)

- Capa gigante nos 2 primeiros segundos (assunto em Tiffany, complemento em branco).
- Palavra-chave grande no topo, trocando por trecho, com fade e zoom.
- Legendas palavra a palavra alternando por frase: grande em caixa alta embaixo
  (palavra falada em âmbar com "pulo") e pílula arredondada (palavra falada em
  itálico), ora sobre o vídeo, ora abaixo da palavra-chave. Sem sombra.
- B-roll entra por corte seco, 2 a 3 s, nunca nos 3 s iniciais nem nos 4 s finais.
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

⚠️ Em 21/09/2026 o acervo de b-roll estava **vazio** (zero linha nas três
tabelas) e o worker **nunca tinha rodado uma vez**. Enquanto os clipes da
Aline não sobem, `PEXELS_API_KEY` é o que garante retomada no vídeo;
`scripts/seed-acervo-broll.py` enche o acervo a partir do documento dos 40
coringas.
