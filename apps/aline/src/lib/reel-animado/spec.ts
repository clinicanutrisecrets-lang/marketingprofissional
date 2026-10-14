/**
 * O SPEC do reel animado ("Detetive da Saúde"), no Studio.
 *
 * 🔴 CÓPIA do miolo de apps/franquias/src/lib/conteudo/reel-animado.ts (o
 * mesmo motor, packages/reel-engine, desenha os dois). O prompt e a
 * normalização são o contrato com o renderizador: um campo fora dele mata
 * um render de 10 minutos. Mudou lá, mude aqui, e o teste
 * tests/reel-animado-spec.test.ts fica vermelho se os dois divergirem.
 *
 * Sem server-only nem Supabase: só o contrato com o renderizador.
 */
import { semTravessoesFundo } from "@/lib/texto/sem-travessoes";
import { semAbreviacaoFundo } from "@/lib/texto/sem-abreviacao";

export const REGRA_SEM_TRAVESSAO = `
PONTUAÇÃO — REGRA ABSOLUTA:
- NUNCA use travessão ("—") nem meia-risca ("–") em NENHUM texto: legenda, slide, headline, roteiro, CTA, e-mail, LP.
- No lugar, use vírgula, ponto, dois-pontos ou parênteses curtos. Prefira duas frases curtas a uma frase longa partida por travessão.
- Hífen comum de palavra composta ("anti-inflamatório", "low-carb") e de faixa numérica ("70-150") continua permitido.
`.trim();

export const GLIFOS_VALIDOS = [
  "semente_abobora", "espinafre", "cacau", "ovo", "amendoa",
  "lentilha", "sardinha", "queijo", "brocolis",
];

export const SYSTEM_SPEC = `
Você escreve SPECs de reels animados 9:16 no formato "Detetive da Saúde" para profissionais de saúde integrativa (nutricionistas, médicos, biomédicos etc.). NUNCA cite a profissão no texto das cenas — linguagem neutra de investigação. Saída: APENAS JSON válido, sem markdown.

FORMATO EXATO (siga à risca — o renderizador é rígido):
{
 "tema": "Nome curto do tema (1-3 palavras, vira o título gigante)",
 "cor_tema": "ROSE",   // uma de: AMBER CORAL MUSTARD TIFFANY ROXO ROSE
 "assinatura": "<vem no input>",
 "cenas": [
  {"tipo":"hook","dur":4.4,"l1":"Linha de gancho 1.","l2":"Linha de gancho 2."},
  {"tipo":"sintoma","dur":5.4,"cor":"AMBER","eyebrow":"sintoma 01","titulo":"Nome do sintoma","texto":"Descrição vívida do sintoma em 1-2 frases.","alvo":"neck","alvo_off":[-30,18],"card_y":960,"figura":{"eye":"open","brow_tilt":0.4}},
  {"tipo":"gene","dur":6.2,"cor":"MUSTARD","cor2":"AMBER","gene":"COMT","rs":"rs4680","texto":"Metáfora lúdica explicando o gene em 2 frases."},
  {"tipo":"sinergia","dur":10.6,"cor":"TIFFANY","titulo":"Título da sinergia","itens":[{"glifo":"espinafre","nome":"Espinafre cozido","qtd":"1 xícara","freq":"todos os dias"},{"glifo":"cacau","nome":"Cacau 70%","qtd":"20 g","freq":"todos os dias"},{"glifo":"ovo","nome":"Ovos","qtd":"2 unidades","freq":"5x por semana"}]},
  {"tipo":"nota","dur":6.6,"cor":"TIFFANY","glifos":["espinafre","cacau","ovo"],"texto":"Por que a combinação funciona, em 2 frases."},
  {"tipo":"marcadores","dur":7.0,"cor":"ROXO","eyebrow":"exame de sangue","titulo":"O que investigar","itens":[{"alto":false,"nome":"Ferritina","ludico":"O estoque de ferro do corpo, a bateria da sua energia.","alavanca":"faixa ideal 70-150"},{"alto":false,"nome":"Vitamina D","ludico":"O hormônio do sol que regula imunidade e disposição.","alavanca":"faixa ideal 40-60"},{"alto":true,"nome":"TSH","ludico":"O termostato da tireoide: quando sobe, o metabolismo desacelera.","alavanca":"ideal abaixo de 2,5"}]},
  {"tipo":"virada","dur":5.0,"l1":"Primeira linha grande.","l2":"Segunda linha grande — o reenquadramento.","texto":"1-2 frases curtas que sustentam a virada."},
  {"tipo":"cta","dur":5.0,"l1":"Pergunta que convida a investigar.","acao1":"LINK NA BIO","l2":"Segunda pergunta, pra quem não vai agir agora.","acao2":"SALVE ESTE REEL"}
 ]
}

REGRAS DURAS:
- glifo/glifos: APENAS destes: ${GLIFOS_VALIDOS.join(", ")}. NUNCA invente outro.
- alvo: uma de: face, eyes, neck, chest, spine. São os pontos REAIS da figura no renderizador (spine = tronco/abdômen; use spine pra sintomas de barriga/quadril). NUNCA invente outro — "belly" já derrubou um render inteiro (18/08/2026).
- 🔴 TETO DE 60 SEGUNDOS (1 minuto): a soma dos "dur" de TODAS as cenas não pode passar de 60, e nenhuma cena sozinha passa de 20. Some os "dur" antes de responder. O renderizador corta as cenas EXCEDENTES DO FIM, então quem cai primeiro é o cta e o reel fica sem chamada.
- A duração pedida é a soma aproximada dos "dur". 30s = hook + 1 bloco sintoma→gene→sinergia→nota + virada + cta, com cenas curtas. 60s = hook + 1 bloco sintoma→gene→sinergia→nota + marcadores + virada + cta, OU hook + 2 blocos curtos + virada + cta. Cena marcadores só na versão 60s (exatamente 3 itens).
- Orçamento por cena: hook 3.5-5 · sintoma 4.5-6 · gene 5-6.5 · nota 5-7 · marcadores 7-12 · virada 4-5.5 · cta 4-7. A sinergia revela um item por vez, 3 s cada mais 1.5 s de fecho: com 3 itens ela precisa de 10.5, e encurtar corta a quantidade e a frequência antes de aparecerem.
- Cena marcadores: cada item tem EXATAMENTE as chaves alto, nome, ludico, alavanca — o renderizador exige as quatro (faltar "alto" derrubou o render de 24/08/2026). "alto": true quando o sinal de atenção é o marcador ALTO, false quando é ele BAIXO. "ludico": tradução do marcador em 1 frase simples de leiga. "alavanca": a faixa ideal ou a próxima ação, curtinha (ex.: "faixa ideal 70-150").
- Genes reais com rsID correto. Sem promessa de cura (CFN): linguagem de investigação, não de tratamento.
- 🔴 A CENA "hook" PRECISA FUNCIONAR SEM CONTEXTO: escreva l1/l2 pensando em quem NUNCA VIU este perfil. Sem depender de post anterior, de série, de bordão ou de saber quem está falando; sem "como eu sempre digo" / "quem me acompanha sabe"; com promessa ESPECÍFICA e OBSERVÁVEL, que a pessoa confere na própria vida. Específico: "Seu exame veio normal e você continua cansada." Sensacionalista (NÃO usar): "o segredo que ninguém te conta". Nada de promessa de resultado.
- LINHA EDITORIAL: o pano de fundo é despertar consciência sobre NUTRIGENÉTICA e microbiota — quem assina o perfil é "detetive da saúde" e investiga com testes. A cena "virada" deve reenquadrar nessa direção — l1 e l2 são as DUAS linhas grandes (ex.: l1 "Não é força de vontade." / l2 "É informação que você ainda não investigou.") e "texto" é o parágrafo de apoio. A cena "cta" é a última e convida pra investigação: l1 é a pergunta principal (ex.: "Quer investigar sua saúde com precisão?") e acao1 a etiqueta em CAIXA ALTA ao lado do ícone de AVIÃO/enviar (ex.: "LINK NA BIO"; nunca "me chama no direct", e nunca o nome da ferramenta do link); l2 é a segunda pergunta, pra quem ainda não vai agir agora (ex.: "Vai querer consultar isso depois?") e acao2 a etiqueta ao lado do ícone de MARCADOR/salvar (ex.: "SALVE ESTE REEL"). Cada etiqueta tem no máximo 18 caracteres e precisa combinar com o gesto do seu ícone. Varie as palavras a cada reel.
- 🔴 UMA IDEIA POR CENA, e o bloco inteiro fecha UM raciocínio só: o sintoma que a cena mostra é o mesmo que o gene explica, os alimentos da sinergia são os que destravam AQUELE gene, e a nota diz por que aquela combinação age nele. Nunca troque de assunto no meio do bloco, nunca cite um segundo gene ou um segundo sintoma na mesma cena.
- Tetos de texto (medidos no card real, 374 px úteis): "titulo" do sintoma até 4 palavras (cabem ~2.9 por linha, então 4 já são 2 linhas) · "texto" do sintoma até 16 palavras (~3.8 por linha, 4 linhas) · "texto" do gene até 24 palavras · "texto" da nota até 24 palavras · "ludico" dos marcadores até 14 palavras. Passar disso empurra o card pra fora da tela e ninguém termina de ler antes do corte.
- Cores das cenas: varie entre AMBER, MUSTARD, TIFFANY, ROXO, ROSE, CORAL.

${REGRA_SEM_TRAVESSAO}
`.trim();

/**
 * Rede de segurança do SPEC gerado: o render roda ~10 min no worker do
 * GitHub e um campo fora do contrato mata o job INTEIRO (KeyError 'belly'
 * em 18/08/2026, KeyError 'alto' em 24/08/2026 — a nutri só via "erro,
 * tente de novo"). O renderizador também ficou tolerante, mas corrigir
 * aqui é grátis; descobrir lá custa um render de 10 minutos.
 */
const ALVOS_VALIDOS = new Set(["face", "eyes", "neck", "chest", "spine"]);
const ALVO_ALIAS: Record<string, string> = {
  head: "face", cabeca: "face", belly: "spine", barriga: "spine",
  hips: "spine", quadril: "spine", stomach: "spine",
};
const TIPOS_CENA = new Set([
  "hook", "sintoma", "gene", "sinergia", "nota", "marcadores", "virada", "cta", "cta_anuncio",
]);

/**
 * Teto de duração do reel: 1 minuto (Aline, 05/10/2026; antes era 1min30,
 * pedido da Juliana em 01/09/2026).
 * Os mesmos números vivem em packages/reel-engine/engine/build.py
 * (DUR_MAX_TOTAL / DUR_MAX_CENA) — o motor é a trava que vale, esta aqui evita
 * que o SPEC saia grande do agente e o corte só apareça 10 minutos depois.
 */
export const DUR_MAX_TOTAL_S = 60;
const DUR_MAX_CENA_S = 20;

/**
 * Aplica o teto de 60 s: cena a cena, com as EXCEDENTES DO FIM descartadas
 * inteiras. Encolher todas na proporção estragaria o ritmo da narração e o
 * tempo de leitura dos cards — perder a última cena é um corte limpo.
 */
function limitarDuracoes(cenas: Record<string, unknown>[]): Record<string, unknown>[] {
  const dentro: Record<string, unknown>[] = [];
  let total = 0;
  for (const c of cenas) {
    const bruto = Number(c.dur);
    const dur = Math.min(
      Number.isFinite(bruto) && bruto > 0 ? bruto : 5,
      DUR_MAX_CENA_S,
    );
    if (total + dur > DUR_MAX_TOTAL_S + 1e-6) break;
    c.dur = dur;
    dentro.push(c);
    total += dur;
  }
  return dentro;
}

export function normalizarSpecReel(spec: Record<string, unknown>): Record<string, unknown> {
  // Travessão fora de TODO texto do vídeo (pedido da Aline, 26/08/2026)
  const s = semAbreviacaoFundo(semTravessoesFundo(spec));
  const cenas = Array.isArray(s.cenas) ? (s.cenas as Record<string, unknown>[]) : [];
  s.cenas = cenas
    .filter((c) => TIPOS_CENA.has(String(c.tipo)))
    .map((c) => {
      if (c.tipo === "sintoma") {
        const alvo = String(c.alvo ?? "chest");
        c.alvo = ALVOS_VALIDOS.has(alvo) ? alvo : (ALVO_ALIAS[alvo] ?? "chest");
      }
      if (c.tipo === "nota" && Array.isArray(c.glifos)) {
        // glifo inventado é só decoração: sai da lista em vez de derrubar o job
        c.glifos = (c.glifos as unknown[]).filter((g) => GLIFOS_VALIDOS.includes(String(g)));
      }
      if (c.tipo === "marcadores" && Array.isArray(c.itens)) {
        // Completa o contrato do renderizador {alto, nome, ludico, alavanca},
        // aceitando o formato {nome, faixa} que o prompt antigo ensinava.
        c.itens = (c.itens as Record<string, unknown>[]).map((it) => ({
          alto: typeof it.alto === "boolean" ? it.alto : true,
          nome: String(it.nome ?? ""),
          ludico: String(it.ludico ?? ""),
          alavanca: String(it.alavanca ?? it.faixa ?? ""),
        }));
      }
      return c;
    });
  s.cenas = limitarDuracoes(s.cenas as Record<string, unknown>[]);
  return s;
}

export type DuracaoReel = "30s" | "60s";

export const PEDIDO_LEGENDA = `
ALÉM DAS CENAS, devolva no MESMO JSON:
 "legenda": a legenda do post no Instagram, 4 a 8 parágrafos curtos, primeira pessoa da profissional, explicando o mesmo raciocínio do reel. Se o reel cita um gene, a legenda NOMEIA o gene pela sigla e diz o que ele faz. Sem promessa de cura, sem preço, sem link.
 "cta": uma frase curta de chamada pra salvar ou comentar.
 "hashtags": 5 hashtags em português, sem acento.
`.trim();

/** Legenda que o agente devolveu junto do SPEC, limpa de travessão. */
export function legendaDoSpec(bruto: Record<string, unknown>): { texto: string; cta: string; hashtags: string[] } | null {
  const limpo = semTravessoesFundo({ l: bruto.legenda, c: bruto.cta, h: bruto.hashtags }) as Record<string, unknown>;
  const textoL = typeof limpo.l === "string" ? limpo.l.trim() : "";
  if (!textoL) return null;
  const hashtags = Array.isArray(limpo.h)
    ? (limpo.h as unknown[]).filter((x): x is string => typeof x === "string").map((x) => (x.startsWith("#") ? x : `#${x}`)).slice(0, 8)
    : [];
  return { texto: textoL, cta: typeof limpo.c === "string" ? limpo.c.trim() : "", hashtags };
}
