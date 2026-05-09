# Pipeline Canva Auto-fill — Plano e Estado

Documenta a decisão arquitetural e o plano de execução pra trocar o renderizador de imagens
do Studio Aline (Sharp composite legado) por **Canva Connect API com Brand Templates**.

## Por quê

O composite Sharp (`packages/ai-image/src/overlay.ts`) tem 3 limitações que comprometem o
produto:

1. **Tipografia nativa do Vercel runtime é pobre** — falta de fontes elegantes resulta em
   "tofu" (□□□) quando o SVG referencia Georgia/Cormorant. Solução via `@font-face` com
   base64 funciona mas é frágil e exige manter TTFs no repo.
2. **Identidade visual fraca** — gradientes sólidos cor_primaria + título serif default
   produzem visual de "AI slop", não de marca premium.
3. **Não escala pra franquias** — cada franquia precisaria de design system próprio
   pixelizado em código. Inviável.

Canva Brand Templates resolve os três:

- Tipografia profissional embedada nos templates (sem dependência de fontes do runtime)
- Design real feito visualmente (não codificado), pode ser editado por designer sem deploy
- Mesmo template referenciado por N franquias com cor/logo/handle parametrizados

## Arquitetura

```
┌──────────────────────────┐
│  Pack semanal cron       │
│  (gerador-semanal.ts)    │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Claude (copy + visual_  │  ← gera headline/corpo/cta + hint de foto
│   hint p/ Pexels)        │     ("vitamin D capsule sunlight")
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Pexels API (foto hero)  │  ← top 20 → pega 1ª não-usada
│  Fallback: Gemini gen    │     (cache em aline.fotos_usadas)
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  gerarImagemViaCanva(perfilId, conteudo) │
│                                          │
│  1. Lê perfil → canva_template_*_id      │
│  2. Lê franquia (futuro) → cor + logo    │
│  3. POST /v1/autofills com placeholders  │
│  4. Poll /v1/exports até ready           │
│  5. Download PNG                         │
│  6. Upload no bucket Supabase            │
│  7. Retorna signed URL                   │
└──────────────────────────────────────────┘
```

## Pool de Brand Templates

Vivem na conta Canva da Aline (Pro) e são compartilhados por todas as franquias.

**Modelo: pool, não master único.** A Aline já tem dezenas de posts publicados na
pasta "Scanner 2.0" — cada um é um layout diferente (foto de cápsula + headline,
flat-lay de comida + question card, foto moody de microscopia + título serif,
fundo sólido cream + texto puro, etc). Em vez de gerar templates do zero, ela
marca essa biblioteca existente como Brand Templates. O sistema escolhe o
template certo por contexto (tipo de post, tema, presença de foto hero).

```
search-designs("Scanner 2.0") já retornou 10+ designs:
  DAHIVng4K2Q  Post Scanner 2.0           (9 pgs)
  DAHIzg43yl4  Scanner 2.0                (10 pgs)
  DAHIztQhOKs  Scanner 2.0                (9 pgs)
  DAHIK0W1LD4  Post Scanner 2.0           (10 pgs)
  ...etc
```

Aline marca via **Arquivo → Salvar como modelo de marca** na UI Canva (1 clique
por design — ação não exposta na API). Manda os Brand Template IDs (formato
`EAGxxx...`).

**Schema implication:** migration 007 atual tem 1 ID por tipo de peça
(`canva_template_carrossel_id TEXT`). Próxima migration (008) vira pool — favoreço
tabela separada `aline.canva_templates` com (perfil_id, brand_template_id, tipo,
tags, descricao, ativo) por permitir metadata.

**Tags por template** (definidas na criação) ajudam o seletor a escolher o certo:

- Template-tag examples: `gene-especifico`, `dieta-strategy`, `dado-stat`,
  `principio`, `caso-clinico`, `tem-foto-hero`, `solido-only`
- Post.tags do Claude: `tema:resistencia-insulina, formato:explicativo`
- Match: pega templates compatíveis, escolhe um randomicamente (ou por uso recente
  pra rotação)

**Descartado:** `DAHJILDNdi4` (teal Scanner cover gerado por AI) — direção errada,
me confundi com o print "Monte o seu painel" que ela mandou inicialmente. A marca
real do Scanner 2.0 é warm cream + serif italic, não teal clinical.

**Bug a corrigir:** `DAHJIGrFmoQ` (Nutri cover gerado AI) tem espaçamento broken
no headline (color spans cortando palavras). Manter pra referência da paleta
mas não como template ativo.

## Schema (migration 007)

- `aline.perfis.render_engine` — enum `sharp` | `canva`, default `sharp`
- `aline.perfis.canva_template_carrossel_id` / `canva_template_feed_id` /
  `canva_template_stories_id` — Brand Template IDs por tipo de peça
- `aline.canva_connection` — single-row, OAuth tokens criptografados via pgsodium
- RPCs `set_canva_credentials`, `get_canva_credentials`, `get_canva_connection_status`,
  `disconnect_canva` — mesmo padrão das credenciais Instagram (SECURITY DEFINER, service
  role only)

## Multi-tenancy (futuro)

Quando franquias forem onboarded:

1. Form de onboarding coleta: nome, handle, cor_primaria, cor_secundaria, logo (PNG)
2. Esses 4 valores ficam em tabela `aline.franquias` (a criar)
3. Brand Templates são SHARED (vivem na conta Canva da Aline)
4. Em cada chamada de auto-fill, sistema injeta os valores da franquia nos placeholders
5. Resultado: cada franquia vê o pack com a marca dela, mesma estrutura visual

Conta Canva única (da Aline) atende todas as franquias — escala perfeitamente sem
exigir Canva Pro de cada nutri.

## Fallback

`render_engine = 'sharp'` mantido como fallback. Se:

- Canva Connection não existir, OU
- `canva_template_*_id` do perfil estiver NULL, OU
- Auto-fill falhar (timeout, quota, etc)

→ pipeline cai automaticamente no Sharp composite legado. Não bloqueia geração de pack.

## Pexels: foto hero dinâmica

**Problema:** se cada Brand Template tem 1 foto fixa embedada, posts repetem foto.
Não rola.

**Solução:** placeholder de imagem no template; foto vem dinamicamente do Pexels
(stock free, alta qualidade, mesma estética dos posts atuais da Aline — Scanner 2.0
posts mostram fotos cara-de-Pexels: cápsula vit D, almonds, eggs, woman tank top).

**Fluxo:**

1. Claude gera post + também `visual_hint TEXT` (3–5 palavras descrevendo o
   subject ideal pra foto): `"vitamin D capsule sunlight"`,
   `"almonds avocado oil flat-lay"`, `"pills hand minimal"`, etc.
2. `pexelsClient.search(hint, perPage=20)` → lista de URLs
3. Filtra contra cache `aline.fotos_usadas` (perfil_id, pexels_photo_id, usado_em)
   — ignora fotos usadas nas últimas N semanas (default 4) pra esse perfil
4. Pega 1ª foto disponível, baixa
5. Upload pra Canva como asset (Connect API → assets endpoint)
6. Autofill do template com `image_field_id → asset_id` + textos

**Fallback:** se Pexels não retornar nada relevante (raro), gera via Gemini com
prompt restrito (mesmo `visual_hint` + estilo "warm cream natural light").

**Tabela `aline.fotos_usadas` (migration 008 ou 009):**

```sql
CREATE TABLE aline.fotos_usadas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id       UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  pexels_photo_id TEXT NOT NULL,
  visual_hint     TEXT,
  post_id         UUID REFERENCES aline.posts(id) ON DELETE SET NULL,
  usado_em        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON aline.fotos_usadas (perfil_id, usado_em DESC);
```

## Próximos passos (próxima sessão)

1. **Migration 008 — pool de templates**
   - Tabela `aline.canva_templates` (perfil_id, brand_template_id, tipo, tags[],
     descricao, ativo, criado_em)
   - Drop colunas legacy `canva_template_*_id` em `aline.perfis`
   - Tabela `aline.fotos_usadas` (cache de rotação Pexels)

2. **OAuth Canva no studio**
   - Rota `/admin/canva/conectar` (inicia OAuth)
   - Rota `/admin/canva/callback` (recebe code, troca por token, chama
     `aline.set_canva_credentials`)
   - UI: card de status em `/configuracoes` mostrando conectado/não-conectado

3. **Pexels client em `packages/ai-image/src/providers/pexels.ts`**
   - `pexelsSearch(query, count)` → array de fotos
   - `pexelsDownload(photoId)` → buffer
   - PEXELS_API_KEY no env

4. **Service `canvaAutofill` em `packages/ai-image/src/providers/canva.ts`**
   - Cliente da Connect API (`@canva/connect-api-ts` se publicado, ou fetch puro)
   - Refresh token automático se token expirado
   - `uploadAsset(buffer)` → asset_id
   - `autofillBrandTemplate(templateId, data)` → polling do export → buffer PNG

5. **Service `selecionarTemplate(perfilId, post)`**
   - Filtra `aline.canva_templates` por tipo + tags compatíveis com post
   - Retorna 1 template (random ou round-robin de uso recente)

6. **Service `selecionarFoto(perfilId, visualHint)`**
   - Pexels search com hint
   - Filtra fotos já usadas (cache `aline.fotos_usadas`)
   - Retorna buffer + registra uso

7. **Wiring em `apps/aline/src/lib/ai-image/render.ts`**
   - Branch por `perfil.render_engine`
   - Sharp = chama `renderImagemIA` atual (fallback)
   - Canva = `selecionarTemplate` → `selecionarFoto` → `canvaAutofill` → upload bucket

8. **UI de configuração**
   - Admin lista templates registrados por perfil + edita tags
   - Campo de teste: "Renderizar peça de exemplo" pra validar antes de soltar pack

9. **Refinar prompt do Claude (gerador-semanal.ts)**
   - Output adicional: `visual_hint` por post
   - Pilar `sinergias_nutricionais`: lista de pares banidos (Vit C+ferro,
     curcumina+pimenta) + diretriz pra pares não-óbvios com mecanismo molecular

## Decisão registrada

Sharp composite NÃO é deletado nesta fase. Vira fallback de produção. Removível depois
que Canva pipeline estiver estável e todos os perfis migrados pra `render_engine='canva'`.
