/**
 * O aviso "seus conteúdos ficaram prontos" passou a aparecer em DUAS telas
 * (Aline, 22/09/2026): o painel do Marketing e o dashboard do SCANNER. O que
 * estes testes travam:
 *
 *   • a leitura do banco vive em UM arquivo só. Se o painel e a rota que o
 *     Scanner chama consultassem por conta própria, um dia divergiriam — e o
 *     sintoma seria o Scanner avisando sobre semana já aprovada;
 *   • a rota do Scanner exige HMAC e é SOMENTE LEITURA: ela não pode fazer
 *     nascer franqueada porque alguém abriu o dashboard do outro app;
 *   • conta que não existe aqui devolve `aviso: null`, não erro — é o estado
 *     normal de quem acabou de assinar e ainda não entrou no Marketing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DB = readFileSync("src/lib/conteudo/aviso-pronto-db.ts", "utf8");
/** O arquivo sem comentário — comentário explica o que NÃO fazer e não é código. */
const semComentario = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const ROTA = readFileSync("src/app/api/integrations/scanner/conteudo-pronto/route.ts", "utf8");
const PAINEL = readFileSync("src/app/dashboard/page.tsx", "utf8");

test("a leitura do banco vive num arquivo só, e o painel usa ELA", () => {
  assert.match(PAINEL, /import \{ montarAvisoPronto \} from "@\/lib\/conteudo\/aviso-pronto-db"/);
  assert.ok(
    !/async function montarAvisoPronto/.test(PAINEL),
    "o painel voltou a ter a própria consulta — duas cópias divergem caladas",
  );
  assert.match(ROTA, /import \{ montarAvisoPronto \} from "@\/lib\/conteudo\/aviso-pronto-db"/);
});

test("a contagem de posts sai de posts_agendados, nunca de total_posts", () => {
  assert.match(DB, /from\("posts_agendados"\)/);
  assert.ok(
    !semComentario(DB).includes("total_posts"),
    "total_posts fica em 0 em quase toda linha — a contagem é real ou não é",
  );
});

test("a rota do Scanner exige HMAC com o segredo que já existe entre os dois", () => {
  assert.match(ROTA, /SCANNER_WEBHOOK_SECRET/);
  assert.match(ROTA, /x-scanner-signature/);
  assert.match(ROTA, /timingSafeEqual/);
  assert.match(ROTA, /status: 401/);
});

test("a rota do Scanner é SOMENTE LEITURA", () => {
  // `.update(` do createHmac não conta: o que não pode é escrita no banco.
  const semSupabase = semComentario(ROTA).replace(/createHmac\([^)]*\)\.update\([^)]*\)/g, "");
  for (const escrita of [".insert(", ".update(", ".upsert(", ".delete("]) {
    assert.ok(!semSupabase.includes(escrita), `a rota não pode ${escrita} — ela só responde uma pergunta`);
  }
});

test("franqueada inexistente devolve aviso null, não erro", () => {
  assert.match(ROTA, /if \(!franqueadaId\) return NextResponse\.json\(\{ aviso: null \}\)/);
});

test("acha por vínculo primeiro e por e-mail depois, como o /sso", () => {
  const iVinculo = ROTA.indexOf('.eq("scanner_saas_user_id"');
  const iEmail = ROTA.indexOf('.eq("email"');
  assert.ok(iVinculo > 0 && iEmail > iVinculo, "a ordem tem que ser vínculo → e-mail");
});
