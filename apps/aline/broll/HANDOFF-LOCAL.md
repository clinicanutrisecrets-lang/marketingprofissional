# Handoff — execução na máquina da Aline

A Aline autenticou o Higgsfield no Claude Code do computador dela
(`higgsfield auth login` → "Device authorized", CLI v1.1.9 em `~/.local/bin`).
O token **não** deve ser transportado pra sessão web: ele dá acesso à conta e
aos créditos, e transcrições ficam gravadas. A produção roda localmente.

Esta sessão web segue como planejamento (roteiros, prompts, curadoria).

## Fatos confirmados pelo CLI (2026-08-07)

- **Créditos**: 3010 disponíveis.
- **Nano Banana 2** = job type `nano_banana_flash`. `nano_banana_2` **não
  existe**. Cuidado: `nano_banana_2_ai_stylist`,
  `nano_banana_2_skin_enhancer` e `nano_banana_2_shots` aparecem todos como
  "Nano Banana Pro" na listagem — nome de exibição não é chave única, só o
  job type é.
- **Kling 3.0** tem dois: `kling3_0` (base) e `kling3_0_turbo` (mais
  rápido/barato).
- **Pendente**: plano da conta (Soul ID exige Basic+) e se o Seedance 2.5
  ilimitado do PLUS está ativo — a Aline ainda não assinou o PLUS quando
  este arquivo foi escrito.

## Texto pra Aline colar no Claude Code do computador

> Você vai me ajudar a produzir B-roll com meu rosto no Higgsfield. Eu já
> estou autenticada (`higgsfield account status` funciona; o binário está em
> `~/.local/bin`).
>
> 1. Clone `https://github.com/clinicanutrisecrets-lang/marketingprofissional`
>    e leia **toda** a pasta `apps/aline/broll` (README.md, banco-broll.md,
>    reel-tdah-dopamina.md, overlays/README.md). Ali estão as regras fixas,
>    os cenários e os roteiros. Siga aquilo à risca.
> 2. Rode `higgsfield account status` e me diga meu plano e meus créditos.
>    Soul ID exige Basic ou acima — me avise antes de gastar qualquer coisa.
> 3. Rode `higgsfield model list` e me diga se existe **Seedance 2.5** e qual
>    o job type exato dele. Confirme também se ele aceita image-to-video
>    (`higgsfield model get <job_type>`), porque meu fluxo é: frame com meu
>    rosto → animar esse frame.
> 4. Eu vou colocar minhas fotos de treino numa pasta `fotos-treino/`.
>    Revise foto a foto ANTES de treinar e me avise se alguma tiver sombra
>    pesada no rosto, rosto cortado, óculos escuros, foco ruim, ou se parecer
>    gerada/retocada por IA — foto assim não entra. Peça substituição.
> 5. Com as fotos aprovadas, treine meu Soul ID:
>    `higgsfield soul-id create --name "aline" --soul-cinematic --image ...`
>    (uso final é vídeo). Depois `higgsfield soul-id wait <id>`.
> 6. Gere os frames estáticos das cenas do banco, me mostre para aprovação,
>    e só anime depois que eu aprovar.
> 7. Antes de disparar qualquer lote, rode `higgsfield generate cost` e me
>    mostre o custo total em créditos. Espere meu ok.
>
> Regras que não mudam: um único movimento de câmera por clipe, sem fala,
> boca fechada, sem manipulação fina de objeto, nenhum texto legível em cena,
> pele natural (quero parecer eu, não um render de campanha), 9:16.

## Fotos de treino

5 já revisadas e aprovadas nesta sessão (ficam só aqui, nunca no git):
casamento na janela (única sem óculos), blazer azul com a caixa Scanner,
blazer branco no sofá, blazer branco na escada, Porto ao ar livre.

Faltam pro lote de 12-20: expressão neutra de boca fechada (as 9 vistas até
agora são todas sorrindo com dentes), closes de rosto nítidos, e ângulos 3/4.
A Aline vai tirar essas no celular — orientação: luz de janela de frente,
câmera traseira, sem filtro, na altura dos olhos.

Como a produção é local, ela deve juntar todas numa pasta `fotos-treino/` na
máquina dela.
