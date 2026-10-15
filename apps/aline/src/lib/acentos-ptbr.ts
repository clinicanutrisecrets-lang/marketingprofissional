/**
 * acentos-ptbr.ts — ESPELHO de `lib/acentos-ptbr.ts` do repo scanner-saude.
 *
 * 🔴 A FONTE ÚNICA é a do scanner-saude. Os repos deployam separado, então não
 * dá pra importar entre eles: mudou a lista lá, copie o arquivo inteiro pra cá
 * (e pro outro espelho, apps/franquias/src/lib/acentos-ptbr.ts). Não edite a
 * LISTA só aqui.
 *
 * Aqui ele é a rede de segurança do texto que o modelo escreve e vira post
 * (legenda, CTA, slides, roteiro). Quem chama é `lib/texto/acentos-visivel.ts`,
 * que protege link, hashtag, @perfil e id interno antes de acentuar.
 */
/**
/**
 * lib/acentos-ptbr.ts — devolve acento e cedilha a texto digitado sem eles.
 *
 * Caso que originou (Aline 09/10/2026): a Juliana colou um texto sem acento
 * no "Colar o meu texto" do carrossel ("metilacao", "fabrica", "Saude") e a
 * arte saiu assim, porque esse caminho não chama o algoritmo.
 *
 * 🔴 Só palavras SEM ambiguidade. "esta/está", "e/é", "pratica/prática",
 * "evidencia/evidência", "especifica/específica" e qualquer forma que também
 * seja verbo ficam de fora: corrigir errado é pior que deixar sem acento.
 * "fabrica" só vira "fábrica" na expressão "fábrica da saúde" (o corpo
 * também "fabrica" vitamina D).
 *
 * Puro: sem rede, React ou Supabase.
 */

const LISTA = `
genética genético genéticos genéticas epigenética epigenético nutrigenética nutrigenômica
nutrição saúde hormônio hormônios inflamação inflamações inflamatório inflamatória inflamatórios
alimentação gestação digestão digestões síndrome metabólica metabólico metabólicas metabólicos
cansaço infância criança crianças menstruação clínica clínico clínicas clínicos pediátrica pediátrico
metilação função funções variação variações mutação mutações alteração alterações
absorção produção regulação oxidação detoxificação desintoxicação suplementação prescrição
avaliação relação reação reações atenção informação informações condição condições expressão
pressão tensão depressão ação ações solução soluções conversão eliminação proteção
hidratação respiração circulação ovulação conexão conexões razão orientação orientações
proteína proteínas açúcar açúcares ácido ácidos fólico célula células fígado órgão órgãos
músculo músculos glândula glândulas cérebro coração pâncreas estômago intestinos
óleo óleos ômega grãos feijão pão pães lipídios magnésio cálcio potássio sódio selênio
vitamínico vitamínicos deficiência deficiências exercício exercícios hábito hábitos
ciência científico científica científicos científicas experiência consequência frequência
importância substância substâncias resistência tolerância intolerância intolerâncias
imunológico imunológica biológico biológica fisiológico fisiológica físico física
médico médica crônico crônica crônicos crônicas período períodos família famílias história
saudável saudáveis possível possíveis responsável responsáveis provável fácil difícil
rápido rápida único única último última próximo próxima diagnóstico diagnósticos
não você vocês também porém através então além após até são estão será serão três mês
água sintomático enzimático antioxidante antioxidantes neurotransmissor
matéria equilíbrio formação concepção fertilização óvulos amanhã grávida grávidas
mãe mães útero ovário ovários nível níveis memória conteúdo necessário necessária
vários várias sério séria trimestre gestacional
limão limões feijões mamão melão café cafés chá chás açaí abóbora abóboras brócolis
cúrcuma tâmara tâmaras pêssego pêssegos rúcula amêndoa amêndoas avelã avelãs linhaça
orégano páprica manjericão salsão agrião requeijão purê açafrão hortelã maracujá jiló
salmão camarão camarões filé sanduíche sanduíches orgânico orgânica orgânicos orgânicas
manhã manhãs almoço almoços refeição refeições porção porções opção opções sugestão
sugestões preparação xícara xícaras glicêmico glicêmica glicêmicos índice índices
calórico calórica lácteo lácteos energético energética fogão
tailandês tilápia fermentação fermentações pó parmesão poché grão glúten colágeno pimentão
pimentões macarrão sêmola fécula cânhamo
`

const ACENTOS: Record<string, string> = {}
for (const certo of LISTA.split(/\s+/).filter(Boolean)) {
  const sem = certo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (sem !== certo.toLowerCase()) ACENTOS[sem] = certo
}

function comMesmaCaixa(original: string, certo: string): string {
  if (original.length > 1 && original === original.toUpperCase()) return certo.toUpperCase()
  if (original[0] !== original[0].toLowerCase()) return certo[0].toUpperCase() + certo.slice(1)
  return certo
}

// Palavras que sem acento também são verbo ("o corpo fabrica", "eu ovulo",
// "ela bebe"):
// só viram substantivo depois de artigo, preposição com artigo ou possessivo.
const DETERMINANTE = '(?:a|o|da|do|na|no|pela|pelo|sua|seu|essa|esse|dessa|desse|nessa|nesse|esta|este|desta|deste|nossa|nosso|uma|um|cada)'
const SO_DEPOIS_DE_DETERMINANTE: Array<[string, string]> = [
  ['fabrica', 'fábrica'], ['ovulo', 'óvulo'], ['bebe', 'bebê'], ['bebes', 'bebês'],
]

/** Acentua só as palavras conhecidas, preservando pontuação e maiúscula. */
export const PARES_ACENTO: Readonly<Record<string, string>> = ACENTOS

export function acentuar(texto: string): string {
  let t = String(texto ?? '')
    .replace(/\b(fabrica)(?=\s+d[ao]\s+(?:saude|saúde)\b)/giu, (p) => comMesmaCaixa(p, 'fábrica'))
  // "pos" sozinho também é "pôs" (verbo); com hífen é sempre prefixo.
  t = t.replace(/\b(pre|pos)(?=-\p{L})/giu, (p) => comMesmaCaixa(p, p.toLowerCase() === 'pre' ? 'pré' : 'pós'))
  for (const [sem, certo] of SO_DEPOIS_DE_DETERMINANTE) {
    t = t.replace(new RegExp(`(\\b${DETERMINANTE}\\s+)(${sem})\\b`, 'giu'), (_m, antes: string, p: string) => antes + comMesmaCaixa(p, certo))
  }
  return t
    .replace(/\p{L}+/gu, (p) => {
      const certo = ACENTOS[p.toLowerCase()]
      return certo ? comMesmaCaixa(p, certo) : p
    })
}
