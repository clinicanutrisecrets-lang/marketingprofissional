/**
 * As respostas de marketing que a profissional dá NO SCANNER (Aline,
 * 15/10/2026) e que o pacote de domingo usa:
 *
 *  • `grava_videos` — sim = a semana ganha a sequência de 3 stories falados
 *    de 30 s e garante um reel de câmera, os dois com roteiro pro teleprompter;
 *  • `datas` — pra cada data comemorativa: ação especial (com a condição que
 *    ELA escreveu), só posts com a data, ou nada.
 *
 * Chega pela mesma rota do público (`/api/integrations/marketing/publico` do
 * Scanner) e é espelhado em `franqueadas.preferencias_scanner` pelo mesmo
 * sync. Função pura: roda no teste.
 */

export type EscolhaDataScanner = "promocao" | "so_posts" | "nenhuma";

export type DataComemorativaEscolhida = {
  chave: string;
  nome: string;
  /** YYYY-MM-DD */
  data: string;
  escolha: EscolhaDataScanner;
  condicao: string | null;
  produto: string | null;
};

export type PreferenciasScanner = {
  grava_videos: boolean | null;
  datas: DataComemorativaEscolhida[];
};

const limpo = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  // JSON de outro serviço entra em prompt: sem quebra de linha nem controle.
  const t = v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
};

/** Aceita só o que tem forma; o resto vira "não respondeu". */
export function validarPreferenciasScanner(bruto: unknown): PreferenciasScanner | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const datas: DataComemorativaEscolhida[] = [];
  if (Array.isArray(o.datas)) {
    for (const d of o.datas.slice(0, 40)) {
      if (!d || typeof d !== "object") continue;
      const r = d as Record<string, unknown>;
      const escolha = r.escolha;
      if (escolha !== "promocao" && escolha !== "so_posts" && escolha !== "nenhuma") continue;
      const data = typeof r.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.data) ? r.data : null;
      const chave = limpo(r.chave, 60);
      const nome = limpo(r.nome, 60);
      if (!data || !chave || !nome) continue;
      datas.push({
        chave,
        nome,
        data,
        escolha,
        condicao: escolha === "promocao" ? limpo(r.condicao, 200) : null,
        produto: escolha === "promocao" ? limpo(r.produto, 80) : null,
      });
    }
  }
  return {
    grava_videos: typeof o.grava_videos === "boolean" ? o.grava_videos : null,
    datas,
  };
}

const DIA_MS = 86_400_000;

/**
 * A data que entra no pacote desta semana: a mais próxima com escolha
 * (promoção ou só posts) entre o início da semana e 13 dias depois. Assim a
 * data aparece nas duas semanas que a antecedem. Promoção sem condição não
 * entra (o post nunca inventa a condição).
 */
export function dataDaSemana(
  prefs: PreferenciasScanner | null,
  semanaRef: string,
): DataComemorativaEscolhida | null {
  if (!prefs) return null;
  const ini = Date.parse(`${semanaRef}T00:00:00Z`);
  if (!Number.isFinite(ini)) return null;
  const candidatas = prefs.datas
    .filter((d) => d.escolha === "so_posts" || (d.escolha === "promocao" && !!d.condicao))
    .map((d) => ({ d, delta: Math.round((Date.parse(`${d.data}T00:00:00Z`) - ini) / DIA_MS) }))
    .filter((x) => x.delta >= 0 && x.delta <= 13)
    .sort((a, b) => a.delta - b.delta);
  return candidatas[0]?.d ?? null;
}

type SlotMinimo = {
  tipo: string;
  angulo: string;
  consciencia: string;
  papel: string;
  instrucao: string;
};

const COMERCIAIS = new Set(["divulgacao_produto", "chamada_direta"]);
const ehTemaEmAlta = (s: SlotMinimo) => s.papel.startsWith("Tema em alta:");

/**
 * O post que recebe a data. Promoção: o post comercial da semana (é ele que
 * fala de oferta); sem ele, o carrossel. Só posts: o carrossel de conteúdo,
 * que explica a consulta voltado pro tema da data. Nunca stories e nunca o post
 * que já carrega o tema em alta.
 */
export function indiceDoSlotData(slots: SlotMinimo[], escolha: EscolhaDataScanner): number {
  const livre = (s: SlotMinimo) => s.tipo !== "stories" && !ehTemaEmAlta(s);
  if (escolha === "promocao") {
    const c = slots.findIndex((s) => livre(s) && COMERCIAIS.has(s.angulo));
    if (c >= 0) return c;
  }
  const car = slots.findIndex((s) => livre(s) && s.tipo === "feed_carrossel" && !COMERCIAIS.has(s.angulo));
  if (car >= 0) return car;
  return slots.findIndex(livre);
}

function dataBR(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function aplicarDataComemorativa<S extends SlotMinimo>(
  slots: S[],
  data: DataComemorativaEscolhida | null,
): { slots: S[]; usada: DataComemorativaEscolhida | null } {
  if (!data) return { slots, usada: null };
  const i = indiceDoSlotData(slots, data.escolha);
  if (i < 0) return { slots, usada: null };
  const s = slots[i]!;
  const produto = data.produto || "Consulta Nutrigenética";
  const bloco =
    data.escolha === "promocao"
      ? [
          `DATA COMEMORATIVA DESTA SEMANA (ASSUNTO OBRIGATÓRIO deste post, não é sugestão): ${data.nome}, dia ${dataBR(data.data)}.`,
          `A profissional escolheu fazer uma AÇÃO ESPECIAL com ${produto}. A condição é exatamente esta: "${data.condicao}".`,
          "Escreva a condição como ela está, sem acrescentar desconto, prazo, brinde ou número que não estejam nela.",
          `O post liga a data ao cuidado com a saúde (presentear quem você ama com saúde) e convida a conhecer ${produto}.`,
        ].join("\n")
      : [
          `DATA COMEMORATIVA DESTA SEMANA (ASSUNTO OBRIGATÓRIO deste post, não é sugestão): ${data.nome}, dia ${dataBR(data.data)}.`,
          "A profissional escolheu SÓ POSTS COM A DATA, sem condição especial: não fale de desconto, promoção, oferta nem prazo.",
          "O post liga a data ao cuidado com a saúde (ex.: quem você ama merece toda a saúde do mundo pra continuar colecionando sorrisos) e termina convidando a conhecer a Consulta Nutrigenética.",
        ].join("\n");
  const novo: S = {
    ...s,
    papel: `Data comemorativa: ${data.nome}. ${s.papel}`,
    instrucao: `${bloco}\n\n${s.instrucao}`,
  };
  const copia = slots.slice();
  copia[i] = novo;
  return { slots: copia, usada: data };
}

/** Grava vídeos = garante ao menos um reel de câmera na semana. */
export function frequenciaReelsComVideo(freq: string | null | undefined, grava: boolean | null): string {
  const f = freq ?? "semanal";
  if (grava === true && (f === "nunca" || f === "")) return "semanal";
  return f;
}
