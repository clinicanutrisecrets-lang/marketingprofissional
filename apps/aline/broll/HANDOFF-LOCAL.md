# Handoff — produção do B-roll na máquina da Aline

Briefing completo pra sessão local. Foi escrito depois de uma conversa longa
com a Aline na sessão web; tudo que ela decidiu está aqui, pra ninguém
precisar adivinhar. **Leia este arquivo inteiro antes de rodar qualquer
comando.** Os outros arquivos da pasta (`README.md`, `banco-broll.md`,
`reel-tdah-dopamina.md`, `overlays/README.md`) detalham cada parte.

---

## 1. Quem é a cliente e o que ela quer

Aline Quissak, nutricionista, CRN 8 10607. Marca **Nutri Secrets**
(@nutri_secrets), posicionamento **"Detetive da Saúde"**: não trata sintoma
isolado, investiga as peças do quebra-cabeça — nutrigenética, microbiota,
exames e marcadores, estilo de vida/emocional.

**Escopo**: este fluxo é só pro Instagram pessoal dela (@nutri_secrets).
**Não** é pra franquia / Scanner da Saúde / `apps/franquias`.

Ela quer vídeos curtos de B-roll dela mesma para Reels, **sem fala e sem lip
sync**. O texto entra por cima na edição.

### Dois destinos para o mesmo material

- **[ORG] Orgânico @nutri_secrets** — conteúdo de conhecimento com foco em
  paciente: genes, microbiota, exames, casos clínicos **como exemplo
  didático** (nunca dados de paciente real). Ex.: o reel de TDAH.
- **[ADS] Anúncios da formação em saúde integrativa** — foco em
  profissionais: Aline professora, palestrante, autoridade clínica. Precisa
  funcionar com narração por cima; figurino um degrau mais formal e
  enquadramento com respiro pra headline.
- **[AMBOS]** — a maioria do B-roll.

### Dor principal dela

"Eu sempre esqueço de postar." Por isso a entrega ideal não é clipe solto: é
**reel montado, pronto pra publicar**. Ela não quer trabalho de edição.

---

## 2. Regras fixas de cena (não negociáveis — foram dela)

1. **Um único movimento de câmera por clipe.** Nunca empilhar movimentos.
2. **Sem fala, sem boca aberta, sem risada.**
3. **Sem manipulação fina de objeto**: nada de cortar, despejar, pipetar,
   digitar. Ação já em curso e lenta.
4. **Nenhum rótulo, embalagem ou texto legível em cena.** Telas e papéis
   sempre desfocados (IA gera texto embaralhado — o desfoque vira estética).
5. **Nada de pele artificialmente perfeita.** Palavras dela: "Quero parecer
   eu, não um render de campanha." Se um frame sair plastificado, descartar
   e regerar — não mostrar pra ela.
7. **Realismo máximo, sem cor de marca dentro da imagem.** Decisão dela em
   2026-08-08: nada de laboratório puxado pro Tiffany, nada de molécula na
   paleta. A identidade visual entra no texto e no grafismo por cima. Nos
   prompts: `neutral color grading, true to life colors, photorealistic,
   documentary style`; fora: `neon`, `glowing`, `bioluminescent`,
   `vibrant`, `stylized` e nomes de cor.
6. **9:16**, clipes curtos (o corte usado na edição é de 4-6s).

---

## 3. Estado técnico confirmado (2026-08-07, pelo CLI)

- CLI `higgsfield` v1.1.9 instalado em `~/.local/bin`, **autenticado**.
- **Créditos: 3010.** Plano **ultra** (não é o PLUS de 1.000/mês que a
  estratégia antiga assumia).
- `seedance_2_5` **não aceita `start_image`** — só `image_references` +
  `mode omni_reference` (referência de aparência, perde o enquadramento
  aprovado), e no máximo 720p.
- `kling3_0` aceita `start_image`/`end_image` e vai até 4k.
  `kling3_0_turbo` é a variante mais barata.
- **Nano Banana 2 = `nano_banana_flash`.** `nano_banana_2` não existe.
  Cuidado: `nano_banana_2_ai_stylist`, `nano_banana_2_skin_enhancer` e
  `nano_banana_2_shots` aparecem todos como "Nano Banana Pro" na listagem —
  nome de exibição não é chave única, só o job type é.

### Consequência: o motor mudou

O fluxo obrigatório é **frame aprovado → animar aquele frame**. Logo:

| Cena | Motor |
|---|---|
| Com o rosto da Aline | `kling3_0` (ou `_turbo`) com `--start-image` |
| Sem rosto (molécula, comida, ambiente) | `seedance_2_5` text-to-video |

**A confirmar (o CLI não informa, só o site da Higgsfield)**: se o plano
ultra inclui janela ilimitada de algum modelo. Se incluir, as cenas sem
rosto saem de graça e os créditos ficam todos pras cenas com rosto.

### Parâmetros que precisam ser explícitos

A sessão local identificou que alguns defaults contrariam as regras da
Aline. **Antes do primeiro lote**: rodar `higgsfield model get kling3_0` e
`model get seedance_2_5`, listar todos os parâmetros relevantes (proporção,
duração, resolução, movimento de câmera, enhance/embelezamento de prompt) e
fixar explicitamente os valores que respeitam as regras da seção 2 —
principalmente 9:16, duração curta, um movimento só, e qualquer flag que
"melhore" pele/estética desligada. Documentar os valores escolhidos.

---

## 4. Gates de aprovação (a Aline pediu explicitamente)

Nesta ordem, sem pular:

1. **Fotos revisadas** foto a foto antes de treinar; reprovar e pedir
   substituição em vez de treinar com foto ruim.
2. **Plano e créditos informados** antes de gastar qualquer coisa.
3. **Frames mostrados e aprovados** antes de animar.
4. **Custo do lote (`generate cost`) mostrado e aprovado** antes de disparar.

Além disso: fazer um **piloto de 1 cenário** (sugestão: consultório/análise,
que serve ORG e ADS) antes de escalar — valida qualidade e custo enquanto
errar ainda é barato. Frames custam pouco perto de vídeo.

Curadoria é responsabilidade da sessão, não dela: descartar frames/clipes
com artefato (mão, olho, textura) **antes** de mostrar. Ela vê só o que
presta.

---

## 5. Soul ID

```
higgsfield soul-id create --name "aline" --soul-cinematic --image ... (uso final é vídeo)
higgsfield soul-id wait <id>
```

Máximo **20 fotos** (a Aline pediu 20-25; o limite do Soul ID é 20, ideal
8-12 excelentes).

**Critérios de reprovação**: sombra pesada no rosto, rosto cortado, óculos
escuros, foco ruim, filtro forte, foto em grupo, chapéu cobrindo o rosto,
pose repetida — e **foto que pareça gerada ou retocada por IA** (ensinaria
um rosto artificial).

### Fotos já aprovadas na sessão web (ela tem os originais)

1. Casamento na janela — única sem óculos, cabelo solto, luz de janela, 3/4.
2. Blazer azul com a caixa do Scanner — corpo inteiro, cabelo preso.
3. Blazer branco no sofá — ensaio profissional, rosto nítido.
4. Blazer branco na escada — luz clara estourada (variação boa).
5. Porto, ao ar livre — luz externa de fim de tarde.

Havia mais 4 vistas (blazer roxo; jaleco sentada; blazer azul com DNA e
microscópio — **esta parecia gerada/retocada por IA, confirmar antes de
usar**; selfie sem maquiagem, ótima pra textura real).

### O que ainda falta no lote

Todas as vistas até agora são **sorrindo com dentes** e de frente. Faltam:

- 3-4 com **expressão neutra, boca fechada** (é a expressão dos clipes!)
- 2-3 **closes** de rosto nítidos
- ângulos **3/4** para cada lado
- se ela às vezes aparece sem óculos, algumas sem

Orientação dada a ela: luz de janela de frente, câmera traseira, sem filtro
nem modo beleza, na altura dos olhos. Foto natural/sem maquiagem é **boa**
pro treino — a produção da cena (maquiagem, cabelo, luz) vem do prompt.

---

## 6. Cenários do banco

Detalhe completo em `banco-broll.md`. Resumo: cozinha-refeições (café da
manhã, almoço, jantar, sobremesa), cozinha-pausa (chá, café), cafeteria,
laboratório, consultório/prática clínica, análise/leitura (lendo exame,
lendo relatório, no computador com espaço livre pra "segunda tela"),
palestra, professora/aula. Extras: home office com abas abertas, lousinha,
caminhada.

Por cenário: 3-4 frames-base (enquadramento/luz/figurino), e de cada frame
aprovado 2-3 animações com movimentos distintos. Meta 50-70 clipes.

Organizar em `saida/banco/<cenario>/` + `INDICE.md` registrando arquivo,
ação, movimento, trecho bom (in/out) e em quais reels já foi usado — pra não
repetir clipe em posts seguidos.

---

## 7. Overlays de telas reais

A Aline tem layouts próprios lindos (plano alimentar, relatório
nutrigenético, prescrição de suplementos, painel "Genes em atenção"). Eles
**não são gerados por IA** — entram como sobreposição na montagem: card
flutuante ao lado dela no computador, ou insert de 1-2s, com moldura na
paleta da marca.

⚠️ **Dados de paciente**: os PDFs que ela mostrou tinham nomes reais
("Paula", "Bianca Quissak") e datas de nascimento. Mascarar nome, data,
CPF e número de documento antes de qualquer uso em vídeo. O painel "Genes
em atenção" não tem dado pessoal visível. Ver `overlays/README.md`.

⚠️ **O repositório é público no GitHub.** Nunca commitar fotos da Aline,
PDFs de paciente, tokens ou qualquer material sensível. `fotos-treino/` e
`overlays/` têm `.gitignore` bloqueando tudo.

---

## 8. Entrega final

Ela **não quer editar**. A entrega é:

1. Clipes soltos em `saida/banco/` (caso ela queira mexer).
2. **Reel montado**: cenas na ordem narrativa, cortes no ritmo, textos de
   tela queimados na paleta da marca — MP4 único pronto pra postar.

**Paleta**: Tiffany blue `#0ABAB5`, dark teal `#0E5959`, magenta `#D6336C`,
bege creme `#F5E6D3`.

**Áudio**: ela tem API do ElevenLabs. Preferência: gerar a narração pela API
(voz dela), ajustar os cortes ao ritmo da fala e entregar com áudio
embutido — ideal pros anúncios. Alternativas: ela manda o áudio gravado, ou
o reel sai mudo quando ela for usar **música em alta**, que por
licenciamento só pode ser adicionada dentro do app do Instagram.
Chave do ElevenLabs: variável de ambiente, **nunca no repositório**.

**Publicação**: a automação do Studio foi desligada (ela não usava e gastava
API). O plano é ela agendar no **Meta Business Suite** (grátis, sem depender
da aprovação da Meta), com lembrete semanal.

---

## 9. Primeiro trabalho concreto

`reel-tdah-dopamina.md` tem um reel inteiro roteirizado e aprovado pela
Aline: TDAH no adulto via nutrigenética (gene COMT), microbiota e exames,
com o payoff de proteína + magnésio + B6 na produção de dopamina. 6 cenas,
prompts prontos, textos de tela e legenda escritos.

Cenas 1, 3, 4, 5, 6 → frame Soul + `kling3_0`.
Cena 2 (molécula de dopamina) → `seedance_2_5` text-to-video, sem Soul.
Cena 6 (lousinha) → o diagrama é overlay na edição, não gerado.

Rigor científico: linguagem de "é cofator", "participa", "favorece" — nunca
número inventado, nunca promessa de cura. A legenda leva o aviso de que TDAH
exige diagnóstico e acompanhamento individualizado.
