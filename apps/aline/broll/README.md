# Studio Aline — B-roll Reels (Higgsfield Soul ID)

Fluxo de geração de B-roll da Aline para Reels do **@nutri_secrets**.
Escopo: **somente o Instagram pessoal da Aline** — nada aqui alimenta o
`apps/franquias`.

Clipes sem fala, sem lip sync e sem áudio. O texto entra depois, no CapCut.

## Status do setup

| Etapa | Status |
|---|---|
| Skill `higgsfield-soul-id` instalada no repo (`.agents/skills/`) | feito |
| CLI `higgsfield` (v1.1.9) | instalar por sessão, ver abaixo |
| Login na conta Higgsfield | **pendente — precisa da Aline** |
| Confirmar plano pago (Soul ID exige Basic+) e saldo de créditos | pendente (depende do login) |
| Fotos de treino em `fotos-treino/` | **pendente — precisa da Aline** |
| Revisão das fotos (sombra pesada, rosto cortado, óculos escuros, foco ruim) | pendente |
| Treinar Soul ID `aline` (variante `--soul-cinematic`, uso final é vídeo) | pendente |
| Gerar frames estáticos → aprovação da Aline | pendente |
| Mostrar custo estimado do lote → ok da Aline | pendente |
| Animar (Kling 3.0, image-to-video) e salvar em `saida/` | pendente |

## Instalar o CLI (em cada sessão remota)

O proxy da sessão bloqueia `api.github.com`, então o installer não descobre a
release sozinho. Descubra a tag e passe explícita:

```bash
git ls-remote --tags https://github.com/higgsfield-ai/cli.git | tail -1
curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh \
  | sh -s -- --tag v1.1.9 --prefix=$HOME/.local
export PATH=$HOME/.local/bin:$PATH
```

Se a skill não aparecer na sessão, reinstale com
`npx skills add higgsfield-ai/skills --skill higgsfield-soul-id`
(o comando antigo com `--skill` ainda funciona; o recomendado hoje é
`npx skills add higgsfield-ai/skills`).

## Login (bloqueio atual)

`higgsfield auth login` abre OAuth no navegador — não funciona em sessão
remota. Opções:

1. **Local**: rodar `higgsfield auth login` numa sessão do Claude Code na
   máquina da Aline e tocar o fluxo de lá.
2. **Remota**: autenticar localmente, rodar `higgsfield auth token` e colar o
   token na conversa da sessão remota (o token é sensível — nunca commitar).

Depois do login: `higgsfield account status` para confirmar plano (Basic+)
e créditos **antes de gerar qualquer coisa**.

## Fotos de treino (`fotos-treino/`)

Pedido original: 20 a 25 fotos. **O Soul ID aceita no máximo 20** (mínimo 5,
ideal 8–12 segundo o guia oficial). Usar as 12–20 melhores.

Critérios de reprovação (pedir substituição, não treinar com foto ruim):

- Sombra pesada no rosto
- Rosto cortado
- Óculos escuros
- Foco ruim / borrada
- Filtro forte, foto em grupo, chapéu cobrindo o rosto, pose repetida

Boas práticas: ângulos variados (frente, 3/4 esq/dir), luzes diferentes,
expressões diferentes, distâncias diferentes, nitidez ≥ 1024×1024, JPEG/PNG.

Como enviar: commitar nesta pasta (repo privado) ou anexar na conversa da
sessão que for treinar.

Treino (uma vez só):

```bash
higgsfield soul-id create --name "aline" --soul-cinematic \
  --image fotos-treino/01.jpg --image fotos-treino/02.jpg ...
higgsfield soul-id wait <id>
```

## Regras fixas para todos os clipes

- Um único movimento de câmera por clipe. Nunca empilhar movimentos.
- Sem fala, sem boca aberta, sem risada.
- Sem manipulação fina de objeto: nada de cortar, despejar, pipetar,
  digitar. Ação já em curso e lenta.
- Nenhum rótulo, embalagem ou texto legível em cena.
- Pele natural, com textura. Nada de acabamento de campanha.
- Modelo de vídeo: **Kling 3.0** para os três (B-roll, não precisa do caro).
  Confirmar o `job_type` exato com `higgsfield model list | grep -i kling`
  e os parâmetros com `higgsfield model get <job_type>`.
- Formato: 9:16, 5 segundos, image-to-video a partir do frame aprovado.

## Cenas

Para cada cena: gerar o frame estático com Soul ID → mostrar para a Aline →
só animar depois da aprovação. **2 variações por cena.**

### Cena 1 — cafeteria (`cena-1-cafeteria`)

Frame (prompt):

> Medium shot, woman seated by a large window in a cozy coffee shop, soft
> natural side light from the window, holding a ceramic cup already raised
> near her face, gazing out the window, calm relaxed expression, lips closed,
> natural skin texture, no readable text or logos anywhere, vertical 9:16

Movimento: **slow push in** (único movimento). Sujeito quase parado,
respiração sutil, vapor subindo da xícara.

### Cena 2 — cozinha (`cena-2-cozinha`)

Frame (prompt):

> Medium shot, woman at a bright clean kitchen counter slowly stirring a
> mixing bowl with a spoon, hands partially out of frame at the bottom, soft
> morning light, lips closed, no gesturing, natural skin texture, no
> packaging or readable labels, vertical 9:16

Movimento: **slow pan** (único movimento). Mexida lenta já em curso,
sem falar, sem gesticular.

### Cena 3 — laboratório (`cena-3-laboratorio`)

Frame (prompt):

> Medium shot, woman wearing a white lab coat at a laboratory bench under
> cool clinical lighting, looking down at a Petri dish, focused concentrated
> expression, lips closed, minimal movement, natural skin texture, no
> readable labels or text, vertical 9:16

Movimento: **slow tracking shot** (único movimento). Movimento mínimo do
sujeito, olhar concentrado.

## Comandos de geração (após aprovação dos frames)

```bash
# Frame estático com Soul ID (uma chamada por variação)
higgsfield generate create text2image_soul_v2 \
  --prompt "<prompt da cena>" --soul-id <ref_id> --quality 2k --wait

# Custo do lote ANTES de animar — mostrar pra Aline e esperar o ok
higgsfield generate cost <kling_3_0_job_type> --prompt "..." --start-image <frame>

# Animar (image-to-video)
higgsfield generate create <kling_3_0_job_type> \
  --start-image <frame_job_id> \
  --prompt "<movimento único da cena, sujeito quase parado>" \
  --wait
```

## Entrega

- MP4 em `saida/`, nomeados `cena-1-cafeteria-v1.mp4`, `cena-1-cafeteria-v2.mp4`,
  `cena-2-cozinha-v1.mp4` … (2 variações por cena, 6 clipes no total).
- Os `.mp4` de `saida/` não vão pro git (ver `.gitignore`) — entregar via
  anexo na conversa ou download.
- Gates obrigatórios, nesta ordem: fotos revisadas → créditos informados →
  frames aprovados → custo do lote aprovado → só então animar.
