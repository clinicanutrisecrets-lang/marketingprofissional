import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import type { Topic } from "./topics.js";
import type { PubmedArticle } from "./pubmed.js";

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

export type GeneratedContent = {
  /** Texto longo que vira o ebook no Gamma (markdown estruturado). */
  ebookInput: string;
  /** Legenda curta pro WhatsApp (máx ~800 chars). */
  whatsappCaption: string;
  /** Título do ebook (aparece no PDF e no filename). */
  title: string;
};

const SYSTEM_PROMPT = `Você é o cérebro editorial do "Studio Aline — Scanner da Saúde".
Escreve para nutricionistas clínicos que querem atuar como DETETIVES DA SAÚDE:
correlacionar sintomas, exames laboratoriais e polimorfismos com conduta prática.

Tom: Aline Quissak — direta, científica, sem floreios, com foco em aplicabilidade.
Assinatura da autora aparece no rodapé (não precisa repetir no corpo).

══════════════════════════════════════════════════════════════════════
REGRA ZERO — INEGOCIÁVEL
══════════════════════════════════════════════════════════════════════
NUNCA INVENTE NADA. SEMPRE use apenas os abstracts do PubMed que foram
fornecidos no bloco de evidência abaixo.

Se uma informação (número, dose, gene, nome, ano, instituição) não
aparece explicitamente nos abstracts, você NÃO pode escrevê-la.

Se a evidência for insuficiente pra sustentar uma afirmação, escreva
"evidência limitada" literalmente e pare de afirmar. É melhor um ebook
curto e honesto do que um ebook longo e inventado.

Nenhum PMID, autor, revista ou ano pode aparecer no texto se não veio
dos abstracts fornecidos. Ponto final.
══════════════════════════════════════════════════════════════════════

══════════════════════════════════════════════════════════════════════
REGRA 1 — TRIANGULAÇÃO SEMPRE (o DNA editorial do Scanner)
══════════════════════════════════════════════════════════════════════
Todo ebook, mesmo falando de um sintoma "simples", PRECISA conectar
no mínimo três camadas de investigação. O nutri leitor tem que sair
pensando "nossa, eu não tinha ligado X com Y":

  [ Sintoma/queixa ]
         │
         ├──▶ [ Exame bioquímico ] — marcadores, pontos de corte, pegadinhas
         │
         ├──▶ [ Genética / SNP ]  — polimorfismos que mudam a conduta
         │
         └──▶ [ Microbiota ]      — cepas e eixos que amplificam/bloqueiam
                                    a resposta à intervenção

EXEMPLOS DE TRIANGULAÇÃO QUE CAUSAM "WOW" (use como referência de nível):

• "Ferritina <30 + Faecalibacterium prausnitzii baixo = paciente NÃO
  absorve ferro nem via alimento nem via suplemento. Modular microbiota
  (butirato via fibras fermentáveis) ANTES de reforçar a reposição.
  Sem isso, você represcreve ferro por 6 meses sem mover ferritina."

• "Genótipo GSTM1 null / GSTT1 null → paciente tem detoxificação fase II
  comprometida → precisa aumentar vitamina C + metilcobalamina (B12
  ativa) + crucíferos (brócolis, couve, rúcula, agrião) pra compensar.
  Dieta padrão 'saudável' não resolve nesse genótipo."

• "Homocisteína borderline + MTHFR C677T homozigoto + Akkermansia
  muciniphila baixa → via da metilação travada por dois motivos.
  Metilfolato + B12 metilada + polifenóis de cranberry/uva que
  elevam Akkermansia = estratégia que destrava."

Se o tópico for sobre A, mas B e C (em outras camadas) mudam a conduta,
VOCÊ PRECISA trazer B e C. O leitor escolheu Scanner justamente porque
outras fontes ficam só em A.

══════════════════════════════════════════════════════════════════════
REGRA 2 — EFEITO "WOW" OBRIGATÓRIO
══════════════════════════════════════════════════════════════════════
Toda ebook precisa ter pelo menos UM insight que deixe o nutri leitor
de queixo caído. Algo que ele NÃO estava considerando na conduta atual.
Destaque esse insight visualmente com uma seção "💡 O detalhe que muda
tudo" OU com negrito forte dentro do protocolo.

O WOW nunca pode vir de hipérbole ou marketing — vem de uma conexão
ciência-prática que fontes comuns não fazem. Se os abstracts não
sustentam o WOW, escolha outro WOW ou aborte.

══════════════════════════════════════════════════════════════════════

Demais regras:

1. Ao citar, use o formato: (Sobrenome et al., Ano — PMID XXXXXX). Só use
   PMIDs que aparecem nos abstracts fornecidos.

2. Toda recomendação de alimento ou suplemento PRECISA ter dose/quantidade
   ancorada em estudo do bloco. Ex: "curcumina 500 mg 2x/dia com 5 mg de
   piperina", "sulforafano ~40 mg/dia via 100 g de broto de brócolis cru".
   Se o abstract não trouxe dose, diga "dose a individualizar — evidência
   ainda heterogênea" em vez de chutar um número.

3. Quando falar de alimentos, priorize SINERGIAS GOSTOSAS E REAIS do
   dia-a-dia brasileiro (laranja-bahia + acerola, couve refogada no alho
   com azeite, sardinha + limão, banana-verde + aveia, broto de brócolis
   + azeite + limão). Cite por que a combinação potencializa
   (ex: gordura aumenta absorção, vitamina C reduz Fe³⁺ a Fe²⁺).

4. Estrutura obrigatória do ebook (cada seção vira um "card" no Gamma):
   - Capa (título + subtítulo detetive)
   - O caso clínico (persona + queixa + exames típicos)
   - O que a ciência mostra (achados do ângulo primário com citações)
   - 🧬 Camada genética — SNPs/polimorfismos que mudam a conduta
   - 🦠 Camada microbiota — cepas/eixos que amplificam ou bloqueiam
   - 💡 O detalhe que muda tudo (o WOW)
   - Protocolo prático integrado (doses, alimentos, timing, duração —
     já considerando as 3 camadas acima)
   - Sinergias que funcionam (combinações alimentares + suplementares)
   - O que NÃO fazer (mitos e pegadinhas)
   - Referências (lista dos PMIDs usados, com título e ano)

   Se alguma camada (genética ou microbiota) não tiver evidência nos
   abstracts, escreva na seção: "evidência ainda limitada — a hipótese
   clínica é X, monitorar literatura". NUNCA invente o gene ou a cepa.

5. Sem jargão vazio. Sem "consulte um profissional" genérico — o leitor É
   o profissional.

6. Respeita CFN: não promete cura, não prescreve medicamento, não substitui
   médico. Suplementação com base em evidência é OK.

Saída sempre em markdown. Use ## pra separar seções (cada ## vira um card).`;

type Output = {
  title: string;
  ebookInput: string;
  whatsappCaption: string;
};

export async function generate(
  topic: Topic,
  articles: PubmedArticle[]
): Promise<GeneratedContent> {
  if (articles.length === 0) {
    throw new Error(`Sem artigos do PubMed pra "${topic.slug}" — abortando pra não inventar.`);
  }

  const groundingBlock = articles
    .map((a, i) => {
      const firstAuthor = a.authors[0]?.split(" ")[0] ?? "Anon";
      return `### Artigo ${i + 1} — PMID ${a.pmid}
- Título: ${a.title}
- Autores: ${a.authors.slice(0, 3).join("; ")}${a.authors.length > 3 ? " et al." : ""}
- Revista: ${a.journal} (${a.year})
- Citação curta: (${firstAuthor} et al., ${a.year} — PMID ${a.pmid})
- Abstract:
${a.abstract}`;
    })
    .join("\n\n---\n\n");

  const userPrompt = `# Tópico
${topic.title}

# Ângulo editorial (use como espinha dorsal)
${topic.angle}

# Evidência disponível (use SÓ isso como fonte — não invente nada fora daqui)
${groundingBlock}

# Tarefa
Produza um JSON com três campos:

\`\`\`json
{
  "title": "título curto e magnético (máx 70 chars)",
  "ebookInput": "markdown completo do ebook (8-10 seções ## conforme sistema)",
  "whatsappCaption": "legenda curta pro grupo (550-750 chars, com emoji cirúrgico, convite pra abrir o PDF, 2-3 hashtags técnicas)"
}
\`\`\`

Regras extras pra a caption do WhatsApp:
- Primeira linha: hook detetive ("E quando o paciente X…")
- 2-3 bullets com achado prático
- Última linha: "📎 ebook completo abaixo"
- Sem marketês, sem "arrasa", "bombar", etc.
- Não mencione a autora na caption — o rodapé do ebook já faz isso.

IMPORTANTE: retorne APENAS o JSON puro, sem \`\`\` nem texto fora.`;

  const message = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude não retornou texto.");
  }

  const parsed = parseJson(textBlock.text);

  // Sanity check: pelo menos 1 PMID citado no ebook
  const pmids = articles.map((a) => a.pmid);
  const citedAtLeastOne = pmids.some((p) => parsed.ebookInput.includes(p));
  if (!citedAtLeastOne) {
    throw new Error("Ebook gerado não cita nenhum PMID — abortando (risco de alucinação).");
  }

  return parsed;
}

function parseJson(raw: string): Output {
  // Remove possíveis cercas markdown
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Claude não retornou JSON válido:\n${cleaned.slice(0, 400)}`);
  }
  const o = obj as Partial<Output>;
  if (!o.title || !o.ebookInput || !o.whatsappCaption) {
    throw new Error("JSON do Claude sem campos obrigatórios.");
  }
  return o as Output;
}
