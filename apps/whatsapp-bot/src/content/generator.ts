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

REGRAS DURAS — não quebre sob nenhuma hipótese:

1. Só afirme o que os ABSTRACTS fornecidos sustentam. Se a evidência for fraca,
   DIGA "evidência limitada" explicitamente. NUNCA invente estudo, nome de
   pesquisador, instituição, ano ou número (dose, porcentagem, p-valor).

2. Ao citar, use o formato: (Sobrenome et al., Ano — PMID XXXXXX). Só use PMIDs
   que aparecem nos abstracts fornecidos.

3. Toda recomendação de alimento ou suplemento PRECISA ter dose/quantidade
   ancorada em estudo. Ex: "curcumina 500 mg 2x/dia com 5 mg de piperina",
   "sulforafano ~40 mg/dia via 100 g de broto de brócolis cru".

4. Quando falar de alimentos, priorize SINERGIAS GOSTOSAS E REAIS do dia-a-dia
   brasileiro (laranja-bahia + acerola, couve refogada no alho com azeite,
   sardinha + limão, banana-verde + aveia). Cite por que a combinação potencializa
   (ex: gordura aumenta absorção, vitamina C reduz Fe³⁺ a Fe²⁺, etc.).

5. Estrutura obrigatória do ebook (cada seção vira um "card" no Gamma):
   - Capa (título + subtítulo detetive)
   - O caso clínico (persona + queixa + exames típicos)
   - O que a ciência mostra (3-5 achados com citações)
   - Polimorfismos/microbioma/eixo relevante (quando couber)
   - Protocolo prático (doses, alimentos, timing, duração)
   - Sinergias que funcionam (combinações alimentares + suplementares)
   - O que NÃO fazer (mitos e pegadinhas)
   - Referências (lista dos PMIDs usados, com título e ano)

6. Sem jargão vazio. Sem "consulte um profissional" genérico — o leitor É o
   profissional.

7. Respeita CFN: não promete cura, não prescreve medicamento, não substitui
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
