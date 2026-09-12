# Nutri Video AI (packages/video-ai)

Pipeline local, em CLI, que ensina o modelo aberto **Wan 2.2** (hospedado na
**fal.ai**) a gerar clipes de 5 s no visual da Nutri Secrets: um LoRA de
estilo treinado com as SUAS fotos e vídeos. Só um provedor externo (fal),
sem GPU local, sem ComfyUI, sem servidor.

Esta entrega cobre a **Fase 0** (preparar o dataset) e a **Fase 1** (treinar o
LoRA). Geração (Fase 2), Blender (Fase 3) e a tela web (Fase 4) vêm depois
que o primeiro LoRA for aprovado. Briefing completo: pedido da Aline em
12/09/2026 (ver histórico da sessão).

## 1. Instalar e configurar (uma vez)

```bash
# na raiz do monorepo
pnpm install --filter @scanner/video-ai
cd packages/video-ai
cp .env.example .env      # preencha FAL_KEY; ANTHROPIC_API_KEY e Supabase são opcionais
```

O ffmpeg e o ffprobe vêm empacotados (`ffmpeg-static`), não precisa instalar
nada no sistema. Node 20+.

| Variável | Pra quê | Sem ela |
|---|---|---|
| `FAL_KEY` | treino e geração | o treino não roda |
| `ANTHROPIC_API_KEY` | escrever a legenda de cada foto/vídeo (visão) | a legenda sai do NOME do arquivo (aviso) |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | guardar o pacote e o LoRA no bucket privado `video-ai`, espelhar em `aline.video_loras` | o pacote sobe pro storage da fal e o registro fica só em `loras.json` |

## 2. Fase 0: preparar o dataset

Coloque 20 a 40 fotos e vídeos curtos em `datasets/receitas/` (regras em
`datasets/README.md`; **HEIC não entra**, exporte como JPG). Depois:

```bash
pnpm prepare-dataset -- --dataset receitas                # reels, 9:16 (padrão)
pnpm prepare-dataset -- --dataset receitas --formato 16:9
```

O que acontece com cada arquivo:
1. **Normaliza**: 480x832 (ou 832x480), corte central; vídeo vira 16 fps,
   81 quadros (5,06 s), sem áudio, H.264. Vídeo maior é cortado no miolo
   (`--trecho inicio` corta do começo). Foto de celular respeita a orientação.
2. **Legenda**: o modelo descreve cena, ângulo, luz, cores e, no vídeo, o que
   se move entre três quadros (início, meio, fim). Uma frase, em português,
   sem travessão. Toda legenda começa pela frase-gatilho **`nutrisecrets
   style`** (troque em `VIDEO_AI_TRIGGER` ANTES de treinar; depois não).
3. **Empacota** `preparado/` num `.zip` (arquivo + `.txt` de mesmo nome, como
   o trainer exige) e **sobe** pro Supabase Storage. O manifesto
   `datasets/receitas/dataset.json` guarda hash, legenda e o pacote enviado.

Rodar de novo só refaz o que mudou (hash do arquivo). Flags:
`--forcar` (refaz tudo), `--sem-legenda` (não chama o modelo),
`--sem-upload` (só zipa; o treino exige pacote enviado).

**Confira as legendas** em `datasets/receitas/preparado/*.txt` antes de
treinar. Pra corrigir uma à mão: edite o `.txt` E o campo `legenda` no
`dataset.json` (marque `legenda_fonte: "manual"`), depois rode de novo com
`--sem-legenda` pra reempacotar. Legenda errada ensina o estilo errado.

Repita pra `datasets/ciencia/` quando os renders do Blender existirem (Fase 3).

## 3. Fase 1: treinar o LoRA

```bash
pnpm train -- --dataset receitas --steps 2000
pnpm train -- --dataset receitas --variacoes 1500,2000,3000   # 3 treinos em paralelo na fila
pnpm train -- --dataset receitas --modo i2v --steps 2000       # LoRA pro imagem → vídeo (exige ≥ 1 vídeo)
```

- Endpoint `fal-ai/wan-22-trainer/t2v-a14b` (ou `i2v-a14b`), learning rate
  0.0002 (`--lr`), frase-gatilho do manifesto.
- Entra na fila da fal e o terminal mostra os logs do treino até acabar. Se
  fechar o terminal, o script imprime o comando pra retomar:
  `pnpm train -- --dataset receitas --retomar <request_id>,<request_id>`.
- No fim grava em **`loras.json`** (versionado, é a fonte de verdade) e em
  `aline.video_loras` (migração `supabase/migrations/aline/013_video_ai.sql`),
  com a URL do `lora_file`, uma cópia em `video-ai/loras/<nome>.safetensors`
  (`--sem-copia` desliga) e o **custo estimado** = passos × US$ 0,004
  (`FAL_PRECO_PASSO_USD` ajusta).

Custo de referência: 2000 passos ≈ US$ 8; as três variações ≈ US$ 26.

Comparar as variações é o próximo passo (Fase 2): um grid com 4 prompts fixos,
mesma seed, um LoRA por coluna. Quem ganha vira `aprovado = true` na tabela.

## 4. Como me mandar as fotos e os vídeos modelo

Duas formas, qualquer uma serve:

1. **Pasta no Google Drive** compartilhada com a conta da clínica, com o nome
   do dataset (ex.: `Nutri Video AI - receitas`). Eu baixo pra
   `datasets/receitas/`, rodo o preparo, te mostro as legendas e só treino
   depois do seu ok.
2. **No seu computador**: copie os arquivos pra `packages/video-ai/datasets/receitas/`
   e rode os dois comandos acima.

O que faz o LoRA sair bom: **mesma luz** (janela lateral), **mesma paleta**
(bege creme, tiffany, magenta em detalhe), **mesma louça**, fundo limpo.
Vídeos curtos com movimento simples (vapor, corte, fio de mel, câmera lenta)
ensinam o movimento; fotos ensinam a cor e a luz. Evite texto, logo e mãos
em destaque (o modelo tenta copiar tudo).

## 5. Testes e verificação

```bash
pnpm test        # regras puras: formato, legenda, custo, pacote, trava do i2v
pnpm typecheck
```

O que ainda **não** foi exercitado de ponta a ponta nesta entrega: uma
chamada real ao trainer da fal e uma legenda real pelo modelo (a sessão não
tinha as chaves). O preparo foi conferido com mídia sintética: 480x832,
16 fps, 81 quadros, zip plano, segunda rodada reaproveitando tudo.

## Estrutura

```
packages/video-ai/
├── src/prepare-dataset.ts   # Fase 0
├── src/train-lora.ts        # Fase 1
├── src/lib/regras.ts        # regras puras (testadas)
├── src/lib/ffmpeg.ts        # normalização + quadros
├── src/lib/legendar.ts      # legenda por visão (Anthropic)
├── src/lib/storage.ts       # Supabase Storage (bucket privado) ou storage da fal
├── src/lib/registro.ts      # loras.json + aline.video_loras
├── datasets/<nome>/         # mídia crua (fora do git) + dataset.json (no git)
├── loras.json               # registro dos LoRAs treinados
└── .env.example
```
