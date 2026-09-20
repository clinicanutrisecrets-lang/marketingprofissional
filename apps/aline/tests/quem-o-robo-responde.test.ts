/**
 * Quem o robô responde, e quem ele deixa em paz.
 *
 * Escrito em 20/09/2026 com as mensagens REAIS da caixa da Aline, enquanto
 * ela conferia uma por uma antes de ligar. Cada caso aqui aconteceu.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  candidatasPorIntencao,
  casaPalavraChave,
  pareceAbordagemComercial,
  pareceSpam,
  selecionarRegra,
  type Regra,
} from "../src/lib/automacao/regras.ts";

const CHAVES_CONSULTA = ["consulta", "consultas", "agendar", "agendamento", "agendamentos"];

function regraConsulta(gatilho: Regra["gatilho"] = "dm"): Regra {
  return {
    id: "r-consulta", nome: "CONSULTA", ativa: true, gatilho,
    palavras_chave: CHAVES_CONSULTA, media_ids: [],
    resposta_publica: null, resposta_privada: "Quem cuida dos agendamentos e dos testes é a Helô",
    sequencia_id: null, tags_adicionar: ["quer-consulta"],
    uma_vez_por_contato: true, prioridade: 50,
  };
}

/* ── Leads de verdade ───────────────────────────────────────────────────── */

test("Célia (@celiare.flora): 'agendar' casa a palavra-chave, resposta instantânea", () => {
  const texto = "Ola gostaria de agendar uma\nConsula on line . Sou de SP… meu nome é Celia Agostinho";
  assert.ok(casaPalavraChave(texto, CHAVES_CONSULTA));
  assert.ok(selecionarRegra({ gatilho: "dm", texto }, [regraConsulta()]));
  assert.equal(pareceAbordagemComercial(texto), false);
});

test("🔴 Célia escreveu 'Consula' com typo: é o 'agendar' que salva", () => {
  // Sem a segunda palavra-chave, o typo mataria a lead no casamento exato.
  assert.equal(casaPalavraChave("gostaria de uma Consula on line", CHAVES_CONSULTA), false);
});

test("Lila (@lilisschmitz): NENHUMA palavra-chave casa, só a rede de intenção pega", () => {
  const texto =
    "Pode passar informações sobre mapeamento genético, cotonete , exames e consta . " +
    "Valores assisti um vídeo seu com uma paciente e me interessei bastante";
  // "consta" não é "consulta"; "Valores" não é palavra-chave de ninguém.
  assert.equal(casaPalavraChave(texto, CHAVES_CONSULTA), false);
  assert.equal(selecionarRegra({ gatilho: "dm", texto }, [regraConsulta()]), null);
  // Mas ela entra como candidata pra IA ler a intenção.
  assert.equal(candidatasPorIntencao({ gatilho: "dm", texto }, [regraConsulta()]).length, 1);
  assert.equal(pareceAbordagemComercial(texto), false);
  assert.equal(pareceSpam(texto), false);
});

test("Ana Lucia: pedido urgente de exame genético não é confundido com vendedor", () => {
  const texto = "Preciso urgente me tratar fazendo o exame genético com alguém que sabe interpretar";
  assert.equal(pareceAbordagemComercial(texto), false);
});

/* ── Quem vende PRA ela ─────────────────────────────────────────────────── */

test("🔴 os vendedores reais da caixa dela são barrados", () => {
  const pitches = [
    "Boa tarde Aline, como você está? Queria entender um pouco melhor como você está trabalhando hoje para atrair novos clientes pela internet. Você já utiliza tráfego pago?",
    "Acredito bastante no trabalho que desenvolvo com tráfego pago e, por isso, não queria tentar explicar todo o valor dele por mensagem. Se você me disponibilizar 30 minutos…",
    "Olá Aline, tudo bem? Estava conhecendo um pouco mais do seu trabalho e gostei bastante da forma como você apresenta seus conteúdos.",
  ];
  // O primeiro e o segundo citam o ofício; o terceiro é abordagem fria pura.
  assert.equal(pareceAbordagemComercial(pitches[0]), true);
  assert.equal(pareceAbordagemComercial(pitches[1]), true);
});

test("imóvel, edição de vídeo e lançamento entram na lista", () => {
  assert.equal(pareceAbordagemComercial("tenho um imóvel na planta que pode te interessar"), true);
  assert.equal(pareceAbordagemComercial("sou editor de vídeo, posso cuidar dos seus reels"), true);
  assert.equal(pareceAbordagemComercial("trabalho com lançamento digital, vamos escalar seu negócio?"), true);
  assert.equal(pareceAbordagemComercial("sou social media e gostei do seu perfil"), true);
});

test("🔴 'parceria' sozinha NÃO barra: nutri também propõe parceria", () => {
  assert.equal(pareceAbordagemComercial("Aline, podemos fazer uma parceria? Sou nutri aqui de Curitiba"), false);
  // Só com abordagem fria junto.
  assert.equal(pareceAbordagemComercial("Meu nome é João, trabalho com tráfego e quero fechar uma parceria"), true);
});

test("paciente falando de dinheiro não vira vendedor", () => {
  assert.equal(pareceAbordagemComercial("qual o valor da consulta? e do teste?"), false);
  assert.equal(pareceAbordagemComercial("Com a crise no Brasil, meus clientes não conseguiram pagar um teste genético"), false);
});

/* ── Resposta de story: elogio fica sem resposta ────────────────────────── */

test("Tereza (@tereza_prallon): elogio no story não casa regra nenhuma", () => {
  const texto = "Muito lindo ! Sinergia sim!";
  assert.equal(selecionarRegra({ gatilho: "story_reply", texto }, [regraConsulta("story_reply")]), null);
  assert.equal(pareceAbordagemComercial(texto), false);
});

test("elogio ao bebê também não casa", () => {
  const texto = "Está muito crescido esse bebé 💖";
  assert.equal(selecionarRegra({ gatilho: "story_reply", texto }, [regraConsulta("story_reply")]), null);
});

test("🔴 story_reply não tem chave geral: sem regra, o robô fica calado", () => {
  // Diferente de comentário (agradecimento) e DM (base do Scanner), story
  // sem regra só fica registrado. É proposital: story é conversa pessoal.
  const texto = "Muito lindo ! Sinergia sim!";
  assert.equal(selecionarRegra({ gatilho: "story_reply", texto }, []), null);
});
