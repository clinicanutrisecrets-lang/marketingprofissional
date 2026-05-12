# Setup Canva — passo a passo

Esse doc explica como criar o app Canva e plugar as credenciais. **5 minutos** se você já tem conta Canva.

## 1. Criar o integration no Canva Developer Portal

1. Acessa https://www.canva.com/developers/integrations
2. Clica **"Create an integration"**
3. Tipo: **"Private"** (uso interno, não publica na marketplace)
4. Nome: `Studio Aline` (qualquer nome interno)
5. Em **"Configure your integration"**:
   - **Authentication** → "OAuth 2.0"
   - **Redirect URLs** → adiciona:
     - `https://studio-aline.vercel.app/api/canva/callback` (produção)
     - `http://localhost:3001/api/canva/callback` (dev local)
6. Em **"Scopes"** → marca os 5:
   - `design:content:read`
   - `design:content:write`
   - `design:meta:read`
   - `asset:read`
   - `asset:write`
7. Salva.

## 2. Pegar credenciais

Na tela do integration:

- **Client ID** → copia (formato `OAxxxxxxxxxxxxx`)
- **Client Secret** → clica "Generate" se ainda não tiver, copia (formato `cnvk_xxxxxx`)

⚠️ **O secret só aparece UMA VEZ.** Se perder, gera outro.

## 3. Colocar no Vercel (produção)

Em https://vercel.com/scanner-da-saude/studio-aline/settings/environment-variables, adiciona 3 vars **(escope: Production + Preview)**:

```
CANVA_CLIENT_ID        = OAxxxxxxxxxxxxx
CANVA_CLIENT_SECRET    = cnvk_xxxxxx
CANVA_REDIRECT_URI     = https://studio-aline.vercel.app/api/canva/callback
```

Depois clica **"Redeploy"** no último deploy de produção pra Vercel re-injetar as vars.

## 4. Conectar pelo painel

1. Logada como admin no Studio Aline (https://studio-aline.vercel.app)
2. Acessa `/configuracoes/canva`
3. Clica **"Conectar Canva →"**
4. Autoriza o app na sua conta Canva (a mesma onde estão os designs do Scanner 2.0)
5. Você volta pro painel com a mensagem **"Canva conectado com sucesso!"**

Pronto. A partir do próximo pacote semanal, perfis com `render_engine='canva'` vão usar o pipeline:

```
pick_design (pool com tags + LRU)
  → pexels_search (foto hero, evita repetição)
  → canva copy design (preserva original)
  → canva edit (textos: headline, subtitle, cta, @handle)
  → canva swap image (foto Pexels no layer foto_hero)
  → canva export PNG
  → upload pro bucket aline-assets
```

Se algo falhar em qualquer ponto, **cai automaticamente no fallback Gemini** — pacote sempre sai.

## 5. Ativar Canva pra um perfil

Por default, perfis vêm com `render_engine='sharp'` (legado). Pra ativar Canva num perfil:

```sql
UPDATE aline.perfis SET render_engine = 'canva' WHERE slug = 'nutrisecrets';
```

Ou via UI quando a tela de admin tiver o toggle (TODO).

## 6. Layers que o design precisa ter

Os 6 designs do pool Scanner 2.0 precisam ter os layers nomeados assim no Canva:

- `foto_hero` (image layer onde entra a foto Pexels)
- `headline` (text layer, ~6 palavras impacto)
- `subtitle` (text layer, opcional)
- `cta` (text layer, ~50 chars)
- `handle` (text layer pro `@nome` da nutri)

Se o layer não existir no design, o edit silenciosamente ignora. Não quebra.

## 7. Adicionar novos designs ao pool

```sql
INSERT INTO aline.canva_designs (perfil_id, design_id, tipo, tags, descricao)
VALUES (NULL, 'DAxxxxxxxx', 'feed_imagem', ARRAY['scanner_2_0','meu_tag'], 'Descrição');
```

`perfil_id = NULL` = design shared (qualquer perfil usa). Pra design exclusivo de 1 perfil, passa o UUID.

## Troubleshooting

- **"Canva não conectado"** → roda `/configuracoes/canva` → "Conectar"
- **"Canva token expirado e sem refresh_token"** → desconecta e reconecta
- **Pacote semanal saindo no Gemini mesmo com Canva conectado** → verifica `aline.perfis.render_engine = 'canva'`
- **Design não aparece no resultado** → verifica que está em `aline.canva_designs` com `ativo = true` e `tipo` correto

## Custo

- Canva Connect API: **grátis** (sem cobrança por chamada na tier atual)
- Pexels: **grátis** (rate limit 200 req/h, suficiente)
- Vercel function runtime: ~1-3s adicionais por post (vs 5-15s do Gemini)

Pipeline Canva costuma sair **mais barato e mais rápido** que Gemini, e com qualidade visual previsível.
