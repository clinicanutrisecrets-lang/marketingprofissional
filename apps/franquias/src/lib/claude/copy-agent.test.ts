/**
 * O espelho do agente de copy.
 *
 * 🔴 A fonte única é `lib/copy-agent.ts` do repo scanner-saude. Este teste é a
 * trava mecânica do espelho: recalcula o checksum do núcleo daqui e compara
 * com o valor combinado entre os três repos. Se ficar vermelho, alguém mexeu
 * no texto de um lado só, e o conserto é replicar nos três no mesmo dia.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { NUCLEO_AGENTE_COPY, CHECKSUM_NUCLEO, blocoPublicoDaCopy } from "./copy-agent.ts";

const CHECKSUM_ESPERADO = "59ca30a57aa13908";

test("o núcleo é byte a byte o mesmo dos outros dois repos", () => {
  assert.equal(CHECKSUM_NUCLEO, CHECKSUM_ESPERADO);
  assert.equal(
    createHash("sha256").update(NUCLEO_AGENTE_COPY).digest("hex").slice(0, 16),
    CHECKSUM_ESPERADO,
  );
});

test("carrega as regras duras que o post não pode perder", () => {
  assert.match(NUCLEO_AGENTE_COPY, /NUNCA prometer cura/);
  assert.match(NUCLEO_AGENTE_COPY, /antes e depois de paciente/);
  assert.match(NUCLEO_AGENTE_COPY, /NUNCA use travessão/);
  assert.match(NUCLEO_AGENTE_COPY, /"inteligência artificial" nem "IA"/);
  assert.match(NUCLEO_AGENTE_COPY, /A ABERTURA PRECISA FUNCIONAR SEM CONTEXTO/);
  assert.match(NUCLEO_AGENTE_COPY, /PROCESSO FUNCIONAL/);
});

test("não carrega voz de marca: no post quem fala é a nutricionista", () => {
  assert.doesNotMatch(NUCLEO_AGENTE_COPY, /Fernanda|Aline|Nutri Secrets/i);
});

test("o prompt do post compõe do agente e mantém as regras de formato", () => {
  const fonte = readFileSync(new URL("./prompts.ts", import.meta.url), "utf8");
  assert.match(fonte, /NUCLEO_AGENTE_COPY,/);
  // o que é do Instagram continua aqui, não foi pro núcleo
  assert.match(fonte, /CARROSSEIS \(tipo feed_carrossel\)/);
  assert.match(fonte, /REELS \(tipo reels\)/);
  assert.match(fonte, /COMPLIANCE_CFN_BR/);
  // e a persona solta não pode voltar
  assert.doesNotMatch(fonte, /"Você é um estrategista de conteúdo de Instagram/);
});

test("o id do modelo vive num arquivo só", () => {
  // Antes de 25/09 estava escrito à mão em nove arquivos. Cada arquivo novo
  // com o literal é mais um lugar pra esquecer no dia da troca.
  const semLiteral = [
    "./client.ts",
    "../geracao/semanal.ts",
    "../posts/actions.ts",
    "../agentes/ads.ts",
    "../agentes/roteiro-video.ts",
    "../conteudo/reel-actions.ts",
  ];
  for (const rel of semLiteral) {
    const fonte = readFileSync(new URL(rel, import.meta.url), "utf8");
    const literais = fonte.match(/"claude-sonnet-[\d-]+"/g) ?? [];
    if (rel === "./client.ts") {
      // client.ts é o único lugar onde o literal pode existir
      assert.ok(literais.length >= 1, "client.ts precisa declarar os ids");
    } else {
      assert.deepEqual(literais, [], `${rel} voltou a escrever o id do modelo à mão`);
    }
  }
});

test("a tabela de custo conhece o modelo da copy", () => {
  // Modelo fora da tabela era cobrado com o preço de outro EM SILÊNCIO: foi
  // assim que o Gemini apareceu 6,6x mais caro no painel do Hub por um mês.
  const fonte = readFileSync(new URL("../custos/log.ts", import.meta.url), "utf8");
  const cliente = readFileSync(new URL("./client.ts", import.meta.url), "utf8");
  const modeloCopy = cliente.match(/CLAUDE_MODEL_COPY = "([^"]+)"/)?.[1];
  assert.ok(modeloCopy, "CLAUDE_MODEL_COPY não encontrado");
  assert.ok(fonte.includes(`"${modeloCopy}"`), `${modeloCopy} não está na tabela de preço`);
  assert.match(fonte, /console\.warn/);
});

test("o público do onboarding é fronteira, e o vazio não inventa restrição", () => {
  const comLista = blocoPublicoDaCopy({ queixas: ["sono"], nao_atende: "atletas", trata_peso: false });
  assert.match(comLista, /ÚNICO vocabulário de dor permitido/);
  assert.match(comLista, /É PROIBIDO citar isso/);
  assert.match(comLista, /NÃO fale de emagrecer/);

  const vazio = blocoPublicoDaCopy({});
  assert.doesNotMatch(vazio, /NÃO fale de emagrecer/);
  assert.doesNotMatch(vazio, /É PROIBIDO/);
});
