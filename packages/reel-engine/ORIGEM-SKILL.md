---
name: nutri-secrets-reel
description: Gera reels animados 9:16 em MP4 para o Instagram @nutri_secrets da nutricionista Aline Quissak, no formato "Detetive da Saúde", título-gancho grande com o tema, sintomas anotados sobre uma ilustração de personagem com setas indicativas, genes com rsID, parâmetros de exame de sangue, bactérias da microbiota, e sinergia de alimentos terapêuticos com quantidades. Use SEMPRE que a Aline pedir reel, vídeo, animação, GIF, "vídeo animado", "reel sobre X", ou conteúdo em movimento para Instagram, mesmo que o tema venha solto como "faz um reel sobre SOP", "quero um vídeo de intestino irritável", "animação sobre GLP-1", "reel de fertilidade". NÃO dispare para carrosséis estáticos (use nutri-secrets-carrossel) nem para tarefas de nutrição clínica fora de redes sociais.
---

# Reels animados, Nutri Secrets

Motor de vídeo 9:16 (1080×1920) escrito em Python/PIL + ffmpeg. Renderiza MP4 pronto
para postar, sem depender de HTML, Canva ou links externos, a Aline trabalha **100% do
celular** e só consegue usar arquivos binários entregues por `present_files`.

## Regra de entrega (não negociável)

- Entregar **apenas o MP4 final**. Não mandar frames soltos, não mandar HTML,
  não mandar link. Um arquivo, para ela baixar e postar.
- Nunca criar artifact React/HTML para isso: não abre no ambiente dela.

## Fluxo

1. Ler `references/template-conteudo.md` e montar o conteúdo clínico do tema pedido.
2. Verificar cada associação gene,sintoma, marcador e bactéria no **PubMed** (MCP disponível).
   Nunca afirmar associação de memória. Preferir 2022+ e citar DOI na resposta ao final.
3. Escrever um `SPEC` no formato de `assets/engine/spec_exemplo_menopausa.py`.
4. Renderizar:

```python
import sys; sys.path.insert(0, "/mnt/skills/user/nutri-secrets-reel/assets/engine")
import build
from meu_spec import SPEC
build.render(SPEC, "/mnt/user-data/outputs/reel_<tema>.mp4")
```

O render leva **~5 minutos**. Rodar com `nohup ... &` e acompanhar o log, porque
uma chamada síncrona estoura o limite de tempo do bash.

5. Antes de entregar, validar layout com o mapa textual (`references/validacao.md`).
   Imagens às vezes não renderizam na visualização; a validação por pixels é o
   caminho confiável.

## Estrutura obrigatória do reel

Sempre nesta ordem:

| # | Cena | Tipo | Obrigatório |
|---|------|------|-------------|
| 1 | Gancho | `hook` | Tema em corpo gigante + 2 linhas de gancho |
| 2 | Sintoma 01 | `sintoma` | figura + card lateral + seta |
| 3 | Gene 01 | `gene` | gene + rsID + metáfora |
| 4 | Sinergia 01 | `sinergia` | cena própria, 3 alimentos sequenciais |
| 5,7 | Sintoma + Gene + Sinergia 02 | | |
| 8,10 | Sintoma + Gene + Sinergia 03 | | ideal 3 genes, mínimo 2 |
| 11 | Exame de sangue | `marcadores` | **exatamente 3 parâmetros** |
| 12 | Microbiota | `marcadores` | **exatamente 2 bactérias** |
| 13 | Virada | `virada` | a frase que reenquadra tudo |
| 14 | CTA | `cta` | compartilhe + salve |

### Versão anúncio

Ligar `build.MODO_ANUNCIO = True` antes de renderizar. Isso muda todas as cenas:

- `@nutri_secrets` sai do rodapé e vira cabeçalho pequeno no topo direito
- o rodapé passa a exibir um carimbo fixo em caixa alta espaçada, definido em
  `build.CARIMBO`, com régua fina acima. Padrão atual: "IMERSÃO EM NUTRIGENÉTICA
  / AULA GRATUITA PARA NUTRICIONISTAS"

O gancho muda de tema: em vez do nome da condição, o tema vira o público
("Nutricionista") e a linha de baixo faz a pergunta de qualificação ("Você
atende pacientes na menopausa?"), via chave `sub` na cena de hook. O corpo do
título encolhe sozinho para caber na largura segura (`fit_title`).

O fecho usa `cta_anuncio`. Ver `assets/engine/spec_exemplo_anuncio.py`, que
herda o SPEC orgânico por `deepcopy` e sobrescreve só a primeira e a última cena.

Como cabeçalho e carimbo afetam todas as cenas, a versão anúncio exige render
completo. Só quando muda apenas o fecho é que vale o symlink do corpo.

Depois de cada `sinergia` vem uma cena `nota` com o porquê da combinação em
corpo grande (50px), revelado linha a linha, com os glifos dos 3 alimentos no
topo. O porquê nunca fica como rodapé da própria cena de sinergia, ali sobra
menos de 2s de leitura.

Rodapés e ressalvas nunca vão em corpo miúdo no pé da tela: usar `callout()`,
que é caixa com barra de acento e texto 36px, posicionada logo abaixo do conteúdo.

**A sinergia alimentar nunca fica espremida dentro do card do gene.** Vira cena
própria, com revelação sequencial: ilustração do alimento → nome → quantidade em
corpo gigante → frequência. Um alimento por vez, ~2,7s cada. O público da Aline
tem dificuldade com letra pequena; texto grande e um elemento por vez é regra.

Glifos de alimento disponíveis em `assets/engine/foods.py`. Se o tema pedir um
alimento que ainda não existe, desenhar o glifo novo seguindo o padrão (flat,
com contorno real via `_stroke`, fill claro sobre fundo claro fica invisível).

O gancho segue o padrão:

```
Menopausa            <- tema, Fraunces Bold 148, corpo gigante
────                 <- filete na cor do tema
Não é frescura os sintomas.
É o corpo pedindo ajuda.     <- segunda linha na cor de acento
```

O CTA é **fixo** e nunca vira agendamento, telefone ou link:

```
Conhece alguém que precisa saber disso?
 (✈) COMPARTILHE
Vai querer consultar depois?
 (🔖) SALVE
```

O ícone de salvar é o **marcador** (bookmark), não envelope, é o glifo que o
Instagram usa e que o público reconhece como o gesto de salvar.

## Travessão é proibido

Nenhum travessão (,) ou meia-risca (,) em texto de tela ou legenda. Verificar com
`grep -n ",\|,"` no SPEC antes de renderizar; tem que voltar vazio. Detalhes em
`references/voz-e-conformidade.md`.

## Ritmo

Cenas longas o suficiente para ler. Referência: `hook` 4,4s · `sintoma` 5,5s ·
`gene` 6,2s · `sinergia` 10,6s · `nota` 6,6,6,8s · `marcadores` 11,5,12,5s ·
`virada` 5,4s · `cta` 7s.

Um reel com o template completo dá ~2min. **Não encurtar por medo de duração** ,
a Aline confirmou que o perfil dela sustenta retenção boa em vídeos de até 3
minutos. Priorizar tempo de leitura sobre brevidade sempre.

As animações usam **segundos absolutos**, não fração da cena, assim alongar a
cena aumenta o tempo de leitura em vez de deixar a animação lenta. Nunca voltar
a usar `t = fi/n` para entradas.

## Referências

- `references/template-conteudo.md`, o que cada cena precisa conter clinicamente
- `references/voz-e-conformidade.md`, tom lúdico, CFN 599/2018, o que nunca dizer
- `references/marca.md`, paleta semântica, tipografia, zona segura do Reels
- `references/validacao.md`, como conferir o layout sem depender de ver a imagem
- `assets/engine/`, motor completo (`build.py` é o ponto de entrada)
- `assets/engine/spec_exemplo_menopausa.py`, SPEC de referência já validado
