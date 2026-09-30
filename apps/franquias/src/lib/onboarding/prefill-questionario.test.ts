/**
 * O questionário único do Scanner fecha o cadastro de 10 passos daqui
 * (Aline, 30/09/2026: "a pessoa responde uma vez só").
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  arquivosDoQuestionario,
  mapearPerfilScanner,
  obrigatoriosFaltando,
  questionarioConcluido,
} from "./prefill.ts";

const AQUI = import.meta.dirname;

// O que o Scanner manda hoje na ativação (montarPerfilMarketing + paraPerfilMarketing).
const PERFIL = {
  nome: "Fulana",
  sobrenome: "de Tal",
  whatsapp: "5571999999999",
  nicho: "Nutrição de precisão para mulheres: Intestino",
  publico_alvo: "mulheres, de 30 a 50 anos",
  cor_marca: "#0abfbc",
  instagram: "@dra.fulana",
  q_tom: "acolhedor",
  q_estilo_visual: "premium_escuro",
  q_modalidade: "ambos",
  q_historia: "Minha mãe…",
  q_transformacao: "Uma paciente voltou a dormir.",
  q_diferencial: "Olho o caso inteiro.",
  q_atendimentos: "2.000+",
  q_cidade: "Salvador",
  q_uf: "ba",
  q_queixas: "intestinal,hormonal_feminino,inflamacao",
  q_link_agendamento: "https://wa.me/5571999999999",
  q_nome_comercial: "Dra. Fulana",
  q_foto_url: "https://x.supabase.co/storage/v1/object/public/avatars/u/avatar-1.jpg",
  q_tem_depoimentos: "false",
  q_concluido: "true",
};

test("as respostas do questionário viram as colunas do assistente, no vocabulário daqui", () => {
  const c = mapearPerfilScanner(PERFIL);
  assert.equal(c.tom_comunicacao, "empatico_acolhedor");
  assert.equal(c.estilo_visual, "premium_escuro");
  assert.equal(c.modalidade_atendimento, "hibrido");
  assert.equal(c.historia_pessoal, "Minha mãe…");
  assert.equal(c.resultado_transformacao, "Uma paciente voltou a dormir.");
  assert.equal(c.numero_pacientes_atendidos, 2000);
  assert.equal(c.estado, "BA");
  assert.equal(c.nome_comercial, "Dra. Fulana", "o nome que ela assina vence o nome civil");
  assert.equal(c.nicho_principal, "autoimune_intestino", "a queixa vence o palpite pelo texto do nicho");
  assert.equal(c.nicho_secundario, "saude_feminina");
  assert.equal(c.aprovacao_modo, "semanal_bloco");
  assert.equal(c.tem_depoimentos, false);
});

test("valor fora das opções daqui não entra (e nada quebra)", () => {
  const c = mapearPerfilScanner({ q_tom: "gritado", q_estilo_visual: "neon", q_uf: "XX", q_link_agendamento: "javascript:alert(1)", q_atendimentos: "muitos" });
  for (const k of ["tom_comunicacao", "estilo_visual", "estado", "link_agendamento", "numero_pacientes_atendidos"]) assert.equal(c[k], undefined, k);
});

test("sem o questionário concluído, só pré-preenche: o modo de aprovação fica pra ela escolher", () => {
  const c = mapearPerfilScanner({ ...PERFIL, q_concluido: "false" });
  assert.equal(c.aprovacao_modo, undefined);
  assert.equal(questionarioConcluido({ ...PERFIL, q_concluido: "false" }), false);
  assert.equal(questionarioConcluido(PERFIL), true);
});

test("com o questionário inteiro, não falta nada do assistente (Instagram não trava)", () => {
  const linha = { email: "f@x.com", ...mapearPerfilScanner(PERFIL) };
  assert.deepEqual(obrigatoriosFaltando(linha), []);
  const semHistoria = { ...linha, historia_pessoal: "" };
  assert.deepEqual(obrigatoriosFaltando(semHistoria), ["historia_pessoal"]);
});

test("logo e foto do questionário viram arquivos; link que não é https fica de fora", () => {
  assert.deepEqual(arquivosDoQuestionario(PERFIL), [{ tipo: "foto_profissional", url: PERFIL.q_foto_url }]);
  assert.deepEqual(arquivosDoQuestionario({ q_logo_url: "file:///IMG.jpg" }), []);
});

test("o SSO fecha o cadastro pelo mesmo miolo do botão Concluir", () => {
  const sso = readFileSync(join(AQUI, "../../app/sso/route.ts"), "utf8");
  assert.match(sso, /if \(r\.podeFechar\) \{\s*const fechou = await concluirOnboarding\(admin, franq\.id\)/);
  const actions = readFileSync(join(AQUI, "actions.ts"), "utf8");
  assert.match(actions, /await concluirOnboarding\(admin,/);
  // A semana vai pra função própria: promessa solta morre quando a resposta sai.
  const concluir = readFileSync(join(AQUI, "concluir.ts"), "utf8");
  assert.match(concluir, /\/api\/cron\/gerar-semanas\/uma/);
  assert.doesNotMatch(concluir, /void Promise\.allSettled/);
});

test("reenvio do Scanner não rebaixa um onboarding já concluído", () => {
  const src = readFileSync(join(AQUI, "../../app/api/onboarding/iniciar/route.ts"), "utf8");
  assert.match(src, /ex\.status === "onboarding_concluido" \? \{\} : \{ status: "token_gerado" \}/);
});
