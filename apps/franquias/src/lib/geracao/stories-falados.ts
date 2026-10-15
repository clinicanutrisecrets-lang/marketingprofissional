/**
 * A sequência de 3 stories FALADOS da semana (Aline, 15/10/2026): pra quem
 * respondeu no Scanner que grava vídeos. Cada story tem até 30 s de fala lida
 * no teleprompter: o 1º é o gancho, o 2º a história, o 3º a chamada.
 *
 * Função pura (prompt, ferramenta e conferência): roda no teste.
 */

/** ~2,5 palavras por segundo: 30 s cabem em até 75 palavras. */
export const MAX_PALAVRAS_STORY = 75;
export const MIN_PALAVRAS_STORY = 20;
export const MAX_TEXTO_TELA = 90;

export type StoryFalado = { fala: string; texto_na_tela: string };
export type SequenciaStories = { titulo: string; stories: [StoryFalado, StoryFalado, StoryFalado] };

export const PAPEIS_STORIES = [
  "Gancho: a cena ou a pergunta que faz parar de passar",
  "História: o caso ou a virada, contada como conversa",
  "Chamada: o próximo passo, um só",
] as const;

export const TAREFA_STORIES_FALADOS = `Você escreve roteiros de STORIES FALADOS para uma profissional de saúde gravar no celular, lendo no teleprompter, olhando pra câmera.

Entregue UMA sequência de 3 stories que se continuam (quem vê o 1º quer ver o 2º):
1. GANCHO: abre com uma cena reconhecível ou pergunta da queixa da semana. Nada de "oi, gente" nem apresentação.
2. HISTÓRIA: um caso típico ou a virada de entendimento, contado como conversa, ligando a queixa ao que a nutrição de precisão investiga (Fábrica da Saúde).
3. CHAMADA: um próximo passo só (responder a caixinha, mandar mensagem, conhecer a consulta).

Regras:
- Cada fala com 20 a 75 palavras (cabe em 30 segundos), frases curtas, do jeito que se fala.
- Escreva só o que será dito: sem marcação de cena, sem colchetes, sem rótulo ("Gancho:").
- texto_na_tela: uma frase curta (até 90 caracteres) pra escrever por cima do vídeo.
- Caso de paciente é TÍPICO, nunca uma pessoa real nem depoimento inventado. Sem número, estudo ou estatística.
- Não prometa cura nem resultado, não afirme que quem assiste tem a condição.`;

export const FERRAMENTA_STORIES = {
  name: "entregar_stories_falados",
  description: "Entrega a sequência de 3 stories falados.",
  input_schema: {
    type: "object" as const,
    properties: {
      titulo: { type: "string", description: "Nome curto da sequência (até 60 caracteres)." },
      stories: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            fala: { type: "string" },
            texto_na_tela: { type: "string" },
          },
          required: ["fala", "texto_na_tela"],
        },
      },
    },
    required: ["titulo", "stories"],
  },
};

const palavras = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** Confere a forma e o tamanho; recusa com o MOTIVO, pra a tentativa seguinte corrigir. */
export function conferirStoriesFalados(
  bruto: unknown,
): { ok: true; sequencia: SequenciaStories } | { ok: false; motivo: string } {
  if (!bruto || typeof bruto !== "object") return { ok: false, motivo: "sem resposta" };
  const o = bruto as Record<string, unknown>;
  if (!Array.isArray(o.stories) || o.stories.length !== 3) return { ok: false, motivo: "precisa de exatamente 3 stories" };
  const out: StoryFalado[] = [];
  for (let i = 0; i < 3; i++) {
    const s = o.stories[i] as Record<string, unknown> | null;
    const fala = typeof s?.fala === "string"
      ? s.fala.replace(/\[[^\]\n]{1,60}\]/g, " ").replace(/^\s*(gancho|hist[oó]ria|chamada|cta)\s*:\s*/i, "").replace(/\s+/g, " ").trim()
      : "";
    const tela = typeof s?.texto_na_tela === "string" ? s.texto_na_tela.replace(/\s+/g, " ").trim() : "";
    const n = palavras(fala);
    if (n < MIN_PALAVRAS_STORY || n > MAX_PALAVRAS_STORY) {
      return { ok: false, motivo: `story ${i + 1} com ${n} palavras (precisa de ${MIN_PALAVRAS_STORY} a ${MAX_PALAVRAS_STORY})` };
    }
    if (!tela || tela.length > MAX_TEXTO_TELA) return { ok: false, motivo: `texto na tela do story ${i + 1} vazio ou longo demais` };
    if (/—/.test(fala) || /—/.test(tela)) return { ok: false, motivo: "sem travessão" };
    out.push({ fala, texto_na_tela: tela });
  }
  const titulo = typeof o.titulo === "string" && o.titulo.trim() ? o.titulo.trim().slice(0, 60) : "Stories da semana";
  return { ok: true, sequencia: { titulo, stories: out as SequenciaStories["stories"] } };
}
