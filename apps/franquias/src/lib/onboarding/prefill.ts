import type { createAdminClient } from "@/lib/supabase/server";
import { calcularPercentual, ESTADOS_BR, ESTILOS_VISUAIS, ONBOARDING_STEPS } from "./steps.ts";

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

  // O questionário do Consultório (chaves q_) vence o palpite acima: é a
  // resposta dela, não uma tradução do perfil.
  return { ...campos, ...mapearQuestionarioScanner(perfil) };
}

/**
 * O questionário ÚNICO do Consultório de Precisão, lá no Scanner (Aline,
 * 30/09/2026: "o cadastro próprio do marketing são perguntas que já eram pra
 * estar no onboarding, pra pessoa responder uma vez só"). Chega no `perfil`
 * com prefixo `q_`, no vocabulário do Hub; o de-para mora aqui.
 */
const TOM_DE_PARA: Record<string, string> = {
  acolhedor: "empatico_acolhedor",
  cientifico: "cientifico_acessivel",
  direto: "direto_motivacional",
};
const MODALIDADE_DE_PARA: Record<string, string> = { online: "online", presencial: "presencial", ambos: "hibrido" };
/** Queixa do Scanner (QUEIXAS de lib/onboarding-precisao/tipos.ts lá) → nicho daqui. */
const QUEIXA_NICHO: Record<string, string> = {
  peso: "emagrecimento",
  hormonal_feminino: "saude_feminina",
  intestinal: "autoimune_intestino",
  inflamacao: "autoimune_intestino",
  fertilidade: "fertilidade_gestacao",
  gestacao: "fertilidade_gestacao",
  pediatrico: "materno_infantil",
  performance: "nutricao_esportiva",
  longevidade: "longevidade",
  energia: "nutricao_funcional",
  cardiometabolico: "nutricao_funcional",
  tireoide: "nutricao_funcional",
  pele_cabelo: "nutricao_funcional",
  neuroendocrino: "nutricao_funcional",
};
const ESTILOS = new Set(ESTILOS_VISUAIS.map((e) => e.value));

export function mapearQuestionarioScanner(perfil: PerfilScanner): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  const tom = TOM_DE_PARA[str(perfil.q_tom) ?? ""];
  if (tom) c.tom_comunicacao = tom;
  const estilo = str(perfil.q_estilo_visual);
  if (estilo && ESTILOS.has(estilo)) c.estilo_visual = estilo;
  const mod = MODALIDADE_DE_PARA[str(perfil.q_modalidade) ?? ""];
  if (mod) c.modalidade_atendimento = mod;
  const historia = str(perfil.q_historia);
  if (historia) c.historia_pessoal = historia;
  const transformacao = str(perfil.q_transformacao);
  if (transformacao) c.resultado_transformacao = transformacao;
  const diferencial = str(perfil.q_diferencial);
  if (diferencial) c.diferenciais = diferencial;
  // "2.000+" → 2000. Texto sem número não vira número.
  const atend = (str(perfil.q_atendimentos) ?? "").replace(/\D/g, "");
  if (atend && Number(atend) > 0 && Number(atend) < 1_000_000) c.numero_pacientes_atendidos = Number(atend);
  const cidade = str(perfil.q_cidade);
  if (cidade) c.cidade = cidade;
  const uf = (str(perfil.q_uf) ?? "").toUpperCase();
  if (ESTADOS_BR.includes(uf)) c.estado = uf;
  const link = str(perfil.q_link_agendamento);
  if (link && /^https:\/\//i.test(link)) c.link_agendamento = link;
  const comercial = str(perfil.q_nome_comercial);
  if (comercial) c.nome_comercial = comercial;
  if (perfil.q_tem_depoimentos === "true") c.tem_depoimentos = true;
  if (perfil.q_tem_depoimentos === "false") c.tem_depoimentos = false;
  // Nicho: a primeira queixa que ela marcou decide; a próxima diferente vira
  // o secundário. Sem queixa, fica o que o perfil já mandava.
  const nichos = (str(perfil.q_queixas) ?? "")
    .split(",")
    .map((q) => QUEIXA_NICHO[q.trim()])
    .filter((n): n is string => !!n);
  const unicos = [...new Set(nichos)];
  if (unicos[0]) c.nicho_principal = unicos[0];
  if (unicos[1]) c.nicho_secundario = unicos[1];
  // Aprovação em bloco semanal é o que a tela de Aprovar semana faz hoje; só
  // entra quando ela concluiu lá (senão o passo 9 do assistente decide).
  if (perfil.q_concluido === "true") c.aprovacao_modo = "semanal_bloco";
  return c;
}

/** O questionário foi concluído lá? É o que autoriza fechar o cadastro daqui. */
export function questionarioConcluido(perfil: PerfilScanner | null | undefined): boolean {
  return !!perfil && perfil.q_concluido === "true";
}

/**
 * Obrigatórios do assistente que ainda faltam. `instagram_handle` fica de fora
 * DE PROPÓSITO: é opcional no questionário lá, e cadastro sem Instagram
 * funciona (os posts saem sem o @ na assinatura). Travar o fechamento por ele
 * mandaria a profissional responder 10 passos por causa de um campo.
 */
export function obrigatoriosFaltando(linha: Record<string, unknown>): string[] {
  const falta: string[] = [];
  for (const step of ONBOARDING_STEPS) {
    for (const campo of step.camposObrigatorios) {
      if (campo === "instagram_handle") continue;
      if (vazio(linha[campo])) falta.push(campo);
    }
  }
  return falta;
}

/** Logo e foto que vieram do questionário, já como linhas de arquivos. */
export function arquivosDoQuestionario(perfil: PerfilScanner): Array<{ tipo: "logo_principal" | "foto_profissional"; url: string }> {
  const out: Array<{ tipo: "logo_principal" | "foto_profissional"; url: string }> = [];
  const logo = str(perfil.q_logo_url);
  const foto = str(perfil.q_foto_url);
  if (logo && /^https:\/\//i.test(logo)) out.push({ tipo: "logo_principal", url: logo });
  if (foto && /^https:\/\//i.test(foto)) out.push({ tipo: "foto_profissional", url: foto });
  return out;
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
): Promise<{ aplicados: string[]; podeFechar: boolean; faltando: string[] }> {
  const nada = { aplicados: [] as string[], podeFechar: false, faltando: [] as string[] };
  const candidatos = mapearPerfilScanner(perfil);

  const { data: atual, error: erroBusca } = await admin
    .from("franqueadas")
    .select("*")
    .eq("id", franqueadaId)
    .maybeSingle();

  if (erroBusca || !atual) {
    console.error("[prefill-scanner] busca falhou:", erroBusca?.message);
    return nada;
  }

  const linha = atual as Record<string, unknown>;
  const aplicar: Record<string, unknown> = {};
  for (const [campo, valor] of Object.entries(candidatos)) {
    if (vazio(linha[campo])) aplicar[campo] = valor;
  }

  if (Object.keys(aplicar).length > 0) {
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
      return nada;
    }
  }

  // Logo e foto do questionário entram como arquivos da franqueada (é de lá
  // que a arte e a LP daqui leem). Só se ela ainda não tem daquele tipo.
  const arquivos = arquivosDoQuestionario(perfil);
  if (arquivos.length > 0) {
    const { data: existentes } = await admin
      .from("arquivos_franqueada")
      .select("tipo")
      .eq("franqueada_id", franqueadaId)
      .in("tipo", arquivos.map((a) => a.tipo));
    const ja = new Set(((existentes ?? []) as Array<{ tipo: string }>).map((e) => e.tipo));
    const novos = arquivos.filter((a) => !ja.has(a.tipo));
    if (novos.length > 0) {
      const { error } = await admin.from("arquivos_franqueada").insert(
        novos.map((a) => ({
          franqueada_id: franqueadaId,
          tipo: a.tipo,
          nome_arquivo: a.tipo === "logo_principal" ? "logo (questionário do Scanner)" : "foto (questionário do Scanner)",
          url_storage: a.url,
          formato: (a.url.split("?")[0].split(".").pop() || "jpg").toLowerCase().slice(0, 5),
        })),
      );
      if (error) console.error("[prefill-scanner] arquivos falharam:", error.message);
    }
  }

  const faltando = obrigatoriosFaltando({ ...linha, ...aplicar });
  return {
    aplicados: Object.keys(aplicar),
    podeFechar: questionarioConcluido(perfil) && faltando.length === 0 && linha.onboarding_completo !== true,
    faltando,
  };
}
