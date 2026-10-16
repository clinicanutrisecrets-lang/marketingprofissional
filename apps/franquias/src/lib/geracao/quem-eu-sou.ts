/**
 * O 3º POST FIXO do perfil: "Quem eu sou" (Aline, 16/10/2026).
 *
 * Os três posts para deixar fixados no perfil, um por semana, nesta ordem:
 *  1. a consulta de precisão (lib/geracao/post-fixo.ts), na 1ª semana;
 *  2. a Fábrica da Saúde (lib/geracao/fabrica.ts), na 2ª;
 *  3. este, com a história DELA, na 3ª.
 *
 * O texto sai das respostas do questionário do Consultório no Scanner (bloco
 * "Sua história"), que chegam ao Marketing em `historia_pessoal`,
 * `resultado_transformacao` e `diferenciais`. O modelo só ENCURTA e organiza
 * o que ela escreveu em slides: 🔴 nada de fato novo. A conferência abaixo
 * recusa número que não está nas respostas dela (anos, pacientes, quilos) e
 * qualquer erro do revisor de copy (promessa de cura, antes e depois...).
 *
 * Sem história respondida, não existe post: nunca um "quem eu sou" inventado.
 *
 * Funções puras: nada de rede nem banco. Rodam no teste.
 */
import type { SlideEditorial } from "@scanner/ai-image";
import { revisarCopy, temErro, type ContextoRevisao } from "../claude/revisor-copy.ts";

/** Marca do post no banco: é por ela que a conta não recebe outro. */
export const PAPEL_QUEM_EU_SOU = "Post fixo do perfil: quem eu sou";

export const LEMBRETE_QUEM_EU_SOU =
  "Este é o 3º post pra deixar FIXADO no perfil, ao lado da consulta e da Fábrica da Saúde. O texto saiu da sua história no questionário do Consultório: confira se está do seu jeito e edite à vontade antes de aprovar. Depois de postar, toque nos três pontinhos e em \"Fixar no perfil\".";

/** A história precisa ter corpo pra virar post (uma frase solta não conta). */
export const MIN_HISTORIA = 80;

export type MaterialQuemEuSou = {
  nome: string;
  primeiroNome: string;
  historia: string;
  transformacao: string | null;
  diferenciais: string | null;
  cidade: string | null;
  estado: string | null;
  modalidade: string | null;
  pacientes: number | null;
};

const limpo = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  return s ? s : null;
};

/** O que vira o post. null quando ela não respondeu a história. */
export function materialQuemEuSou(f: Record<string, unknown>): MaterialQuemEuSou | null {
  const historia = limpo(f.historia_pessoal);
  if (!historia || historia.length < MIN_HISTORIA) return null;
  const nome = limpo(f.nome_comercial) ?? limpo(f.nome_completo) ?? "";
  const pac = Number(f.numero_pacientes_atendidos);
  return {
    nome,
    primeiroNome: (limpo(f.nome_completo) ?? nome).split(" ")[0] ?? "",
    historia,
    transformacao: limpo(f.resultado_transformacao),
    diferenciais: limpo(f.diferenciais),
    cidade: limpo(f.cidade),
    estado: limpo(f.estado),
    modalidade: limpo(f.modalidade_atendimento),
    pacientes: Number.isFinite(pac) && pac > 0 ? pac : null,
  };
}

export const TAREFA_QUEM_EU_SOU = `Você monta o carrossel "Quem eu sou" que a profissional vai deixar FIXADO no perfil do Instagram. Quem chega no perfil pela primeira vez lê este post para decidir se confia nela.

Você recebe as respostas que ELA escreveu: por que escolheu a profissão, uma transformação de paciente que marcou e como ela trabalha. A sua tarefa é ENCURTAR e organizar essas respostas em slides, na primeira pessoa, com a voz dela.

REGRAS ABSOLUTAS:
- Use SÓ o que está nas respostas. Não acrescente formação, título, especialização, anos de experiência, número de pacientes, cidade, prêmio nem nada que ela não escreveu.
- Nenhum número que não esteja escrito nas respostas dela.
- A transformação de paciente: sem nome, sem idade, sem quilos, sem prazo, sem "antes e depois". Conte a mudança de vida (o que ela voltou a conseguir fazer), nunca um resultado prometido.
- Não prometa cura nem resultado para quem lê.
- Frases curtas, do jeito que se fala. Sem travessão.

O QUE ENTREGAR:
- capa_titulo: uma frase de abertura que faz parar de passar, tirada da história dela (até 70 caracteres).
- porque_titulo (até 60) e porque_texto (até 260): por que ela faz o que faz.
- historia_titulo (até 60) e historia_texto (até 280): a transformação que marcou. Se ela não escreveu nenhuma, entregue os dois vazios.
- como_titulo (até 60) e como_linhas: exatamente 3 linhas, cada uma com rotulo (até 18 caracteres, uma ou duas palavras) e texto (até 90), sobre como ela trabalha.
- fecho_titulo (até 60) e fecho_chamada (até 160): o convite, terminando em "agende pelo link da bio".
- legenda: a legenda do post (até 900 caracteres), na primeira pessoa, contando a mesma história de um jeito mais solto e terminando com o convite do link da bio.`;

export const FERRAMENTA_QUEM_EU_SOU = {
  name: "entregar_quem_eu_sou",
  description: "Entrega os textos do carrossel Quem eu sou.",
  input_schema: {
    type: "object" as const,
    properties: {
      capa_titulo: { type: "string" },
      porque_titulo: { type: "string" },
      porque_texto: { type: "string" },
      historia_titulo: { type: "string" },
      historia_texto: { type: "string" },
      como_titulo: { type: "string" },
      como_linhas: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: { rotulo: { type: "string" }, texto: { type: "string" } },
          required: ["rotulo", "texto"],
        },
      },
      fecho_titulo: { type: "string" },
      fecho_chamada: { type: "string" },
      legenda: { type: "string" },
    },
    required: [
      "capa_titulo",
      "porque_titulo",
      "porque_texto",
      "historia_titulo",
      "historia_texto",
      "como_titulo",
      "como_linhas",
      "fecho_titulo",
      "fecho_chamada",
      "legenda",
    ],
  },
};

export type TextosQuemEuSou = {
  capa_titulo: string;
  porque_titulo: string;
  porque_texto: string;
  historia_titulo: string;
  historia_texto: string;
  como_titulo: string;
  como_linhas: { rotulo: string; texto: string }[];
  fecho_titulo: string;
  fecho_chamada: string;
  legenda: string;
};

/** O pedido ao modelo: só as respostas dela, nada do perfil que ela não escreveu. */
export function pedidoQuemEuSou(m: MaterialQuemEuSou): string {
  return JSON.stringify({
    nome: m.nome,
    por_que_escolhi: m.historia,
    transformacao_que_marcou: m.transformacao,
    como_eu_trabalho: m.diferenciais,
  });
}

/** Todos os números que aparecem num texto, sem separador de milhar ("2.000" = 2000). */
export function numerosDoTexto(t: string): string[] {
  return (t.match(/\d[\d.,]*/g) ?? [])
    .map((n) => n.replace(/[.,](?=\d{3}\b)/g, "").replace(/[.,]+$/, ""))
    .filter(Boolean);
}

const LIMITES: Array<[keyof TextosQuemEuSou, number]> = [
  ["capa_titulo", 70],
  ["porque_titulo", 60],
  ["porque_texto", 260],
  ["historia_titulo", 60],
  ["historia_texto", 280],
  ["como_titulo", 60],
  ["fecho_titulo", 60],
  ["fecho_chamada", 160],
  ["legenda", 900],
];

/**
 * Confere a resposta do modelo. Recusa com o MOTIVO, pra a tentativa seguinte
 * corrigir: tamanho, número inventado e erro do revisor de copy.
 */
export function conferirQuemEuSou(
  bruto: unknown,
  m: MaterialQuemEuSou,
  ctx: ContextoRevisao = {},
): { ok: true; textos: TextosQuemEuSou } | { ok: false; motivo: string } {
  if (!bruto || typeof bruto !== "object") return { ok: false, motivo: "sem resposta" };
  const o = bruto as Record<string, unknown>;
  const str = (k: string) => (typeof o[k] === "string" ? (o[k] as string).replace(/[ \t]+/g, " ").trim() : "");
  const linhasBrutas = Array.isArray(o.como_linhas) ? (o.como_linhas as Array<Record<string, unknown>>) : [];
  const t: TextosQuemEuSou = {
    capa_titulo: str("capa_titulo"),
    porque_titulo: str("porque_titulo"),
    porque_texto: str("porque_texto"),
    historia_titulo: m.transformacao ? str("historia_titulo") : "",
    historia_texto: m.transformacao ? str("historia_texto") : "",
    como_titulo: str("como_titulo"),
    como_linhas: linhasBrutas.map((l) => ({
      rotulo: typeof l?.rotulo === "string" ? l.rotulo.trim() : "",
      texto: typeof l?.texto === "string" ? l.texto.replace(/\s+/g, " ").trim() : "",
    })),
    fecho_titulo: str("fecho_titulo"),
    fecho_chamada: str("fecho_chamada"),
    legenda: typeof o.legenda === "string" ? o.legenda.trim() : "",
  };

  for (const [k, max] of LIMITES) {
    const v = t[k] as string;
    const opcional = k === "historia_titulo" || k === "historia_texto";
    if (!v && !opcional) return { ok: false, motivo: `${k} vazio` };
    if (v.length > max) return { ok: false, motivo: `${k} com ${v.length} caracteres (máximo ${max})` };
  }
  if (m.transformacao && (!t.historia_titulo || !t.historia_texto)) {
    return { ok: false, motivo: "faltou o slide da transformação, que ela escreveu" };
  }
  if (t.como_linhas.length !== 3) return { ok: false, motivo: "como_linhas precisa de exatamente 3 linhas" };
  for (const l of t.como_linhas) {
    if (!l.rotulo || l.rotulo.length > 18) return { ok: false, motivo: `rótulo "${l.rotulo}" vazio ou maior que 18 caracteres` };
    if (!l.texto || l.texto.length > 90) return { ok: false, motivo: `linha "${l.texto.slice(0, 30)}" vazia ou maior que 90 caracteres` };
  }
  if (!/link da bio/i.test(t.fecho_chamada)) return { ok: false, motivo: 'fecho_chamada precisa terminar em "agende pelo link da bio"' };

  // 🔴 Número que ela não escreveu é dado inventado sobre a vida dela.
  const fonte = new Set(numerosDoTexto([m.historia, m.transformacao, m.diferenciais].filter(Boolean).join(" ")));
  const tudo = textoCorrido(t);
  for (const n of numerosDoTexto(tudo)) {
    if (!fonte.has(n)) return { ok: false, motivo: `o número ${n} não está nas respostas dela; tire` };
  }

  const achados = revisarCopy(tudo, ctx);
  if (temErro(achados)) {
    const erros = achados.filter((a) => a.gravidade === "erro").map((a) => `"${a.trecho}": ${a.motivo}`);
    return { ok: false, motivo: erros.join("; ") };
  }
  return { ok: true, textos: t };
}

function textoCorrido(t: TextosQuemEuSou): string {
  return [
    t.capa_titulo,
    t.porque_titulo,
    t.porque_texto,
    t.historia_titulo,
    t.historia_texto,
    t.como_titulo,
    ...t.como_linhas.flatMap((l) => [l.rotulo, l.texto]),
    t.fecho_titulo,
    t.fecho_chamada,
    t.legenda,
  ]
    .filter(Boolean)
    .join("\n");
}

const MODALIDADES: Record<string, string> = {
  online: "Atendimento online",
  presencial: "Atendimento presencial",
  hibrido: "Atendimento presencial e online",
};

/** O slide "onde eu atendo", só com o que está no cadastro dela. null sem nada. */
export function textoOndeAtendo(m: MaterialQuemEuSou): { titulo: string; corpo?: string } | null {
  const lugar = [m.cidade, m.estado].filter(Boolean).join(", ");
  const modo = m.modalidade ? MODALIDADES[m.modalidade] ?? null : null;
  const pac = m.pacientes ? `Mais de ${m.pacientes.toLocaleString("pt-BR")} pacientes atendidos.` : null;
  if (!lugar && !modo && !pac) return null;
  const titulo = modo && lugar ? `${modo} em ${lugar}` : modo ?? (lugar ? `Atendo em ${lugar}` : "Onde eu atendo");
  return pac ? { titulo, corpo: pac } : { titulo };
}

/** As fotos que o post usa, por assunto (vocabulário de lib/geracao/fotos-banco.ts). */
export const ASSUNTOS_QUEM_EU_SOU = {
  capa: ["profissional"],
  porque: ["bem_estar", "profissional"],
  onde: ["consultorio", "atendimento"],
} as const;

/** Os slides, na ordem. Fotos opcionais: sem elas o slide sai só com texto. */
export function slidesQuemEuSou(
  m: MaterialQuemEuSou,
  t: TextosQuemEuSou,
  fotos: { porque?: Buffer; onde?: Buffer } = {},
): SlideEditorial[] {
  const local = [m.cidade, m.estado].filter(Boolean).join(", ");
  const slides: SlideEditorial[] = [
    {
      tipo: "capa",
      kicker: m.primeiroNome ? `Prazer, ${m.primeiroNome}` : "Quem eu sou",
      titulo: t.capa_titulo,
      subtitulo: [m.nome, local].filter(Boolean).join(" · ") || undefined,
    },
    { tipo: "meio", rotulo: "Por que eu faço isso", titulo: t.porque_titulo, corpo: t.porque_texto, foto: fotos.porque },
  ];
  if (t.historia_titulo && t.historia_texto) {
    slides.push({ tipo: "meio", rotulo: "Uma história que me marcou", titulo: t.historia_titulo, corpo: t.historia_texto });
  }
  slides.push({ tipo: "meio", rotulo: "Como eu trabalho", titulo: t.como_titulo, linhas: t.como_linhas });
  const onde = textoOndeAtendo(m);
  if (onde) slides.push({ tipo: "meio", rotulo: "Onde eu atendo", titulo: onde.titulo, corpo: onde.corpo, foto: fotos.onde });
  slides.push({ tipo: "fecho", rotulo: "Vamos conversar", titulo: t.fecho_titulo, chamada: t.fecho_chamada });
  return slides;
}

export const HASHTAGS_QUEM_EU_SOU = ["#nutricaodeprecisao", "#saudeintegrativa", "#minhahistoria"];

/**
 * É a semana do "Quem eu sou"? Uma vez só, depois da consulta (1ª) e da
 * Fábrica (2ª), cada uma numa semana ANTERIOR. Se a Fábrica nunca saiu (o
 * worker dela falhou), basta a consulta ter saído há pelo menos duas semanas:
 * a história dela não fica refém de outro post.
 */
export function vezDoQuemEuSou(p: {
  jaTem: boolean;
  semanasConsulta: string[];
  semanasFabrica: string[];
  semanaRef: string;
}): boolean {
  if (p.jaTem) return false;
  const antes = (s: string) => s < p.semanaRef;
  const consulta = p.semanasConsulta.filter(antes).sort()[0];
  if (!consulta) return false;
  if (p.semanasFabrica.some(antes)) return true;
  const dias = (Date.parse(p.semanaRef) - Date.parse(consulta)) / 86_400_000;
  return dias >= 14;
}
