/**
 * 🔴 Login sem recuperação é um beco.
 *
 * Aconteceu duas vezes com a mesma pessoa: no app das franqueadas em 08/09/2026
 * e no Studio em 12/10/2026. Nos dois, a conta tinha nascido pelo SSO do
 * Scanner (sem senha escolhida por ela), a tela só sabia e-mail e senha, e o
 * único retorno possível era "Invalid login credentials". Sem saída.
 *
 * Estas travas valem pra QUALQUER tela de login que nascer aqui.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function arquivosComLoginDeSenha(dir: string, achados: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) { arquivosComLoginDeSenha(caminho, achados); continue; }
    if (!/\.(ts|tsx)$/.test(e.name)) continue;
    if (readFileSync(caminho, "utf8").includes("signInWithPassword")) achados.push(caminho);
  }
  return achados;
}

test("toda tela que pede senha oferece recuperação", () => {
  const telas = arquivosComLoginDeSenha("src");
  assert.ok(telas.length > 0, "nenhuma tela de login encontrada: a varredura quebrou");
  for (const tela of telas) {
    const fonte = readFileSync(tela, "utf8");
    assert.match(
      fonte,
      /\/recuperar-senha/,
      `${tela} pede senha e não oferece "Esqueci minha senha". Isso é o beco.`,
    );
  }
});

test("as duas pontas da recuperação existem", () => {
  assert.ok(existsSync("src/app/recuperar-senha/page.tsx"), "falta pedir o link");
  assert.ok(existsSync("src/app/nova-senha/page.tsx"), "falta a tela de definir a senha");
});

test("o link da recuperação volta pro próprio domínio", () => {
  const fonte = readFileSync("src/app/recuperar-senha/page.tsx", "utf8");
  assert.match(fonte, /resetPasswordForEmail/);
  // Endereço escrito à mão manda a pessoa pro app errado quando o domínio muda.
  assert.match(
    fonte,
    /redirectTo:\s*`\$\{window\.location\.origin\}\/nova-senha`/,
    "o destino tem que sair de window.location.origin",
  );
});

test("recuperar senha não exige estar logada", () => {
  // O gate do middleware é por prefixo. Se um desses prefixos cobrir as telas
  // de senha, quem esqueceu a senha é mandada pro login, que é de onde veio.
  const fonte = readFileSync("src/lib/supabase/middleware.ts", "utf8");
  const prefixos = [...fonte.matchAll(/pathname\.startsWith\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(prefixos.length > 0, "não achei os prefixos protegidos no middleware");
  for (const rota of ["/recuperar-senha", "/nova-senha"]) {
    for (const p of prefixos) {
      assert.ok(!rota.startsWith(p), `${rota} caiu no gate "${p}" e vira redirect pro login`);
    }
  }
});
