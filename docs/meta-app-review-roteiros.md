# Meta App Review — Roteiros de Vídeos de Demonstração

**App:** Scanner da Saúde Franquia Digital (ID 1833582604340954)
**Data:** Abril 2026

---

## Instruções Gerais

Cada vídeo deve ter:
- **Duração:** 2-5 minutos
- **Qualidade:** 1080p mínimo
- **Áudio:** narração em PT-BR clara OU legendas em EN
- **Conteúdo:** mostrar o fluxo real, sem edição cosmética, com conta de teste ou real
- **Ferramenta recomendada:** OBS Studio (grátis) ou Loom
- **Formato:** MP4
- **Nome do arquivo:** `permissao-nome.mp4` (ex: `instagram_content_publish.mp4`)

Antes de gravar: **faça login em `app.scannerdasaude.com` com uma conta de teste que já tenha Instagram Business conectado**.

---

## VÍDEO 1 — `instagram_content_publish`

**Permissão:** Publicar posts/reels/carrosséis/stories no Instagram da nutricionista.

### Roteiro

```
[0:00 — Narração]
"Olá, sou Aline Quissak, fundadora da Scanner da Saúde. Vou mostrar como nosso
app ajuda nutricionistas franqueadas a publicar conteúdo automaticamente no
Instagram delas. Essa é a funcionalidade que usa a permissão 
instagram_content_publish."

[0:15 — Tela]
- Abre o navegador em app.scannerdasaude.com/login
- Faz login com email/senha
- Dashboard abre

[0:35 — Narração]  
"Cada nutri tem um painel onde aprova os posts gerados pelo sistema antes 
de publicar."

[0:45 — Tela]
- Clica em "Aprovar semana"
- Mostra a lista de 7 posts aguardando aprovação
- Abre um deles
- Mostra a legenda gerada, imagem, hashtags

[1:15 — Narração]
"A nutri revisa, ajusta se quiser, e aprova. Quando aprovar, o sistema publica
no Instagram dela automaticamente na data programada."

[1:30 — Tela]
- Clica "Aprovar post"  
- Na lista, mostra status mudando pra "Aprovado"
- Explica que um cron job a cada 15min checa posts aprovados e publica
- Abre em outra aba o Instagram da nutri e mostra o post publicado

[2:15 — Narração]
"Essa automação usa a API Graph do Instagram com a permissão 
instagram_content_publish pra criar o container, aguardar processamento e
publicar. Nenhuma publicação é feita sem aprovação manual da nutricionista."

[2:30 — Tela]
- Volta pro dashboard
- Mostra métricas do post publicado (alcance, curtidas)
- Fim
```

**URL da funcionalidade:** `app.scannerdasaude.com/dashboard/aprovar`

---

## VÍDEO 2 — `instagram_manage_insights`

**Permissão:** Ler métricas de posts e conta.

### Roteiro

```
[0:00 — Narração]
"Agora vou mostrar como usamos a permissão instagram_manage_insights pra 
exibir métricas dos posts pra nutricionista."

[0:15 — Tela]
- Dashboard da nutri → clica "Relatório semanal"
- Página abre com gráficos: alcance, engajamento, seguidores

[0:45 — Narração]
"O sistema coleta automaticamente as métricas dos posts publicados e exibe
um relatório consolidado semanal pra nutri acompanhar performance."

[1:00 — Tela]
- Mostra comparativo semana vs semana
- Abre detalhe de um post específico → mostra insights (alcance, impressões, 
  taxa de engajamento)

[1:45 — Narração]
"Essas informações ajudam a nutricionista a entender qual tipo de conteúdo
está ressoando com seu público e ajustar sua estratégia."

[2:00 — Tela]
- Mostra que ela não consegue ver dados de outra nutri (Row Level Security)
- Fim
```

**URL:** `app.scannerdasaude.com/dashboard/relatorios`

---

## VÍDEO 3 — `pages_show_list` + `pages_read_engagement`

**Permissão:** Listar as Pages que a nutri administra + ler engajamento.

### Roteiro

```
[0:00 — Narração]
"Vou mostrar o fluxo de conexão inicial do Instagram, que usa pages_show_list 
e pages_read_engagement."

[0:15 — Tela]
- Dashboard → "Integrações" → botão "Conectar Instagram"
- Redireciona pro Facebook Login
- Mostra tela de autorização Meta
- Usuária seleciona a Página do Facebook vinculada ao Instagram Business
- Autoriza permissões

[1:15 — Narração]
"O app precisa saber quais Pages a nutricionista administra pra identificar 
qual está vinculada à conta Business do Instagram dela."

[1:30 — Tela]
- Volta pro dashboard → mostra status "Instagram conectado"
- Explica que o token fica criptografado em AES-256-GCM no banco
- Explica que a nutri pode desconectar a qualquer momento

[2:15 — Narração]
"Sem essa conexão, não conseguimos publicar em nome dela. Por isso o 
pages_show_list é essencial no primeiro acesso."

[2:30 — Fim]
```

**URL:** `app.scannerdasaude.com/onboarding?step=6`

---

## VÍDEO 4 — `ads_management` (se for usar)

**Permissão:** Gerenciar campanhas de anúncios Meta Ads.

### Roteiro

```
[0:00 — Narração]
"Esse vídeo demonstra a permissão ads_management, que usamos pra criar e 
gerenciar campanhas de anúncios do Meta Ads em nome da nutricionista."

[0:15 — Tela]
- Dashboard → "Anúncios" → "Criar campanha"
- Formulário: objetivo (leads), verba diária, público
- Mostra benchmark de CTR/CPL esperados

[1:00 — Narração]  
"O sistema pré-preenche configurações baseadas em benchmarks do nicho de 
saúde integrativa. A nutri revisa e aprova."

[1:15 — Tela]
- Submit → campanha criada no Meta Business
- Abre Business Manager em outra aba → mostra a campanha lá
- Volta → mostra métricas no dashboard

[2:00 — Narração]
"Todas as campanhas ficam sob controle da nutri. Ela pode pausar, editar ou 
cancelar a qualquer momento. Usamos ads_management pra fazer isso pela API 
sem ela precisar sair do nosso painel."

[2:30 — Tela]
- Mostra botão "Pausar campanha" funcionando
- Fim
```

**URL:** `app.scannerdasaude.com/dashboard/anuncios`

---

## Checklist antes de submeter

Pra cada permissão no **Revisão do App → Permissões e Recursos**:

- [ ] Selecionar a permissão
- [ ] Clicar em "Solicitar"
- [ ] Preencher:
  - **Como você usa?** (cole a descrição do uso — tem exemplos no arquivo `meta-app-review-descricoes.md`)
  - **URL da funcionalidade:** (cole a URL correspondente acima)
  - **Vídeo de demonstração:** (upload do .mp4 respectivo)
  - **Instruções de teste pra revisor:**
    ```
    Acesse: app.scannerdasaude.com/login
    Email: [criar conta de teste demo@scannerdasaude.com]
    Senha: [definir e informar]
    
    Essa conta tem uma Instagram Business de teste já conectada.
    Siga o fluxo mostrado no vídeo pra reproduzir a funcionalidade.
    ```
- [ ] Submeter

## Criar conta de teste antes

Antes de submeter, crie:
1. Uma franqueada de teste `demo@scannerdasaude.com` com senha simples
2. Conecte um Instagram Business de teste (pode ser uma conta nova que você cria específica pra revisão)
3. Preencha o onboarding completo
4. Gere uma semana de posts manualmente pra ter conteúdo pronto pra demonstração
5. Deixe ativa enquanto a revisão está em andamento

---

## Dicas pra aumentar taxa de aprovação

1. **Não use termos vagos.** Seja explícito: "publicamos o post X no Instagram Y após aprovação manual pela usuária Z".
2. **Mostre consentimento.** Demonstre onde a usuária vê e aprova cada ação.
3. **Mostre onde a usuária revoga.** Um link/botão "Desconectar Instagram" claro.
4. **Explique criptografia.** Menciona AES-256-GCM dos tokens.
5. **Mostre políticas.** O footer com links pra Privacidade/Termos/Deletar Dados já cobre.
6. **Evite:** pular passos, cortar áudio no meio, gravar em baixa resolução.

Se for rejeitado, **leia com calma o motivo**, ajuste e resubmeta. Normal 2-3 rodadas até aprovar.
