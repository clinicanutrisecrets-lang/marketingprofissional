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
│  Claude (copy)           │  ← gera headline/corpo/cta
│  Gemini (foto opcional)  │  ← se template tem placeholder de foto
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

## Master Brand Templates

Vivem na conta Canva da Aline (Pro) e são compartilhados por todas as franquias.

| Perfil          | Tipo     | Design ID      | Brand Template ID  | Status                                    |
| --------------- | -------- | -------------- | ------------------ | ----------------------------------------- |
| Scanner         | Capa     | `DAHJILDNdi4`  | _aguardando_       | direção visual aprovada (teal + sans)     |
| Nutri Secrets   | Capa     | `DAHJIGrFmoQ`  | _aguardando_       | direção aprovada (cream + magenta accent) |

**Próximas:** problema, conceito, dado, encerramento — pra cada perfil. Polish via API
de edição (`perform-editing-operations`) duplicando+editando das capas, não via
`generate-design` (loteria de qualidade).

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

## Próximos passos (próxima sessão)

1. **OAuth Canva no studio**
   - Rota `/admin/canva/conectar` (inicia OAuth)
   - Rota `/admin/canva/callback` (recebe code, troca por token, chama
     `aline.set_canva_credentials`)
   - UI: card de status em `/configuracoes` mostrando conectado/não-conectado

2. **Service `canvaAutofill` em `packages/ai-image/src/providers/canva.ts`**
   - Cliente da Connect API (`@canva/connect-api-ts` se publicado, ou fetch puro)
   - Refresh token automático se token expirado
   - Função `autofillBrandTemplate(templateId, data)` → polling do export → buffer PNG

3. **Wiring em `apps/aline/src/lib/ai-image/render.ts`**
   - Branch por `perfil.render_engine`
   - Sharp = chama `renderImagemIA` atual
   - Canva = chama `gerarImagemViaCanva`

4. **UI de configuração de templates**
   - Admin pode colar Brand Template IDs em cada perfil pelo studio
   - Campo de teste: "Renderizar peça de exemplo" pra validar antes de soltar pack

## Decisão registrada

Sharp composite NÃO é deletado nesta fase. Vira fallback de produção. Removível depois
que Canva pipeline estiver estável e todos os perfis migrados pra `render_engine='canva'`.
