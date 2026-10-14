import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  TIPOS_FOTO_BANCO,
  caminhoNoBucket,
  filaDaSemana,
  tipoLevaFotoDoBanco,
} from "./fotos-banco.ts";

const fonte = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const fotos = ["a", "b", "c", "d"].map((id) => ({ id, url_storage: id }));

test("a fila gira as fotos sem perder nem repetir dentro da semana", () => {
  const f = filaDaSemana(fotos, "2026-10-05");
  assert.equal(f.length, 4);
  assert.deepEqual([...f].map((x) => x.id).sort(), ["a", "b", "c", "d"]);
});

test("semanas diferentes podem começar por fotos diferentes; a mesma semana é estável", () => {
  assert.deepEqual(filaDaSemana(fotos, "2026-10-05"), filaDaSemana(fotos, "2026-10-05"));
  const inicios = new Set(
    ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"].map(
      (s) => filaDaSemana(fotos, s)[0]!.id,
    ),
  );
  assert.ok(inicios.size > 1);
});

test("sem foto no banco, a fila é vazia (a arte segue tipográfica)", () => {
  assert.deepEqual(filaDaSemana([], "2026-10-05"), []);
});

test("caminho no bucket a partir de URL assinada e pública", () => {
  assert.deepEqual(
    caminhoNoBucket(
      "https://x.supabase.co/storage/v1/object/sign/franqueadas-assets/abc/foto_post/1_prato.jpg?token=t",
    ),
    { bucket: "franqueadas-assets", path: "abc/foto_post/1_prato.jpg" },
  );
  assert.deepEqual(
    caminhoNoBucket("https://y.supabase.co/storage/v1/object/public/nutri-assets/logos/l.jpg"),
    { bucket: "nutri-assets", path: "logos/l.jpg" },
  );
  assert.equal(caminhoNoBucket("https://exemplo.com/foto.jpg"), null);
});

test("só carrossel e feed levam foto; logo e depoimento não entram no banco", () => {
  assert.ok(tipoLevaFotoDoBanco("feed_carrossel"));
  assert.ok(tipoLevaFotoDoBanco("feed_imagem"));
  assert.ok(!tipoLevaFotoDoBanco("stories"));
  assert.ok(!(TIPOS_FOTO_BANCO as readonly string[]).includes("logo_principal"));
  assert.ok(!(TIPOS_FOTO_BANCO as readonly string[]).includes("depoimento_print"));
});

test("o pacote da semana passa a foto do banco pra capa e pro feed", () => {
  const s = fonte("./semanal.ts");
  assert.match(s, /fotoCapa: kitCapa \? kitCapa\.buf : await proximaFotoDoBanco\(textoDoPost\(post\)\)/);
  assert.match(s, /: tipoLevaFotoDoBanco\(item\.tipo\) \? await proximaFotoDoBanco\(textoDoPost\(post\)\)/);
  assert.match(s, /\.in\("tipo", \[\.\.\.TIPOS_FOTO_BANCO\]\)/);
});

test("a tela Minhas fotos e o aviso em Aprovar semana existem", () => {
  assert.match(fonte("../../app/dashboard/fotos/FotosBanco.tsx"), /tipo="foto_post"/);
  const aprovar = fonte("../../app/dashboard/aprovar/page.tsx");
  assert.match(aprovar, /Suba fotos suas e dos seus pratos para os posts ganharem vida\./);
  assert.match(aprovar, /href="\/dashboard\/fotos"/);
  assert.match(fonte("../../app/dashboard/SidebarNav.tsx"), /\/dashboard\/fotos/);
});

// ————— Escolha da foto pelo assunto (Aline, 14/10/2026) —————
import { assuntosDoTexto, assuntosDaFoto, melhorFotoParaTexto, focoDaFoto } from "./fotos-banco.ts";

test("o tipo escolhido no envio já dá assunto (nível 1)", () => {
  assert.deepEqual(assuntosDaFoto({ id: "1", url_storage: "x", tipo: "foto_atendimento" }), ["atendimento", "profissional"]);
  assert.deepEqual(assuntosDaFoto({ id: "1", url_storage: "x", tipo: "foto_clinica", assuntos: ["consultorio", "inventado"] }), ["consultorio"]);
});

test("o slide pega a foto que combina com o texto; sem nenhuma, null", () => {
  const banco = [
    { id: "prato", url_storage: "a", tipo: "foto_post", assuntos: ["prato", "ingrediente"] },
    { id: "consulta", url_storage: "b", tipo: "foto_atendimento", assuntos: ["atendimento"] },
    { id: "kit", url_storage: "c", tipo: "foto_post", assuntos: ["kit", "coleta"] },
  ];
  assert.equal(melhorFotoParaTexto(banco, "Gene, exame e sintoma lidos juntos na consulta.")?.id, "consulta");
  assert.equal(melhorFotoParaTexto(banco, "O café da manhã que segura a fome até o almoço.")?.id, "prato");
  assert.equal(melhorFotoParaTexto(banco, "A coleta é com um cotonete na bochecha.")?.id, "kit");
  assert.equal(melhorFotoParaTexto(banco, "Uma frase que não pede foto nenhuma."), null);
  // Já usada na semana não repete.
  assert.equal(melhorFotoParaTexto(banco, "consulta", new Set(["consulta"]))?.id, undefined);
  // Exigir assunto: a foto do prato nunca vai pro slide da coleta.
  assert.equal(melhorFotoParaTexto([banco[0]!], "A coleta é simples.", new Set(), ["coleta", "kit"]), null);
  assert.ok(assuntosDoTexto("Exames de sangue").includes("exame"));
});

test("foco do rosto só vale entre 0 e 1", () => {
  assert.equal(focoDaFoto({ id: "1", url_storage: "x", foco_y: "0.35" }), 0.35);
  assert.equal(focoDaFoto({ id: "1", url_storage: "x", foco_y: 2 }), undefined);
  assert.equal(focoDaFoto({ id: "1", url_storage: "x", foco_y: null }), undefined);
});

test("ligação: o envio descreve a foto, a semana descreve as antigas e escolhe pelo texto", () => {
  const acoes = readFileSync("src/lib/arquivos/actions.ts", "utf8");
  assert.match(acoes, /descreverEGravarFoto\(/);
  const sem = readFileSync("src/lib/geracao/semanal.ts", "utf8");
  assert.match(sem, /filter\(\(x\) => !x\.descrito_em && precisaLeituraAutomatica\(x\.tipo\)\)/);
  assert.match(sem, /proximaFotoDoBanco\(textoDoPost\(post\)\)/);
  assert.match(sem, /fotoDelaParaTexto\(/);
  const desc = readFileSync("src/lib/arquivos/descrever-foto.ts", "utf8");
  assert.match(desc, /tool_choice/);
  assert.match(desc, /enum: \[\.\.\.ASSUNTOS_FOTO\]/, "o descritor só usa o vocabulário fechado");
});

// ————— Foto de comida com o nome que ela escreve (Aline, 14/10/2026) —————
import { melhorFotoParaTexto as melhor, palavrasDoNome, precisaLeituraAutomatica, assuntosDaFoto as assuntosDe } from "./fotos-banco.ts";

test("foto de comida não passa pela leitura automática; as dela e do consultório passam", () => {
  assert.equal(precisaLeituraAutomatica("foto_comida"), false);
  assert.equal(precisaLeituraAutomatica("foto_post"), true);
  assert.equal(precisaLeituraAutomatica("foto_clinica"), true);
  assert.ok(TIPOS_FOTO_BANCO.includes("foto_comida"));
  assert.ok(assuntosDe({ id: "1", url_storage: "x", tipo: "foto_comida" }).includes("prato"));
});

test("o slide que cita o alimento pega a foto que ela nomeou", () => {
  const banco = [
    { id: "tomate", url_storage: "a", tipo: "foto_comida", descricao: "salada de tomate" },
    { id: "acerola", url_storage: "b", tipo: "foto_comida", descricao: "Suco de acerola" },
  ];
  assert.equal(melhor(banco, "A acerola tem mais vitamina C que a laranja.")?.id, "acerola");
  assert.equal(melhor(banco, "Tomates maduros e o licopeno")?.id, "tomate");
  // Palavras curtas e genéricas do nome não contam.
  assert.deepEqual(palavrasDoNome("Suco de acerola com gengibre"), ["suco", "acerola", "gengibre"]);
  assert.deepEqual(palavrasDoNome("receita do prato"), []);
});

test("ligação: o envio da foto de comida não chama a leitura, e a tela grava o nome", () => {
  const acoes = fonte("../arquivos/actions.ts");
  assert.match(acoes, /tipo === "foto_comida"/);
  assert.match(acoes, /export async function nomearFoto/);
  assert.match(acoes, /\.eq\("franqueada_id", franqueada\.id\)/, "só renomeia foto da própria conta");
  const sem = fonte("./semanal.ts");
  assert.match(sem, /precisaLeituraAutomatica\(x\.tipo\)/);
  assert.match(sem, /descrito_em, descricao"\)/);
  const tela = fonte("../../app/dashboard/fotos/FotosBanco.tsx");
  assert.match(tela, /tipo="foto_comida"/);
  assert.match(tela, /nomearFoto\(/);
});
