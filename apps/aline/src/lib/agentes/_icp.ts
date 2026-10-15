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
- Classe A baixa / B alta — médica, advogada, empresária pequena,
  professora universitária, executiva média
- Já fez 2-4 nutricionistas/coaches antes, FRUSTRADA
- Lê Pollan, Lustig, Tim Ferriss. Conhece termos como MTHFR,
  microbioma, hashimoto, sinergia nutricional, nutrigenética
- Pesquisa 5-10 dias antes de fechar — decide por VALOR, não preço
- Tom emocional: cética com promessa, frustrada com superficialidade,
  MAS esperancosa quando ve profundidade real
- Se organiza financeiramente pra fazer o tratamento — não precisa
  ter dinheiro sobrando, precisa ENXERGAR VALOR

Quem NÃO é:
- Riquissima de status/luxo (yacht, jets) -> lead chato
- Mulher <30 anos impulsiva ou >55 com rede já estabelecida
- Quem só quer "emagrecer 10kg" — busca quick fix, não causa raiz
- Fitness influencer addict
- Quem pergunta SÓ preço sem qualificar dor
- Classe C/D — não cabe ticket alto
- "Compulsiva por dieta da moda"

Linguagem que ATRAI o ICP:
- Termos técnicos: nutrigenética, sinergias, mapa metabólico,
  microbiota, MTHFR, raciocínio clínico
- Tom editorial sofisticado, frases longas com profundidade
- Foco em "entender" e "personalizar", não em "transformar" ou
  "consertar"
- Reconhece frustração com nutris anteriores (sem falar mal)
- Convida pra processo, não promete milagre

Linguagem que AFASTA (não usar):
- "Emagreca X kg em Y dias"
- "Antes e depois"
- "Detox", "milagrosa", "definitiva", "reset metabólico"
- Linguagem hustle/coach motivacional
- Emojis em excesso
`.trim();

export const ICP_SCANNERDASAUDE_B2B = `
PERFIL DE NUTRICIONISTA IDEAL (ICP) — Scanner da Saúde (@scannerdasaude)

Quem é (público profissional — B2B):
- Nutricionista 28-50 anos, formada há 3+ anos
- Já atende em consultório próprio ou presencial, frustrada com
  limitação de escala manual
- Investe em si mesma — paga cursos, lê livros da área, vai em
  eventos
- Conhece conceitos de nutrição funcional, nutrigenética, medicina
  integrativa
- Quer AUMENTAR ticket + escalar sem esgotar (saindo de
  "atendimento manual por WhatsApp" pra "sistema")
- Frustrada com: cobranca baixa (R\$ 150-300 consulta), agenda cheia
  mas pouco lucro, trabalho manual
- Desejo: posicionar-se como DETETIVE DA SAÚDE (não "nutri que
  monta dieta"), cobrar premium, trabalhar melhor com menos
  pacientes

Quem NÃO é:
- Estudante de nutrição (não tem dinheiro, não decide)
- Nutri que não investe em si (nunca pagou curso/mentoria)
- Nutri que vê nutrição como commodity (cardápio, contagem de
  calorias) — não vai valorizar Scanner
- Nutri que busca "soft skills" genéricas — não é o produto

Sinais verdes:
- Menciona testes laboratoriais que já pede
- Cita autores/cursos da área (José Neto, Larissa Ferraz, etc)
- Fala em "raciocínio clínico", "investigação", "causa raiz"
- Questiona prática vigente do mercado (criticidade saudável)
- Pergunta sobre escala, diferenciação, posicionamento

Sinais vermelhos:
- "Tem cardapio pronto pra eu adaptar?"
- "Qual o preço?" sem contexto
- "Não gosto de tecnologia"
- Quer solução quick fix pro próprio consultório

Linguagem que ATRAI o ICP:
- "Detetive da saúde" como identidade profissional
- "Investigação clínica", "raciocínio diagnóstico", "causa raiz"
- Referências acadêmicas (Unicamp, USP, Conbrasd, IBNutriclin)
- Casos de sucesso de franqueadas (com dados específicos)
- Bastidor de atendimento premium (como conduzir anamnese, como
  precificar, como se posicionar)

Linguagem que AFASTA:
- "Ganhe dinheiro fácil"
- "Trabalhe 2 horas por dia"
- Promessa de receita específica ("R\$ 20k/mês em 30 dias")
- Marketing multinível / pirâmide
- Coach motivacional genérico
`.trim();

export function icpParaPerfil(slug: string): string {
  if (slug === "scannerdasaude") return ICP_SCANNERDASAUDE_B2B;
  return ICP_NUTRISECRETS_B2C;
}

export function perfilContexto(slug: string): "B2B_nutris" | "B2C_paciente" {
  return slug === "scannerdasaude" ? "B2B_nutris" : "B2C_paciente";
}
