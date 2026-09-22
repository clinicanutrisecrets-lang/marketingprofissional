import { test } from "node:test";
import assert from "node:assert/strict";
import { contatosInventados, limparContatosInventados } from "../src/lib/automacao/contato-inventado.ts";

/**
 * 🔴 O caso real (22/09/2026): o robô ofereceu "contato@scannerdasaude.com",
 * que não existe em lugar nenhum. Quem recebe escreve pra lá e conclui que
 * ninguém respondeu.
 */
test("e-mail que não está no contexto é invenção; o que está, passa", () => {
  const contexto = "Perfil: @nutri_secrets. Agendamentos com a Helô no WhatsApp (41) 99249-5825.";
  assert.deepEqual(
    contatosInventados("Me manda um e-mail em contato@scannerdasaude.com que a gente responde.", contexto),
    [{ tipo: "email", valor: "contato@scannerdasaude.com" }],
  );
  assert.deepEqual(contatosInventados("Fala com a Helô no (41) 99249-5825.", contexto), []);
});

test("telefone: mesma linha em outro formato é a mesma linha", () => {
  const contexto = "WhatsApp da Helô: 5541992495825";
  assert.deepEqual(contatosInventados("Chama no (41) 99249-5825 💬", contexto), []);
  assert.equal(contatosInventados("Chama no (11) 98888-7777", contexto).length, 1);
});

test("link: compara o domínio, então caminho a mais não vira invenção", () => {
  const contexto = "Página da consulta: scannerdasaude.com/consulta-nutrigenetica";
  assert.deepEqual(contatosInventados("Olha em https://scannerdasaude.com/consulta-nutrigenetica/precos", contexto), []);
  assert.deepEqual(
    contatosInventados("Baixa em www.nutrisecrets-ebooks.com.br", contexto),
    [{ tipo: "link", valor: "www.nutrisecrets-ebooks.com.br" }],
  );
});

test("@ de perfil que ela nunca citou não sai", () => {
  const contexto = "Perfil: @nutri_secrets (Nutri Secrets).";
  assert.deepEqual(contatosInventados("Me segue no @nutri_secrets", contexto), []);
  assert.deepEqual(
    contatosInventados("Fala com a equipe no @scanner.suporte", contexto),
    [{ tipo: "arroba", valor: "@scanner.suporte" }],
  );
});

test("limpar tira só o contato e deixa a frase em pé", () => {
  const contexto = "Perfil: @nutri_secrets.";
  const { texto, removidos } = limparContatosInventados(
    "Que bom que você se interessou! Me escreve em contato@scannerdasaude.com que eu te explico.",
    contexto,
  );
  assert.equal(removidos.length, 1);
  assert.match(texto, /Que bom que você se interessou!/);
  assert.match(texto, /que eu te explico\./);
  assert.ok(!texto.includes("@scannerdasaude.com"), texto);
  // 🔴 Nunca devolve vazio por causa de um endereço: a resposta em volta
  // costuma estar certa, e jogar tudo fora deixaria a pessoa sem resposta.
  assert.ok(texto.length > 40, texto);
});

test("texto sem contato nenhum volta idêntico", () => {
  const t = "A consulta nutrigenética usa o teste como parte da avaliação. Quer que eu te explique como funciona?";
  assert.deepEqual(limparContatosInventados(t, "qualquer contexto"), { texto: t, removidos: [] });
});

test("número que não é telefone não vira falso positivo", () => {
  // Dose, ano e valor têm menos de 8 dígitos seguidos.
  assert.deepEqual(contatosInventados("São 2000 UI de vitamina D, num estudo de 2019, por R$ 3.500.", ""), []);
});
