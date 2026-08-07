# Como conectar o Higgsfield (passo a passo pra Aline)

O login do Higgsfield abre uma janela do navegador pra você entrar na conta.
Isso só funciona no **seu computador** — a sessão da web roda num servidor
remoto, onde não existe navegador seu. Por isso o login é feito uma vez no
Claude Code do seu computador.

Você **não precisa saber terminal**. É copiar e colar uma mensagem.

## Passo 1 — Abrir o Claude Code no seu computador

Abre o Claude Code (o mesmo que você já usa aí). Não importa em qual pasta
ele abrir.

## Passo 2 — Colar esta mensagem lá e dar Enter

> Instale o CLI do Higgsfield e me conecte na minha conta.
>
> 1. Descubra a versão mais nova assim:
>    `git ls-remote --tags https://github.com/higgsfield-ai/cli.git | tail -1`
> 2. Instale com a tag que aparecer, por exemplo:
>    `curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh -s -- --tag v1.1.9`
> 3. Rode `higgsfield auth login` — vai abrir meu navegador, eu faço login.
> 4. Depois do login, rode `higgsfield account status` e me diga meu plano e
>    quantos créditos eu tenho.
> 5. Rode `higgsfield auth token` e me mostre o token na tela, pra eu copiar.
> 6. Rode `higgsfield model list` e me diga os nomes exatos dos modelos
>    Seedance 2.5, Kling 3.0 e Nano Banana 2.

O Claude Code de lá vai pedir permissão pra rodar cada comando — é só
aprovar. Quando abrir o navegador, entre na sua conta Higgsfield normalmente
(e-mail e senha, como em qualquer site).

## Passo 3 — Voltar aqui com 3 informações

Cole na conversa da sessão web:

1. **O token** (o código comprido do `higgsfield auth token`)
2. **Plano e créditos** (o que apareceu no `account status`)
3. **Os nomes dos modelos** (do `model list`)

Com isso eu treino o Soul ID e começo os frames do banco de B-roll.

## Cuidados com o token

- É uma senha temporária: **nunca** colar em post, print público, ou
  commitar no repositório (que é público).
- Ele expira sozinho. Se der erro de sessão expirada no meio da produção,
  repita o passo 2 item 5 e me mande o novo. Leva 30 segundos.

## Alternativa (mais definitiva)

Em vez de trazer o token pra cá, dá pra fazer **tudo** no Claude Code do seu
computador: ele clona este repositório (onde estão os roteiros, o banco de
cenas e as regras), faz o login, treina o Soul ID e gera os vídeos direto na
sua máquina — sem token viajando de um lado pro outro.

Nesse caso, cole lá:

> Clone o repositório clinicanutrisecrets-lang/marketingprofissional, leia a
> pasta apps/aline/broll e siga o fluxo de B-roll descrito lá.

As fotos de treino ficam na sua máquina, e os MP4 saem direto em `saida/`.
