# whatsapp-bot — Studio Aline

Bot que roda no PC da Aline e, a cada ~3 dias (janela aleatória 2-4 dias, hora sorteada entre 9h-19h), **gera um ebook científico no Gamma e posta num grupo específico do WhatsApp**, usando o número pessoal dela via [Baileys](https://github.com/WhiskeySockets/Baileys).

## Como funciona (pipeline)

```
  ┌─────────────┐     ┌──────────┐     ┌────────┐     ┌────────┐     ┌──────────┐
  │ node-cron   │───▶ │ PubMed   │───▶ │ Claude │───▶ │ Gamma  │───▶ │ WhatsApp │
  │ (jitter)    │     │ (Entrez) │     │ Sonnet │     │  API   │     │ Baileys  │
  └─────────────┘     └──────────┘     └────────┘     └────────┘     └──────────┘
      agenda           fetch real       ebook MD        PDF           msg + anexo
    próximo run       de abstracts    + caption WA     (tema          no grupo
    (2-4d, 9-19h)     (últimos 10a)    grounded        Scanner)
```

1. Escolhe o próximo tópico de uma pool científica (nutrigenética, nutrigenômica, microbiota, exames×sintomas, sinergia de bioativos) — ver `src/content/topics.ts`.
2. Busca 6 artigos recentes no PubMed via Entrez (API oficial do NIH, grátis).
3. Claude gera o conteúdo **grounded**: só afirma o que os abstracts sustentam, cita por PMID, exige doses/quantidades em toda recomendação. Se a evidência for insuficiente, aborta (não inventa).
4. Gamma cria o PDF usando o tema **Scanner** (id `xorjxo3seh6pyiu`) pra paleta oficial.
5. Rodapé do ebook carimbado com crédito + Instagram.
6. Baileys envia caption curta + PDF pro grupo.

## Pré-requisitos

- Node.js 20+
- PC ligado 24/7 (ou pelo menos nas janelas de envio) — Baileys precisa do processo rodando.
- Contas/keys:
  - **Anthropic** (`ANTHROPIC_API_KEY`)
  - **Gamma** API key (plano Pro/Ultra — `GAMMA_API_KEY`)
  - **WhatsApp pessoal** da Aline — só precisa escanear o QR uma vez, a sessão persiste em `data/auth/`.

## Setup (primeira vez)

```bash
# Na raiz do monorepo
pnpm install

# Copia o .env
cp apps/whatsapp-bot/.env.example apps/whatsapp-bot/.env
# Preenche ANTHROPIC_API_KEY e GAMMA_API_KEY. Deixa WHATSAPP_GROUP_ID vazio.
```

### Passo 1 — Conectar o WhatsApp

Você (Aline) cria o grupo no celular **manualmente**: adiciona descrição, adiciona as nutricionistas e pronto.

Depois, no PC:

```bash
cd apps/whatsapp-bot
pnpm list-groups
```

O terminal vai mostrar um QR Code gigante. No celular: **Configurações → Aparelhos conectados → Conectar aparelho**. Escaneia.

A sessão fica salva em `data/auth/`. Se der logout, é só apagar essa pasta e escanear de novo.

### Passo 2 — Pegar o ID do grupo

O mesmo comando (`pnpm list-groups`) lista todos seus grupos depois que conecta:

```
Grupo de Nutris — Scanner Evidência  (12 membros)
  ID: 120363041234567890@g.us
```

Copia o ID, cola em `WHATSAPP_GROUP_ID` no `.env`, e derruba o processo (Ctrl+C).

### Passo 3 — Testar com um envio agora

```bash
pnpm send-now
```

Isso executa o pipeline **uma vez**, manda pro grupo e sai. Se tudo OK, segue pro passo 4.

### Passo 4 — Deixar o scheduler rodando

```bash
pnpm dev    # dev: reinicia com hot-reload
# ou
pnpm build && pnpm start   # produção
```

O bot agenda o primeiro envio (2-4 dias à frente, hora sorteada) e a cada envio agenda o próximo. Estado vive em `data/state.json`.

## Configurações importantes no `.env`

| Env                       | O que faz                                                          |
| ------------------------- | ------------------------------------------------------------------ |
| `SEND_INTERVAL_MIN_DAYS`  | Mínimo de dias entre envios. Padrão 2.                             |
| `SEND_INTERVAL_MAX_DAYS`  | Máximo. Padrão 4. Média = 3, com jitter pra parecer humano.        |
| `SEND_WINDOW_START_HOUR`  | Hora mínima pra disparar (0-23). Padrão 9.                         |
| `SEND_WINDOW_END_HOUR`    | Hora máxima. Padrão 19.                                            |
| `GAMMA_THEME_ID`          | Tema Gamma. Default `xorjxo3seh6pyiu` = custom "Scanner" da Aline. |

## Risco & ética

- Baileys usa o **WhatsApp Web protocol** (número pessoal, não API oficial). Isso **viola os Termos da Meta**. O risco de ban aumenta com volume/frequência/cold outreach.
- Esse bot é projetado pra ser **conservador**: 1 mensagem a cada 2-4 dias, num grupo em que você é admin, com pessoas que aceitaram entrar. É o perfil de uso que a Meta menos pune.
- **Não usar** pra disparo em massa, grupo desconhecido ou contato frio — aí sim ban garantido.

## Estrutura

```
apps/whatsapp-bot/
├── src/
│   ├── index.ts                # entrypoint + loop principal
│   ├── config.ts               # env vars + constantes de marca
│   ├── whatsapp/
│   │   ├── client.ts           # Baileys socket + QR
│   │   ├── sender.ts           # envia caption + PDF
│   │   └── list-groups.ts      # CLI pra descobrir GROUP_ID
│   ├── content/
│   │   ├── topics.ts           # pool rotativa de temas (com query PubMed)
│   │   ├── pubmed.ts           # Entrez ESearch + EFetch + parser XML
│   │   └── generator.ts        # Claude grounded (system prompt + JSON out)
│   ├── ebook/
│   │   └── gamma.ts            # POST /generations + poll + download PDF
│   └── scheduler/
│       ├── index.ts            # tick a cada 60s, jitter 2-4 dias
│       └── state.ts            # last/next run + histórico de tópicos
└── data/
    ├── auth/                   # sessão Baileys (gitignored)
    ├── state.json              # estado do scheduler (gitignored)
    └── ebooks/                 # PDFs gerados (gitignored)
```

## Como adicionar mais temas

Edita `src/content/topics.ts` e adiciona objetos novos no array `TOPICS`. Cada um precisa de:

- `slug` único
- `pillar` (uma das 5 categorias)
- `title` que vira base do ebook
- `pubmedQuery` em inglês com sintaxe Entrez (MeSH + booleanos)
- `angle` = hook detetive que guia o Claude

## Troubleshooting

| Sintoma                                | Causa provável                                    | Fix                                            |
| -------------------------------------- | ------------------------------------------------- | ---------------------------------------------- |
| QR não escaneia                        | Terminal não renderiza                            | Usar Terminal nativo, não VSCode integrado     |
| "WhatsApp logged out"                  | Conta deslogou do Web                             | `rm -rf data/auth` e escanear de novo          |
| "Sem artigos do PubMed"                | Query muito específica                            | Afrouxar MeSH em `topics.ts`                   |
| "Ebook não cita nenhum PMID"           | Claude tentou ignorar grounding                   | Rodar de novo (é um sanity check, não bug)     |
| Gamma 401                              | API key errada ou plano sem API                   | Conferir `GAMMA_API_KEY` e plano               |
| Gamma timeout                          | PDF demorou > 20min                               | Pode acontecer com numCards alto — diminuir    |
