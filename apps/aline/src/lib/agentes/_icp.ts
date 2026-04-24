/**
 * ICP por perfil do Studio Aline.
 *
 * @nutrisecrets (B2C): paciente final premium — mesmo ICP do Marketing
 *   (ticket alto nutri premium). Reference: apps/franquias/src/lib/agentes/_icp.ts
 *
 * @scannerdasaude (B2B): nutricionistas que podem virar franqueadas
 *   ou clientes do SaaS. ICP completamente diferente.
 */

export const ICP_NUTRISECRETS_B2C = `
PERFIL DE PACIENTE IDEAL (ICP) — Nutri Secrets (@nutrisecrets)

Quem é:
- Mulher 35-52 anos
- Classe A baixa / B alta — medica, advogada, empresaria pequena,
  professora universitaria, executiva media
- Ja fez 2-4 nutricionistas/coaches antes, FRUSTRADA
- Le Pollan, Lustig, Tim Ferriss. Conhece termos como MTHFR,
  microbioma, hashimoto, sinergia nutricional, nutrigenetica
- Pesquisa 5-10 dias antes de fechar — decide por VALOR, nao preco
- Tom emocional: cetica com promessa, frustrada com superficialidade,
  MAS esperancosa quando ve profundidade real
- Se organiza financeiramente pra fazer o tratamento — nao precisa
  ter dinheiro sobrando, precisa ENXERGAR VALOR

Quem NAO e:
- Riquissima de status/luxo (yacht, jets) -> lead chato
- Mulher <30 anos impulsiva ou >55 com rede ja estabelecida
- Quem so quer "emagrecer 10kg" — busca quick fix, nao causa raiz
- Fitness influencer addict
- Quem pergunta SO preco sem qualificar dor
- Classe C/D — nao cabe ticket alto
- "Compulsiva por dieta da moda"

Linguagem que ATRAI o ICP:
- Termos tecnicos: nutrigenetica, sinergias, mapa metabolico,
  microbiota, MTHFR, raciocinio clinico
- Tom editorial sofisticado, frases longas com profundidade
- Foco em "entender" e "personalizar", nao em "transformar" ou
  "consertar"
- Reconhece frustracao com nutris anteriores (sem falar mal)
- Convida pra processo, nao promete milagre

Linguagem que AFASTA (nao usar):
- "Emagreca X kg em Y dias"
- "Antes e depois"
- "Detox", "milagrosa", "definitiva", "reset metabolico"
- Linguagem hustle/coach motivacional
- Emojis em excesso
`.trim();

export const ICP_SCANNERDASAUDE_B2B = `
PERFIL DE NUTRICIONISTA IDEAL (ICP) — Scanner da Saude (@scannerdasaude)

Quem e (publico profissional — B2B):
- Nutricionista 28-50 anos, formada ha 3+ anos
- Ja atende em consultorio proprio ou presencial, frustrada com
  limitacao de escala manual
- Investe em si mesma — paga cursos, le livros da area, vai em
  eventos
- Conhece conceitos de nutricao funcional, nutrigenetica, medicina
  integrativa
- Quer AUMENTAR ticket + escalar sem esgotar (saindo de
  "atendimento manual por WhatsApp" pra "sistema")
- Frustrada com: cobranca baixa (R\$ 150-300 consulta), agenda cheia
  mas pouco lucro, trabalho manual
- Desejo: posicionar-se como DETETIVE DA SAUDE (nao "nutri que
  monta dieta"), cobrar premium, trabalhar melhor com menos
  pacientes

Quem NAO e:
- Estudante de nutricao (nao tem dinheiro, nao decide)
- Nutri que nao investe em si (nunca pagou curso/mentoria)
- Nutri que ve nutricao como commodity (cardapio, contagem de
  calorias) — nao vai valorizar Scanner
- Nutri que busca "soft skills" genericas — nao e o produto

Sinais verdes:
- Menciona testes laboratoriais que ja pede
- Cita autores/cursos da area (Jose Neto, Larissa Ferraz, etc)
- Fala em "raciocinio clinico", "investigacao", "causa raiz"
- Questiona pratica vigente do mercado (criticidade saudavel)
- Pergunta sobre escala, diferenciacao, posicionamento

Sinais vermelhos:
- "Tem cardapio pronto pra eu adaptar?"
- "Qual o preco?" sem contexto
- "Nao gosto de tecnologia"
- Quer solucao quick fix pro proprio consultorio

Linguagem que ATRAI o ICP:
- "Detetive da saude" como identidade profissional
- "Investigacao clinica", "raciocinio diagnostico", "causa raiz"
- Referencias academicas (Unicamp, USP, Conbrasd, IBNutriclin)
- Casos de sucesso de franqueadas (com dados especificos)
- Bastidor de atendimento premium (como conduzir anamnese, como
  precificar, como se posicionar)

Linguagem que AFASTA:
- "Ganhe dinheiro facil"
- "Trabalhe 2 horas por dia"
- Promessa de receita especifica ("R\$ 20k/mes em 30 dias")
- Marketing multinivel / piramide
- Coach motivacional generico
`.trim();

export function icpParaPerfil(slug: string): string {
  if (slug === "scannerdasaude") return ICP_SCANNERDASAUDE_B2B;
  return ICP_NUTRISECRETS_B2C;
}

export function perfilContexto(slug: string): "B2B_nutris" | "B2C_paciente" {
  return slug === "scannerdasaude" ? "B2B_nutris" : "B2C_paciente";
}
