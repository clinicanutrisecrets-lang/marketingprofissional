import { test } from "node:test";
import assert from "node:assert/strict";
import {
  casaPalavraChave,
  extrairEventos,
  janela24hAberta,
  pareceClinico,
  pareceSpam,
  preencherTexto,
  selecionarRegra,
  type Regra,
} from "../src/lib/automacao/regras.ts";

function regra(p: Partial<Regra> & { id: string; gatilho: Regra["gatilho"] }): Regra {
  return {
    nome: p.id,
    ativa: true,
    palavras_chave: [],
    media_ids: [],
    resposta_publica: null,
    resposta_privada: null,
    sequencia_id: null,
    tags_adicionar: [],
    uma_vez_por_contato: true,
    prioridade: 100,
    ...p,
  };
}

test("palavra-chave casa por palavra inteira, sem acento e sem caixa", () => {
  assert.equal(casaPalavraChave("Quero o EBOOK!", ["ebook"]), true);
  assert.equal(casaPalavraChave("vi no facebook", ["ebook"]), false);
  assert.equal(casaPalavraChave("Me manda o cardápio", ["cardapio"]), true);
  assert.equal(casaPalavraChave("quero receber", ["quero receber"]), true);
  assert.equal(casaPalavraChave("qualquer coisa", []), true);
  assert.equal(casaPalavraChave("", ["x"]), false);
});

test("regra específica vence a genérica no mesmo gatilho", () => {
  const generica = regra({ id: "g", gatilho: "comentario" });
  const especifica = regra({ id: "e", gatilho: "comentario", palavras_chave: ["ebook"] });
  const r = selecionarRegra({ gatilho: "comentario", texto: "quero o ebook" }, [generica, especifica]);
  assert.equal(r?.id, "e");
  const r2 = selecionarRegra({ gatilho: "comentario", texto: "lindo post" }, [generica, especifica]);
  assert.equal(r2?.id, "g");
});

test("regra presa a um post só dispara naquele post; uma_vez_por_contato respeita histórico", () => {
  const doPost = regra({ id: "p", gatilho: "comentario", media_ids: ["m1"], palavras_chave: ["eu quero"] });
  assert.equal(selecionarRegra({ gatilho: "comentario", texto: "eu quero", mediaId: "m2" }, [doPost]), null);
  assert.equal(selecionarRegra({ gatilho: "comentario", texto: "eu quero", mediaId: "m1" }, [doPost])?.id, "p");
  assert.equal(
    selecionarRegra({ gatilho: "comentario", texto: "eu quero", mediaId: "m1" }, [doPost], new Set(["p"])),
    null,
  );
});

test("gatilho de DM não dispara regra de comentário e vice-versa", () => {
  const dm = regra({ id: "d", gatilho: "dm", palavras_chave: ["oi"] });
  assert.equal(selecionarRegra({ gatilho: "comentario", texto: "oi" }, [dm]), null);
  assert.equal(selecionarRegra({ gatilho: "dm", texto: "oi" }, [dm])?.id, "d");
});

test("preencherTexto troca variáveis e não deixa vírgula órfã sem nome", () => {
  assert.equal(preencherTexto("Oi, {primeiro_nome}! Segue o link", { nome: "Maria Silva" }), "Oi, Maria! Segue o link");
  assert.equal(preencherTexto("Oi, {nome}!", { nome: null }), "Oi!");
  assert.equal(preencherTexto("Valeu {username}", { username: "ana_nutri" }), "Valeu @ana_nutri");
});

test("janela de 24h", () => {
  const agora = Date.parse("2026-09-05T12:00:00Z");
  assert.equal(janela24hAberta("2026-09-05T11:00:00Z", agora), true);
  assert.equal(janela24hAberta("2026-09-04T11:59:00Z", agora), false);
  assert.equal(janela24hAberta(null, agora), false);
});

test("extrairEventos lê comentário nos dois formatos e DMs com story", () => {
  const payload = {
    object: "instagram",
    entry: [
      {
        id: "1784",
        time: 1,
        changes: [
          {
            field: "comments",
            value: { from: { id: "u1", username: "ana" }, id: "c1", text: "quero", media: { id: "m1" } },
          },
          {
            field: "comments",
            value: { from: { id: "u2", username: "bia" }, comment_id: "c2", text: "lindo", media: { id: "m1" }, parent_id: "c1" },
          },
        ],
      },
      {
        id: "1784",
        messaging: [
          { sender: { id: "u3" }, recipient: { id: "1784" }, timestamp: 2, message: { mid: "m-1", text: "oi" } },
          { sender: { id: "1784" }, recipient: { id: "u3" }, message: { mid: "m-2", text: "resposta", is_echo: true } },
          { sender: { id: "u4" }, recipient: { id: "1784" }, message: { mid: "m-3", text: "😍", reply_to: { story: { id: "s1", url: "x" } } } },
          { sender: { id: "u5" }, recipient: { id: "1784" }, message: { mid: "m-4", attachments: [{ type: "story_mention", payload: { url: "y" } }] } },
          { sender: { id: "u6" }, recipient: { id: "1784" }, read: { mid: "m-1" } },
        ],
      },
    ],
  };
  const ev = extrairEventos(payload);
  assert.deepEqual(
    ev.map((e) => [e.tipo, e.igsid, e.externalId]),
    [
      ["comentario", "u1", "c1"],
      ["comentario", "u2", "c2"],
      ["dm", "u3", "m-1"],
      ["eco", "1784", "m-2"],
      ["story_reply", "u4", "m-3"],
      ["story_mention", "u5", "m-4"],
      ["ignorar", "u6", ""],
    ],
  );
  assert.equal(ev[1].parentCommentId, "c1");
  assert.equal(ev[4].mediaId, "s1");
  assert.equal(extrairEventos({ object: "page" }).length, 0);
});

test("pergunta clínica em comentário é reconhecida; spam óbvio também", () => {
  assert.equal(pareceClinico("posso tomar ômega 3 com meu remédio?"), true);
  assert.equal(pareceClinico("amei o post!"), false);
  assert.equal(pareceSpam("@fulano @ciclano"), true);
  assert.equal(pareceSpam("ganhe seguidores https://x.y"), true);
  assert.equal(pareceSpam("quero o ebook"), false);
});

import { casarOpcao, opcoesComoTexto, payloadDaOpcao } from "../src/lib/automacao/regras.ts";

test("botões: payload do toque vence; sem payload aceita número ou rótulo digitado", () => {
  const ultimas = { regra_id: "r1", rotulos: ["Outro profissional", "Sim, sou nutri", "Não, sou paciente"] };
  assert.deepEqual(casarOpcao({ texto: "Sim, sou nutri", payload: payloadDaOpcao("r1", 1) }, null), { regraId: "r1", indice: 1 });
  assert.deepEqual(casarOpcao({ texto: "2" }, ultimas), { regraId: "r1", indice: 1 });
  assert.deepEqual(casarOpcao({ texto: "nao, sou paciente" }, ultimas), { regraId: "r1", indice: 2 });
  assert.equal(casarOpcao({ texto: "quero o material" }, ultimas), null);
  assert.equal(casarOpcao({ texto: "2" }, null), null);
  assert.match(opcoesComoTexto("Você é nutri?", ultimas.rotulos), /1\. Outro profissional[\s\S]*3\. Não, sou paciente/);
});

test("extrairEventos lê payload do botão e anexo de áudio", () => {
  const ev = extrairEventos({
    object: "instagram",
    entry: [{
      id: "1784",
      messaging: [
        { sender: { id: "u1" }, recipient: { id: "1784" }, message: { mid: "m1", text: "Sim, sou nutri", quick_reply: { payload: "opc:r1:1" } } },
        { sender: { id: "u2" }, recipient: { id: "1784" }, message: { mid: "m2", attachments: [{ type: "audio", payload: { url: "https://cdn/x.mp4" } }] } },
      ],
    }],
  });
  assert.equal(ev[0].payload, "opc:r1:1");
  assert.equal(ev[1].texto, "[audio]");
  assert.deepEqual(ev[1].anexos, [{ tipo: "audio", url: "https://cdn/x.mp4" }]);
});

import { escolherVariante, variantesDe } from "../src/lib/automacao/regras.ts";

test("variações: separadas por linha '---', sorteio cobre todas e texto único volta inteiro", () => {
  const t = "Te mandei no direct 💛\n---\nJá está no seu direct 🫶\n---\nCorre lá no direct 🎯";
  assert.equal(variantesDe(t).length, 3);
  assert.equal(escolherVariante(t, 0), "Te mandei no direct 💛");
  assert.equal(escolherVariante(t, 0.5), "Já está no seu direct 🫶");
  assert.equal(escolherVariante(t, 0.99), "Corre lá no direct 🎯");
  assert.equal(escolherVariante("Oi!\n\nTudo bem?"), "Oi!\n\nTudo bem?");
  assert.equal(escolherVariante(null), "");
});
