import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lerArgs, ligado, numero, texto } from "../src/lib/args.ts";
import {
  DIMENSOES,
  DURACAO_CLIPE_SEG,
  custoTreinoUsd,
  inicioDoTrecho,
  lerCuradoria,
  legendaDoNome,
  montarLegenda,
  nomeDoLora,
  nomePreparado,
  pacoteMaisRecente,
  parsePassos,
  problemasDoPacote,
  semTravessoes,
  slug,
  tipoDoArquivo,
  totalEstimado,
  type PacoteRemoto,
} from "../src/lib/regras.ts";

describe("formato e arquivos", () => {
  it("480p nos dois formatos, como o trainer espera", () => {
    assert.deepEqual(DIMENSOES["9:16"], { largura: 480, altura: 832 });
    assert.deepEqual(DIMENSOES["16:9"], { largura: 832, altura: 480 });
  });
  it("classifica por extensão e recusa HEIC em voz alta", () => {
    assert.equal(tipoDoArquivo("Brownie.JPG"), "imagem");
    assert.equal(tipoDoArquivo("corte.mov"), "video");
    assert.equal(tipoDoArquivo("IMG_1.heic"), "recusado");
    assert.equal(tipoDoArquivo("dataset.json"), null);
  });
  it("nome preparado é estável, sem acento, na extensão alvo", () => {
    assert.equal(nomePreparado(3, "Pão de Cúrcuma.MOV", "video"), "003-pao-de-curcuma.mp4");
    assert.equal(nomePreparado(12, "brownie.png", "imagem"), "012-brownie.jpg");
    assert.equal(slug("___"), "arquivo");
  });
  it("vídeo longo corta no miolo; curto começa do zero", () => {
    assert.equal(inicioDoTrecho(3), 0);
    assert.equal(inicioDoTrecho(15, "inicio"), 0);
    assert.ok(Math.abs(inicioDoTrecho(15) - (15 - DURACAO_CLIPE_SEG) / 2) < 1e-9);
  });
});

describe("legendas", () => {
  it("trigger na frente, uma linha, sem travessão, sem aspas", () => {
    const l = montarLegenda(' "Brownie de cacau — close no corte, luz lateral"\n', "nutrisecrets style");
    assert.equal(l, "nutrisecrets style. Brownie de cacau, close no corte, luz lateral");
  });
  it("não repete a trigger se o modelo já a escreveu", () => {
    assert.equal(montarLegenda("nutrisecrets style. sopa de abóbora", "nutrisecrets style"), "nutrisecrets style. sopa de abóbora");
    assert.equal(montarLegenda("Nutrisecrets style: sopa", "nutrisecrets style"), "nutrisecrets style. sopa");
  });
  it("descrição vazia devolve só a trigger", () => {
    assert.equal(montarLegenda("   ", "x style"), "x style");
  });
  it("semTravessoes preserva hífen comum e faixa numérica", () => {
    assert.equal(semTravessoes("anti-inflamatório 70–150"), "anti-inflamatório 70-150");
    assert.equal(semTravessoes("sem nada"), "sem nada");
  });
  it("legenda de emergência sai do nome do arquivo", () => {
    assert.match(legendaDoNome("brownie-cacau_close.mp4", "video"), /^brownie cacau close, vídeo curto/);
  });
});

describe("custo e passos", () => {
  it("passos × preço, arredondado em centavos", () => {
    assert.equal(custoTreinoUsd(2000), 8);
    assert.equal(custoTreinoUsd(1500, 0.004), 6);
    assert.equal(custoTreinoUsd(0), 0);
    assert.equal(totalEstimado([1500, 2000, 3000]), 26);
  });
  it("parsePassos aceita lista, ignora lixo e cai no padrão", () => {
    assert.deepEqual(parsePassos("1500,2000, 3000"), [1500, 2000, 3000]);
    assert.deepEqual(parsePassos("abc"), [2000]);
    assert.deepEqual(parsePassos(undefined, 900), [900]);
    assert.deepEqual(parsePassos("2000,2000"), [2000]);
  });
  it("nome do LoRA carrega dataset, modo, passos e data", () => {
    assert.equal(nomeDoLora("receitas", "t2v", 2000, new Date("2026-09-12T10:00:00Z")), "receitas-t2v-2000p-2026-09-12");
  });
});

describe("pacote e trava do i2v", () => {
  const p = (extra: Partial<PacoteRemoto>): PacoteRemoto => ({
    provedor: "supabase", url: "u", criado_em: "2026-09-01T00:00:00Z", arquivos: 20, imagens: 20, videos: 0, formato: "9:16", trigger: "t", bytes: 1, ...extra,
  });
  it("o mais recente é o que treina", () => {
    const m = { pacotes: [p({ url: "velho" }), p({ url: "novo", criado_em: "2026-09-10T00:00:00Z" }), p({ url: "meio", criado_em: "2026-09-05T00:00:00Z" })] };
    assert.equal(pacoteMaisRecente(m)?.url, "novo");
    assert.equal(pacoteMaisRecente({ pacotes: [] }), null);
  });
  it("sem pacote é erro; i2v sem vídeo é erro; poucos arquivos é aviso", () => {
    assert.equal(problemasDoPacote(null, "t2v").erros.length, 1);
    assert.match(problemasDoPacote(p({}), "i2v").erros[0], /i2v exige pelo menos um vídeo/);
    assert.equal(problemasDoPacote(p({ videos: 1 }), "i2v").erros.length, 0);
    assert.equal(problemasDoPacote(p({ arquivos: 4 }), "t2v").avisos.length, 1);
    assert.equal(problemasDoPacote(p({ arquivos: 0 }), "t2v").erros.length, 1);
  });
});

describe("args", () => {
  it("lê --chave valor, --chave=valor e flag solta", () => {
    const a = lerArgs(["--dataset", "receitas", "--steps=3000", "--forcar", "extra", "--lr", "0.0001"], new Set(["forcar"]));
    assert.equal(texto(a, "dataset"), "receitas");
    assert.equal(numero(a, "steps", 1), 3000);
    assert.equal(numero(a, "lr", 1), 0.0001);
    assert.equal(ligado(a, "forcar"), true);
    assert.equal(ligado(a, "sem-upload"), false);
    assert.deepEqual(a.soltos, ["extra"]);
    assert.equal(texto(a, "nada", "padrao"), "padrao");
  });
  it("sem declarar a flag como booleana, o próximo token vira valor (documentado)", () => {
    const a = lerArgs(["--forcar", "extra"]);
    assert.equal(texto(a, "forcar"), "extra");
  });
});

describe("curadoria.json e trecho", () => {
  it("lê legenda e inicio_seg, ignora chaves com _ e lixo", () => {
    const c = lerCuradoria(JSON.stringify({ _como_usar: "x", "a.mp4": { legenda: " calda ", inicio_seg: 13.5 }, "b.jpg": { legenda: "" }, "c.jpg": "texto", "d.jpg": { inicio_seg: "3" } }));
    assert.deepEqual(c, { "a.mp4": { legenda: "calda", inicio_seg: 13.5 } });
    assert.deepEqual(lerCuradoria(null), {});
  });
  it("início manual vale, mas nunca passa do fim do vídeo", () => {
    assert.equal(inicioDoTrecho(19.33, "meio", 13.5), 13.5);
    assert.ok(Math.abs(inicioDoTrecho(19.33, "meio", 40) - (19.33 - DURACAO_CLIPE_SEG)) < 1e-9);
    assert.equal(inicioDoTrecho(19.33, "meio", -2), 0);
    assert.equal(inicioDoTrecho(3, "meio", 2), 0);
  });
  it("--trecho fim corta o final", () => {
    assert.ok(Math.abs(inicioDoTrecho(12, "fim") - (12 - DURACAO_CLIPE_SEG)) < 1e-9);
  });
});
