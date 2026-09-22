import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { destinoDoRender, formatoPedido, tipoDoRender } from "./destino.ts";
import { ctaDoSlide, semLink, temLink, textoDeArte } from "./texto-arte.ts";
import { FONTES, FONTE_PADRAO, normalizarFonte } from "./fontes.ts";
// Importa direto do motor de arte: `estiloFonte.ts` só tem um `import type`,
// que o strip-types apaga — nada de sharp/opentype entra no teste.
import {
  ESTILOS_FONTE,
  resolverFamiliaTitulo,
} from "../../../../../packages/ai-image/src/estiloFonte.ts";

const RAIZ = join(import.meta.dirname, "../../../../..");
const ler = (p: string) => readFileSync(join(RAIZ, p), "utf8");

/**
 * O arquivo REAL que foi gravado no campo da imagem do carrossel da Juliana
 * (posts_agendados 701a7364, semana de 08/09/2026).
 */
const MP4_DA_JULIANA =
  "https://f002.backblazeb2.com/file/creatomate-c8xg3hsxdu/12e421df-6a19-42a2-9e5b-858275ed2bfc.mp4";

// ─────────────────────── onde o render vai parar ───────────────────────

test("MP4 é vídeo mesmo sem o Creatomate declarar o formato", () => {
  assert.equal(tipoDoRender({ url: MP4_DA_JULIANA }), "video");
});

test("o output_format do Creatomate manda na extensão da URL", () => {
  // URL sem extensão nenhuma — é o campo declarado que resolve.
  assert.equal(tipoDoRender({ url: "https://x/y", output_format: "mp4" }), "video");
  assert.equal(tipoDoRender({ url: "https://x/y", output_format: "png" }), "imagem");
});

test("duração positiva é o último recurso; zero não vira vídeo", () => {
  assert.equal(tipoDoRender({ url: "https://x/y", duration: 12 }), "video");
  assert.equal(tipoDoRender({ url: "https://x/y", duration: 0 }), null);
});

test("formato indecifrável devolve null em vez de chutar", () => {
  assert.equal(tipoDoRender({ url: "https://x/y" }), null);
});

test("REGRESSÃO: o vídeo da Juliana nunca mais entra no campo da imagem", () => {
  const d = destinoDoRender("feed_carrossel", { url: MP4_DA_JULIANA });
  assert.equal(d.campo, null, "carrossel não pode receber vídeo");
  assert.match((d as { motivo: string }).motivo, /template/);
});

test("feed_imagem também recusa vídeo", () => {
  assert.equal(destinoDoRender("feed_imagem", { url: MP4_DA_JULIANA }).campo, null);
});

test("stories e reels aceitam vídeo, e ele vai pro campo de VÍDEO", () => {
  assert.equal(destinoDoRender("stories", { url: MP4_DA_JULIANA }).campo, "video");
  assert.equal(destinoDoRender("reels", { url: MP4_DA_JULIANA }).campo, "video");
});

test("imagem segue indo pro campo da imagem em todos os tipos", () => {
  for (const t of ["feed_imagem", "feed_carrossel", "stories", "reels"]) {
    assert.equal(
      destinoDoRender(t, { url: "https://x/y.jpg" }).campo,
      "imagem",
      `${t} devia aceitar imagem`,
    );
  }
});

test("formato indecifrável é recusado, não gravado", () => {
  assert.equal(destinoDoRender("stories", { url: "https://x/y" }).campo, null);
});

test("pedimos jpg pros formatos de imagem e mp4 pros de vídeo", () => {
  assert.equal(formatoPedido("feed_carrossel"), "jpg");
  assert.equal(formatoPedido("feed_imagem"), "jpg");
  assert.equal(formatoPedido("reels"), "mp4");
});

// ─────────────────────── link nunca vai pra arte ───────────────────────

test("o CTA do post de venda perde o checkout ao virar arte", () => {
  // Formato que o prompt gera: "CTA com o link real: {checkout_url}"
  const cta = "Garanta a sua avaliação: https://tratamentos.scannerdasaude.com/juliana/dna-360";
  const r = textoDeArte(cta);
  assert.equal(r.removeuLink, true);
  assert.ok(!r.texto.includes("http"), `sobrou link: ${r.texto}`);
  assert.equal(r.texto, "Garanta a sua avaliação");
});

test("domínio sem http também sai", () => {
  assert.ok(!semLink("Acesse scannerdasaude.com/precisao hoje").includes("scanner"));
  assert.ok(!semLink("chama no www.instagram.com/nutri").includes("instagram.com"));
});

test("sobrando só o convite sem destino, não desenha nada", () => {
  assert.equal(semLink("Acesse: https://x.com/y"), "");
  assert.equal(semLink("https://x.com/y"), "");
});

test("🔴 copy sem link sai BYTE A BYTE igual — a arte de quem não tem link não muda", () => {
  const copys = [
    "Seu corpo tá pedindo essa avaliação.",
    "Salva pra lembrar quando o cansaço voltar.",
    "Comenta aqui se você também sente isso.",
    "Manda pra alguém que precisa ouvir isso.",
    "Você faz tudo certo. E mesmo assim não melhora.",
  ];
  for (const c of copys) {
    assert.equal(semLink(c), c, `mexeu em copy limpa: ${c}`);
    assert.equal(temLink(c), false, `falso positivo: ${c}`);
  }
});

test("🔴 ponto final de frase não é domínio — a régua de terminações é fechada", () => {
  // O caso que um \.[a-z]{2,} genérico destruiria.
  const frase = "O exame chegou. Agora a leitura muda tudo.";
  assert.equal(semLink(frase), frase);
  assert.equal(temLink("Ela melhorou. Muito."), false);
  assert.equal(temLink("3 meses depois. Outra pessoa."), false);
});

test("arroba de perfil fica — não é link clicável nem promessa", () => {
  const t = "Me segue no @nutri_secrets";
  assert.equal(semLink(t), t);
});

// ─────────────────────── CTA no último slide ───────────────────────

test("REGRESSÃO: a capa do carrossel não recebe CTA", () => {
  assert.equal(ctaDoSlide({ cta: "Agenda a sua", indice: 0, total: 8 }), "");
});

test("o último slide recebe", () => {
  assert.equal(ctaDoSlide({ cta: "Agenda a sua", indice: 7, total: 8 }), "Agenda a sua");
});

test("nenhum slide do meio recebe", () => {
  for (let i = 1; i < 7; i++) {
    assert.equal(ctaDoSlide({ cta: "Agenda a sua", indice: i, total: 8 }), "");
  }
});

test("peça única mantém o CTA — não existe último slide pra onde mandar", () => {
  assert.equal(ctaDoSlide({ cta: "Agenda a sua", indice: 0, total: 1 }), "Agenda a sua");
});

test("o CTA do último slide também perde o link", () => {
  const r = ctaDoSlide({ cta: "Agenda em https://x.com/y", indice: 1, total: 2 });
  assert.ok(!r.includes("http"));
});

// ─────────────────────── a ligação com o produto ───────────────────────

test("a geração semanal decide o campo pelo que voltou, não pelo tipo pedido", () => {
  const src = ler("apps/franquias/src/lib/geracao/semanal.ts");
  assert.ok(
    src.includes("destinoDoRender"),
    "semanal.ts precisa usar destinoDoRender",
  );
  assert.ok(
    !/if \(item\.tipo === "reels"\) \{\s*urlVideo = ready\.url;/.test(src),
    "o if que decidia pelo tipo pedido voltou — foi ele que gravou o MP4 no campo da imagem",
  );
});

test("a geração semanal pede o formato em vez de aceitar o padrão do template", () => {
  const src = ler("apps/franquias/src/lib/geracao/semanal.ts");
  assert.ok(src.includes("formatoPedido"), "sem formatoPedido, o template decide sozinho");
});

test("o renderizador de carrossel não põe CTA na capa", () => {
  const src = ler("apps/franquias/src/app/api/conteudo/render-card/route.ts");
  assert.ok(src.includes("ctaDoSlide"), "a rota precisa usar ctaDoSlide");
  assert.ok(
    !/\{ headline, eyebrow, subtitle, cta \}/.test(src),
    "a capa voltou a receber o cta",
  );
});

test("todo texto de arte passa pelo filtro de link, nas três portas", () => {
  for (const arq of [
    "apps/franquias/src/app/api/conteudo/render-card/route.ts",
    "apps/franquias/src/lib/creatomate/client.ts",
    "apps/franquias/src/lib/bannerbear/client.ts",
  ]) {
    assert.ok(
      ler(arq).includes("semLink") || ler(arq).includes("textoDeArte"),
      `${arq} põe texto em imagem e não filtra link`,
    );
  }
});

// ─────────────────────── as três fontes do título ───────────────────────

test("os três estilos são aceitos e o resto é recusado", () => {
  assert.equal(normalizarFonte("classica"), "classica");
  assert.equal(normalizarFonte("Impacto"), "impacto");
  assert.equal(normalizarFonte(" leve "), "leve");
  assert.equal(normalizarFonte("comic sans"), undefined);
  assert.equal(normalizarFonte(""), undefined);
  assert.equal(normalizarFonte(null), undefined);
  assert.equal(normalizarFonte(undefined), undefined);
});

test("REGRESSÃO: sem escolha, cada layout fica com a família de sempre", () => {
  // É esta linha que faz toda arte anterior sair byte a byte igual. Se ela
  // passar a devolver um padrão próprio, a capa (Montserrat 900) e o editorial
  // (Playfair) mudam de cara sem ninguém ter pedido.
  assert.equal(resolverFamiliaTitulo(undefined, "serif"), "serif");
  assert.equal(resolverFamiliaTitulo(undefined, "sans-black"), "sans-black");
});

test("cada estilo manda numa família de verdade", () => {
  assert.equal(resolverFamiliaTitulo("classica", "sans-black"), "serif");
  assert.equal(resolverFamiliaTitulo("impacto", "serif"), "sans-black");
  assert.equal(resolverFamiliaTitulo("leve", "serif"), "sans");
});

test("o catálogo da tela não oferece estilo que o motor não conhece", () => {
  // Oferecer um id a mais faria o motor cair no padrão do layout em silêncio:
  // ela clicaria numa fonte e a arte sairia na de sempre.
  for (const f of FONTES) {
    assert.ok(
      (ESTILOS_FONTE as readonly string[]).includes(f.id),
      `estilo "${f.id}" existe na tela e não no motor de arte`,
    );
  }
  assert.equal(FONTES.length, 3, "a Aline pediu três opções");
  assert.ok(FONTES.some((f) => f.id === FONTE_PADRAO));
});

test("a amostra de cada chip existe como arquivo vetorizado", () => {
  // A amostra é desenhada com a fonte de verdade (scripts/gerar-amostras-fonte.mjs).
  // Faltando o arquivo, o chip vira um quadrado vazio e ela escolhe no escuro.
  for (const f of FONTES) {
    const caminho = join(RAIZ, "apps/franquias/public", f.amostra);
    assert.ok(existsSync(caminho), `falta a amostra ${f.amostra}`);
    const svg = readFileSync(caminho, "utf8");
    assert.match(svg, /<path /, `a amostra ${f.amostra} não tem glifo vetorizado`);
    assert.doesNotMatch(
      svg,
      /font-family/,
      `a amostra ${f.amostra} depende de fonte do navegador — mentiria sobre a letra do card`,
    );
  }
});

test("LIGAÇÃO: a rota lê a fonte do formulário e passa nos dois caminhos de render", () => {
  const rota = ler("apps/franquias/src/app/api/conteudo/render-card/route.ts");
  assert.match(rota, /normalizarFonte\(form\.get\("fonte"\)\)/);
  // Um para o carrossel, um para o card único — esquecer um deixa metade das
  // artes ignorando a escolha dela.
  assert.equal((rota.match(/^\s*fonte,$/gm) ?? []).length, 2);
});

test("LIGAÇÃO: o editor manda a fonte escolhida e mostra as três amostras", () => {
  const tela = ler("apps/franquias/src/app/dashboard/conteudo/editor/EditorArte.tsx");
  assert.match(tela, /fd\.set\("fonte", fonte\)/);
  assert.match(tela, /FONTES\.map/);
  assert.match(tela, /src=\{f\.amostra\}/);
});

test("LIGAÇÃO: todo layout de card recebe a família do título", () => {
  // Layout que não recebe `fonteTitulo` fica preso na fonte de sempre: ela
  // escolhe, gera, e nada muda naquele tipo de arte.
  const motor = ler("packages/ai-image/src/cardDesigner.ts");
  for (const fn of [
    "renderPilha",
    "renderConteudo",
    "renderCitacao",
    "renderLista",
    "renderCapa",
    "renderEditorial",
  ]) {
    const i = motor.indexOf(`async function ${fn}(params: {`);
    assert.ok(i > 0, `não achei ${fn}`);
    // Ancora no DESTRUCTURING, não no corpo: a chamada a `blocoTitulo` mais
    // abaixo ainda cita `fonteTitulo` mesmo quando a função deixou de recebê-lo
    // — olhar o corpo inteiro passaria verde com o parâmetro fora da assinatura.
    const destruct = motor.slice(i).match(/const \{[^}]*\} = params;/);
    assert.ok(destruct, `não achei o destructuring de ${fn}`);
    assert.match(destruct[0], /fonteTitulo/, `${fn} não recebe a família do título`);
  }
});
