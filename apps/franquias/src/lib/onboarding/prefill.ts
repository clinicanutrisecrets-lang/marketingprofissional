import type { createAdminClient } from "@/lib/supabase/server";
import { calcularPercentual } from "./steps";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Pré-preenchimento do onboarding com o perfil vindo do Scanner SaaS.
 *
 * O Scanner manda, no POST /api/onboarding/iniciar, um objeto `perfil`
 * com o VOCABULÁRIO DO HUB (nicho em label livre, cor_marca, bio_curta…),
 * guardado em franquia_onboardings.origem_payload. Este arquivo é a ÚNICA
 * fonte do de-para Hub → schema de franqueadas.
 *
 * Regras:
 *   - Só preenche campo VAZIO na franqueada — nunca sobrescreve o que a
 *     nutri já digitou aqui.
 *   - Valor inválido (cor fora de hex, etc.) é descartado em silêncio —
 *     pré-preenchimento é conveniência, nunca pode travar o wizard.
 */

export type PerfilScanner = Record<string, unknown>;

/** Nicho do Hub (label do NICHO_OPTIONS de /nutri/perfil) → enum daqui. */
const NICHO_DE_PARA: Record<string, string> = {
  "Saúde Hormonal Feminina": "saude_feminina",
  "Emagrecimento com Nutrigenômica": "emagrecimento",
  "Autoimunidade e Inflamação": "autoimune_intestino",
  "Gut Health e Microbiota": "autoimune_intestino",
  "Saúde da Mulher 40+": "saude_feminina",
  "Performance Esportiva": "nutricao_esportiva",
  "Fertilidade e Gestação": "materno_infantil",
  "Saúde Mental e Nutrição": "outro",
  "Longevidade e Anti-aging": "longevidade",
  "Saúde Integrativa de Precisão": "nutricao_funcional",
  "Nutrição Infantil": "materno_infantil",
};

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function hex(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  const m = s.match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toUpperCase()}` : undefined;
}

/** "@maria.nutri", "instagram.com/maria.nutri/" → "maria.nutri" */
export function normalizarInstagramHandle(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  const semUrl = s
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "")
    .trim();
  return semUrl.length > 0 ? semUrl : undefined;
}

/**
 * Traduz o `perfil` do Hub pra colunas de `franqueadas`.
 * Retorna só chaves com valor válido.
 */
export function mapearPerfilScanner(perfil: PerfilScanner): Record<string, unknown> {
  const campos: Record<string, unknown> = {};

  const nome = str(perfil.nome);
  const sobrenome = str(perfil.sobrenome);
  const nomeCompleto = [nome, sobrenome].filter(Boolean).join(" ");
  if (nomeCompleto) {
    campos.nome_completo = nomeCompleto;
    // nome_comercial é obrigatório no wizard — sugerimos o nome civil,
    // a nutri troca se usar outro nome comercial
    campos.nome_comercial = nomeCompleto;
  }

  const whatsapp = str(perfil.whatsapp);
  if (whatsapp) campos.whatsapp = whatsapp;

  const nicho = str(perfil.nicho);
  if (nicho) {
    const mapeado = NICHO_DE_PARA[nicho];
    campos.nicho_principal = mapeado ?? "outro";
    // quando o de-para perde informação, preserva o texto original
    if (!mapeado || mapeado === "outro") campos.nicho_secundario = nicho;
  }

  const publicoAlvo = str(perfil.publico_alvo);
  if (publicoAlvo) campos.publico_alvo_descricao = publicoAlvo;

  const especialidade = str(perfil.especialidade);
  if (especialidade) campos.especializacoes = [especialidade];

  const tagline = str(perfil.slogan);
  if (tagline) campos.tagline = tagline;

  const bioCurta = str(perfil.bio_curta);
  if (bioCurta) campos.bio_instagram = bioCurta;

  const bioLonga = str(perfil.bio_longa);
  if (bioLonga) campos.descricao_longa = bioLonga;

  const corPrimaria = hex(perfil.cor_marca);
  if (corPrimaria) campos.cor_primaria_hex = corPrimaria;

  const corSecundaria = hex(perfil.cor_secundaria);
  if (corSecundaria) campos.cor_secundaria_hex = corSecundaria;

  const instagram = normalizarInstagramHandle(perfil.instagram);
  if (instagram) campos.instagram_handle = instagram;

  const site = str(perfil.site);
  if (site) campos.site_proprio = site;

  const linkAgendamento = str(perfil.link_agendamento);
  if (linkAgendamento) campos.link_agendamento = linkAgendamento;

  return campos;
}

function vazio(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Aplica o pré-preenchimento na franqueada — só campos ainda vazios.
 * Chamado quando a nutri chega no /onboarding via token do Scanner.
 * Falha aqui NUNCA pode travar o wizard: o chamador embrulha em try/catch
 * e este código não lança por dado ruim (só por erro de infra).
 */
export async function aplicarPrefillScanner(
  admin: AdminClient,
  franqueadaId: string,
  perfil: PerfilScanner,
): Promise<{ aplicados: string[] }> {
  const candidatos = mapearPerfilScanner(perfil);
  if (Object.keys(candidatos).length === 0) return { aplicados: [] };

  const { data: atual, error: erroBusca } = await admin
    .from("franqueadas")
    .select("*")
    .eq("id", franqueadaId)
    .maybeSingle();

  if (erroBusca || !atual) {
    console.error("[prefill-scanner] busca falhou:", erroBusca?.message);
    return { aplicados: [] };
  }

  const linha = atual as Record<string, unknown>;
  const aplicar: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(candidatos)) {
    if (vazio(linha[campo])) aplicar[campo] = valor;
  }

  if (Object.keys(aplicar).length === 0) return { aplicados: [] };

  const percentual = calcularPercentual({ ...linha, ...aplicar });

  const { error: erroUpdate } = await admin
    .from("franqueadas")
    .update({
      ...aplicar,
      onboarding_percentual: percentual,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", franqueadaId);

  if (erroUpdate) {
    console.error("[prefill-scanner] update falhou:", erroUpdate.message);
    return { aplicados: [] };
  }

  return { aplicados: Object.keys(aplicar) };
}
