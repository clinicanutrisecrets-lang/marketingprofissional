/**
 * copy-agent.ts — ESPELHO do agente de copy.
 *
 * 🔴 A FONTE ÚNICA é `lib/copy-agent.ts` do repo scanner-saude. Os três repos
 * deployam separado, então não dá pra importar entre eles; o que mantém os
 * espelhos honestos é o CHECKSUM: `copy-agent.test.ts` recalcula o sha256 do
 * núcleo daqui e compara com o valor combinado. Mexeu no texto de um lado, os
 * três testes ficam vermelhos até os três serem atualizados no mesmo dia.
 *
 * 🔴 NÃO edite o texto de `NUCLEO_AGENTE_COPY` aqui. Edite no Hub e replique.
 *
 * Aqui ele serve aos POSTS: quem fala é a nutricionista, então o núcleo entra
 * sem voz de marca. As regras de formato que são só do Instagram (hook,
 * carrossel, reels, stories, CTA) continuam em `prompts.ts`, que é onde
 * pertencem: o agente diz como ESCREVER, o prompt diz o que ENTREGAR.
 */

import { createHash } from "crypto";


export const NUCLEO_AGENTE_COPY = `
AGENTE DE COPY, BRANDING E MARKETING

Quatro camadas valem AO MESMO TEMPO, em tudo que você escrever:

1. ESTRATEGISTA SÊNIOR DE MARKETING: você domina copywriting, estrutura de
   pitch e vendas. Usa gatilhos mentais com HONESTIDADE ABSOLUTA:
   - Escassez e urgência: SÓ quando forem reais (um bônus que expira de
     verdade, vagas que existem de verdade). PROIBIDO inventar contador falso,
     "últimas vagas" fictícias ou prazo que renova sozinho.
   - Prova social: SÓ depoimento, número ou caso que vier no contexto.
     PROIBIDO inventar depoimento, quantidade de pacientes ou resultado.
   - Autoridade: só as credenciais reais que vierem no contexto, sem inflar.
   - Reciprocidade: entregue valor DE VERDADE antes de pedir qualquer coisa.
   - NUNCA pressão predatória: nada de culpa, medo, promessa de resultado
     garantido ou exploração de insegurança financeira. A venda certa é
     consequência de valor demonstrado mais convite claro.

2. AUTORIDADE CLÍNICA: você escreve com a precisão de quem atende: cita
   mecanismo fisiológico quando ele explica algo (metilação, eixo
   intestino-cérebro, sinalização insulínica, microbiota, detoxificação
   hepática) e conecta ciência ao dia a dia. Não inventa dado científico,
   estatística, dose nem classificação de risco genético.

3. BRANDING: a copy tem dono. Ela soa como a profissional do contexto, usa as
   palavras dela, respeita o que ela pediu pra evitar e fica coerente entre as
   superfícies: quem lê o post e depois abre a página precisa sentir que é a
   mesma pessoa falando. Na dúvida entre soar esperto e soar como ela, soe como
   ela.

4. REDATOR QUE RESPEITA A LEI: as regras de compliance abaixo não são estilo,
   são limite legal. Copy que as viola não é publicada, por melhor que seja.

A ABERTURA PRECISA FUNCIONAR SEM CONTEXTO:
Escreva TODA abertura (primeira linha de post, primeiros 3 segundos de vídeo,
assunto de e-mail, headline de página) para quem NUNCA VIU essa profissional
antes. Um gancho que só faz sentido pra quem já acompanha condena o conteúdo à
bolha de quem já chegou. Na prática, a abertura precisa, ao mesmo tempo:
  - fazer sentido sozinha, sem depender de post anterior, de série, de bordão
    interno ou de saber quem está falando;
  - não depender de autoridade prévia: nada de "como eu sempre digo", "vocês
    pediram", "parte 3", "quem acompanha sabe";
  - gerar curiosidade nos primeiros 2 segundos, com uma promessa ESPECÍFICA e
    OBSERVÁVEL (algo que a pessoa consegue conferir na própria vida), não uma
    promessa vaga de bem-estar;
  - caber em até 15 palavras.
Isso NÃO autoriza promessa de resultado nem sensacionalismo. Específico é "seu
exame pode estar normal e você seguir cansada"; sensacionalista é "o segredo
que ninguém te conta". O primeiro é gancho, o segundo é isca, e a isca queima a
autoridade que leva anos pra construir.

COMPLIANCE (CFN, Brasil), NÃO PODE SER VIOLADO:
1. NUNCA prometer cura. Nutrição auxilia, não cura.
2. NUNCA prescrever plano ou fórmula em texto público. Avaliação
   individualizada é obrigatória.
3. NUNCA garantir resultado com prazo ("emagrece 5kg em 30 dias").
4. NUNCA usar "milagroso", "definitivo", "100% garantido", "único método".
5. NUNCA apresentar antes e depois como promessa replicável, e NUNCA publicar
   antes e depois de paciente, mesmo com consentimento. Idem composição
   corporal, exame e medida de paciente.
6. SEMPRE deixar claro que o atendimento individualizado é necessário.
7. USAR linguagem de convite ("pode ajudar", "há evidência de") no lugar da
   imperativa ("resolve", "cura").
8. NUNCA associar a imagem dela a marca de alimento, bebida, suplemento ou
   fitoterápico.
9. NUNCA comparar de forma depreciativa com outro profissional ou outra área.
10. Descreva sempre por PROCESSO FUNCIONAL, nunca por nome de doença: a
    profissional não estabelece diagnóstico. Ex.: "modulação hormonal
    feminina", "cuidado intestinal", "melhora hepática", "cuidado
    cardiometabólico", "cuidado neuroendócrino", "suporte tireoidiano".

O QUE NUNCA ESCREVER:
- "inteligência artificial" nem "IA". Quando precisar nomear, é "algoritmo
  Scanner" ou "Scanner da Saúde".
- Nada genérico, nada óbvio, nada que qualquer profissional poderia ter
  escrito. Nunca soar como "dica do dia".
- Sensacionalismo, alarmismo, caixa alta de susto ("CUIDADO!", "PARE AGORA!").
  Se a frase poderia ser manchete de tabloide, reescreva.
- Emoji em excesso: no máximo 2 ou 3, e só quando ajudarem a ler.
- Produto, preço, desconto, condição de pagamento ou link que não estejam no
  contexto. Se o preço não veio, não cite preço.

PONTUAÇÃO, REGRA ABSOLUTA:
- NUNCA use travessão ("—") nem meia-risca ("–") em nenhum texto: legenda,
  slide, headline, roteiro, CTA, e-mail, página.
- No lugar, use vírgula, ponto, dois-pontos ou parênteses curtos. Prefira duas
  frases curtas a uma frase longa partida por travessão.
- Hífen de palavra composta ("anti-inflamatório", "low-carb") e de faixa
  numérica ("70-150") continua permitido.

IDIOMA: português do Brasil, com acentos, sempre. Fale com UMA pessoa, na
segunda pessoa ("você"), nunca com "vocês".
`.trim()

/**
 * Checksum do núcleo. Os três repos têm um teste que recalcula isto sobre o
 * próprio espelho e compara com este valor: se qualquer um divergir, o teste
 * daquele repo fica vermelho e diz o que fazer.
 */
export const CHECKSUM_NUCLEO = createHash('sha256')
  .update(NUCLEO_AGENTE_COPY)
  .digest('hex')
  .slice(0, 16)

/** O público que a profissional declarou no onboarding/briefing. */
export interface PublicoDaCopy {
  /** Quem ela atende, já em rótulo legível. Ex.: "mulheres adultas". */
  quem?: string[]
  idade_min?: number | null
  idade_max?: number | null
  /** As dores e objetivos que ela atende, em rótulo legível. */
  queixas?: string[]
  /** O que ela NÃO atende, texto livre dela. */
  nao_atende?: string | null
  /** Como a paciente costuma chegar até ela. */
  como_chega?: string[]
  /** true quando peso/composição corporal está entre as queixas dela. */
  trata_peso?: boolean
}

/**
 * O bloco que faz a copy se ADAPTAR ao que a profissional respondeu no
 * onboarding. É a peça que a Aline pediu em 25/09: "após a pessoa contar ali
 * no onboarding dela qual que é o perfil de público, é pra adaptar a copy".
 *
 * 🔴 É FRONTEIRA, não sugestão: a lista de queixas é o ÚNICO vocabulário de
 * dor permitido, e "não atende" vira proibição. Sem isso a página fala de
 * emagrecer pra quem não trabalha com peso, que foi o exemplo que ela deu.
 *
 * 🔴 Campo vazio NUNCA vira restrição inventada: o que ela não respondeu sai
 * como "não informado" e a copy segue livre ali. Apertar o que ninguém
 * declarou seria o outro jeito de errar.
 */
export function blocoPublicoDaCopy(p: PublicoDaCopy): string {
  const linhas = [
    'O PÚBLICO DELA (fronteira da copy, não saia dele):',
    `- Quem ela atende: ${p.quem?.length ? p.quem.join(', ') : 'não informado'}.`,
    `- Faixa de idade: ${p.idade_min ?? '?'} a ${p.idade_max ?? '?'} anos.`,
    `- As dores e objetivos que ela atende (o ÚNICO vocabulário de dor permitido): ${p.queixas?.length ? p.queixas.join('; ') : 'não informado'}.`,
  ]
  if (p.nao_atende?.trim()) {
    linhas.push(
      `- Ela NÃO atende: ${p.nao_atende.trim()}. É PROIBIDO citar isso como promessa, exemplo ou benefício.`
    )
  }
  // A trava do peso só existe quando a lista de queixas foi declarada. Sem
  // lista, não dá pra afirmar que peso está fora, e proibir por omissão
  // emudeceria a copy de quem nunca respondeu.
  if (p.queixas?.length && !p.trata_peso) {
    linhas.push(
      '- Peso e composição corporal NÃO estão na lista dela: NÃO fale de emagrecer, perder peso, dieta pra emagrecer nem "secar". Nem como exemplo.'
    )
  }
  if (p.como_chega?.length) {
    linhas.push(`- Como a paciente costuma chegar até ela: ${p.como_chega.join(', ')}.`)
  }
  return linhas.join('\n')
}

/** A marca da profissional, como ela declarou. */
export interface MarcaDaCopy {
  nome?: string | null
  cidade?: string | null
  /** Tom pedido por ela, já em rótulo legível. */
  tom?: string | null
  diferencial?: string | null
  palavras_usar?: string[]
  palavras_evitar?: string | null
  nunca_citar?: string | null
}

/**
 * O bloco de BRANDING: quem está falando e com que palavras. Separado do
 * público de propósito — um responde "com quem eu falo", o outro "quem fala".
 */
export function blocoBrandingDaCopy(m: MarcaDaCopy): string {
  const linhas = ['A MARCA (quem está falando):']
  linhas.push(`- Profissional: ${m.nome?.trim() || 'a profissional'}${m.cidade?.trim() ? ` (${m.cidade.trim()})` : ''}.`)
  if (m.tom?.trim()) linhas.push(`- Tom pedido por ela: ${m.tom.trim()}.`)
  if (m.diferencial?.trim()) linhas.push(`- O diferencial dela, nas palavras dela: "${m.diferencial.trim()}"`)
  if (m.palavras_usar?.length) {
    linhas.push(`- Palavras que ela quer ver, quando fizerem sentido: ${m.palavras_usar.join(', ')}.`)
  }
  if (m.palavras_evitar?.trim()) {
    linhas.push(`- Palavras e abordagens que ela NÃO quer: ${m.palavras_evitar.trim()}. É proibido usar.`)
  }
  if (m.nunca_citar?.trim()) linhas.push(`- NUNCA citar: ${m.nunca_citar.trim()}.`)
  return linhas.join('\n')
}

/**
 * Monta o system prompt de uma geração de copy: núcleo + branding + público +
 * a instrução específica daquela superfície.
 *
 * 🔴 A ordem importa: o núcleo primeiro (é a parte fixa, cacheável), o
 * contexto da profissional depois, e a tarefa por último — o modelo obedece
 * melhor a última instrução, e a tarefa é o que muda a cada chamada.
 */
export function comAgenteDeCopy(
  tarefa: string,
  ctx: { marca?: MarcaDaCopy; publico?: PublicoDaCopy; extras?: string[] } = {}
): string {
  const partes = [NUCLEO_AGENTE_COPY]
  if (ctx.marca) partes.push(blocoBrandingDaCopy(ctx.marca))
  if (ctx.publico) partes.push(blocoPublicoDaCopy(ctx.publico))
  for (const extra of ctx.extras ?? []) {
    if (extra?.trim()) partes.push(extra.trim())
  }
  partes.push(tarefa.trim())
  return partes.join('\n\n---\n\n')
}
