import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validarArte, capaDoPost, legendaEhEsqueleto, coresDoPerfil, MAX_ARTE,
} from "../src/lib/arte-post/molde.ts";

const ler = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

const boa = {
  eyebrow: "Matéria-prima",
  slides: [
    { headline: "\"Deve ser o estresse, faz parte\"", corpo: "Não é preguiça. Dormir e acordar cansada tem explicação." },
    { headline: "Ferritina é o estoque", corpo: "A ferritina, que é parte da matéria-prima da sua fábrica de saúde, cai antes do hemograma." },
  ],
  fecho: { headline: "Envia pra quem dorme bem e acorda pior", cta: "Qual dos perfis é o seu?" },
  legenda: "Você dorme oito horas e acorda destruída. ".repeat(4),
  hashtags: ["ferritina", "#nutricao"],
};

test("arte boa passa, com eyebrow em caixa alta e hashtag com #", () => {
  const r = validarArte(boa);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.arte.eyebrow, "MATÉRIA-PRIMA");
    assert.deepEqual(r.arte.hashtags, ["#ferritina", "#nutricao"]);
  }
});

test("recusa nomeando o campo e o tamanho", () => {
  const r = validarArte({ ...boa, slides: [{ headline: "x".repeat(MAX_ARTE.headline + 5), corpo: "a" }, boa.slides[1]] });
  assert.ok(!r.ok);
  if (!r.ok) assert.match(r.motivo, /título do slide 1 com 75 caracteres/);
});

test("travessão e IA são recusados; 'aí' e 'ia' não são a sigla", () => {
  assert.ok(!validarArte({ ...boa, legenda: boa.legenda + " — fim" }).ok);
  assert.ok(!validarArte({ ...boa, legenda: boa.legenda + " feito com IA" }).ok);
  assert.ok(validarArte({ ...boa, legenda: boa.legenda + " E aí, ela ia dormir." }).ok);
});

test("quantidade de slides internos fora da faixa é recusada", () => {
  assert.ok(!validarArte({ ...boa, slides: [boa.slides[0]] }).ok);
});

test("capa é a primeira linha; esqueleto do calendário é reconhecido", () => {
  const esqueleto = "Você dorme oito horas e acorda destruída\nCruza ferro × vitamina C.\nEnvia pra amiga";
  assert.equal(capaDoPost(esqueleto), "Você dorme oito horas e acorda destruída");
  assert.ok(legendaEhEsqueleto(esqueleto));
  assert.ok(!legendaEhEsqueleto("Legenda escrita por ela, sem o cruzamento."));
});

test("cores do nutrisecrets: Tiffany é bloco, magenta é destaque, escuro é letra", () => {
  const c = coresDoPerfil({ cor_primaria: "#0ABFBC", paleta_cores: { tiffany: "#0ABFBC", magenta: "#D946EF", escuro: "#1A1A2E", creme: "#F5EFE2" } });
  assert.deepEqual(c, { corPrimariaHex: "#0ABFBC", corDestaqueHex: "#D946EF", corTextoHex: "#1A1A2E" });
});

test("cores do scannerdasaude giram pelo pilar", () => {
  const paleta = [
    { hex: "#8B5CF6", uso: "educacao_precisao" }, { hex: "#3B82F6", uso: "bastidores_software" },
    { hex: "#14B8A6", uso: "transformacao_carreira" }, { hex: "#EF4444", uso: "venda_direta" },
  ];
  assert.equal(coresDoPerfil({ paleta_cores: paleta }, "convite").corPrimariaHex, "#EF4444");
  assert.equal(coresDoPerfil({ paleta_cores: paleta }, "ciência aplicada").corPrimariaHex, "#8B5CF6");
});

test("a ação lê a curadoria ANTES do modelo e nunca publica", () => {
  const a = ler("../src/lib/arte-post/actions.ts");
  assert.ok(a.indexOf("await curadoria(") < a.indexOf("messages.create"));
  assert.match(a, /status: "aguardando_aprovacao"/);
  assert.doesNotMatch(a, /status: "agendado"|publicar/);
  assert.match(a, /tool_choice/);
});

test("o feed tem o botão de montar no post e o de montar as que faltam", () => {
  assert.match(ler("../src/app/perfis/[slug]/feed/PostCard.tsx"), /<MontarArteButton/);
  assert.match(ler("../src/app/perfis/[slug]/feed/page.tsx"), /<MontarArtesQueFaltam/);
  assert.match(ler("../src/app/perfis/[slug]/feed/page.tsx"), /maxDuration = 300/);
});

test("Desenhar vídeo: o clique principal não pergunta o tema", () => {
  const b = ler("../src/app/perfis/[slug]/feed/DesenharVideoButton.tsx");
  assert.match(b, /desenharVideoDoPost\(comEscolhas \? \{ postId, tema, publico, duracao \} : \{ postId \}\)/);
  assert.match(b, /void desenhar\(false\)/);
  assert.match(ler("../src/lib/reel-animado/actions.ts"), /perfil\.slug === "scannerdasaude" \? "profissional" : "paciente"/);
});

test("a arte do Studio sai no carrossel editorial que a Aline aprovou (13/10), não no grotesco com magenta", () => {
  const acoes = ler("../src/lib/arte-post/actions.ts");
  assert.match(acoes, /gerarCarrosselEditorialEUpload\(/);
  assert.doesNotMatch(acoes, /gerarCarrosselEUpload\(/);
  assert.doesNotMatch(acoes, /grotesca_clara/);
  const editorial = ler("../../../packages/ai-image/src/editorial.ts");
  // Foto INTEIRA na capa ("está cortando a foto").
  assert.match(editorial, /fit: "cover"/);
  // Sem magenta e sem a letra preta pesada ("está roxo e preto").
  assert.doesNotMatch(editorial, /D946EF|D6336C|sans-black/i);
  assert.match(editorial, /"serif"/);
  assert.match(editorial, /"inter"/);
});

test("o botão do topo refaz também os posts que ainda estão na arte antiga", async () => {
  const { precisaArteNova } = await import("../src/lib/arte-post/molde.ts");
  assert.equal(precisaArteNova([]), true);
  assert.equal(precisaArteNova([{ url: "s/nutrisecrets/ai-image/1791848495766_carrossel_1.png", tipo: "imagem" }]), true);
  assert.equal(precisaArteNova([{ url: "s/nutrisecrets/ai-image/1792_editorial_1.png", tipo: "imagem" }]), false);
  // Arte feita fora do Studio fica intocada.
  assert.equal(precisaArteNova([{ url: "s/nutrisecrets/sinergia/lentilha-01.png", tipo: "imagem" }]), false);
  assert.equal(precisaArteNova([{ url: "v.mp4", tipo: "video" }]), true);
  assert.match(ler("../src/app/perfis/[slug]/feed/page.tsx"), /precisaArteNova\(/);
});
