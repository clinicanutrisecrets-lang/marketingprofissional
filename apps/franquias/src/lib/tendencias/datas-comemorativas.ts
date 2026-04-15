import { createAdminClient } from "@/lib/supabase/server";

export type DataComemorativa = {
  id: string;
  data_mes: number;
  data_dia: number;
  nome: string;
  categoria: string;
  descricao: string | null;
  ideias_angulo: string | null;
  hashtags_sugeridas: string[] | null;
  prioridade: number;
};

/**
 * Busca datas comemorativas em uma janela de dias a partir de uma data base.
 * Default: próximos 14 dias (pra ter tempo de planejar post com antecedência).
 */
export async function buscarDatasProximas(
  diasJanela = 14,
  dataBase?: Date,
): Promise<DataComemorativa[]> {
  const admin = createAdminClient();
  const base = dataBase ?? new Date();

  const datas: Array<{ mes: number; dia: number; distancia: number }> = [];
  for (let i = 0; i <= diasJanela; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    datas.push({ mes: d.getMonth() + 1, dia: d.getDate(), distancia: i });
  }

  // Query OR por cada combinação mes/dia
  const orFilter = datas
    .map((d) => `and(data_mes.eq.${d.mes},data_dia.eq.${d.dia})`)
    .join(",");

  const { data } = await admin
    .from("datas_comemorativas")
    .select("*")
    .eq("ativo", true)
    .or(orFilter)
    .order("prioridade", { ascending: false });

  return (data ?? []) as DataComemorativa[];
}

/**
 * Filtra datas relevantes pra uma franqueada específica
 * baseado no nicho_principal dela.
 */
export function filtrarPorNicho(
  datas: DataComemorativa[],
  nicho: string,
): DataComemorativa[] {
  // Map nicho franqueada → categorias relevantes
  const relevancia: Record<string, string[]> = {
    saude_mulher: ["mulher", "saude_geral", "estilo_vida", "saude_mental", "motivacional"],
    hormonios: ["mulher", "homem", "estilo_vida", "doenca_cronica"],
    emagrecimento: ["metabolismo", "estilo_vida", "doenca_cronica", "motivacional"],
    fertilidade: ["mulher", "hormonios", "saude_geral"],
    longevidade: ["doenca_cronica", "estilo_vida", "saude_geral"],
    autoimune: ["doenca_cronica", "alergias", "saude_geral"],
    saude_integrativa: [
      "saude_geral",
      "mulher",
      "homem",
      "doenca_cronica",
      "estilo_vida",
      "saude_mental",
      "metabolismo",
      "hidratacao",
      "prevencao",
    ],
  };

  const categoriasRelevantes = relevancia[nicho] ?? relevancia.saude_integrativa;

  return datas.filter(
    (d) =>
      categoriasRelevantes.includes(d.categoria) ||
      d.categoria === "motivacional" ||
      d.prioridade >= 4,
  );
}
