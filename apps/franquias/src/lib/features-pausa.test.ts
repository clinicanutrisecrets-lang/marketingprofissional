import { test } from "node:test";
import assert from "node:assert/strict";
import { geracaoPausadaParaConta } from "./features.ts";

test("domingo sem geração pras contas internas: Aline, metareview, demos e domínio do Scanner", () => {
  for (const e of [
    "clinicanutrisecrets@gmail.com",
    "clinicanutrisecrets+metareview@gmail.com",
    "demo@scannerdasaude.com",
    " Demo.Nutri@ScannerDaSaude.com ",
    "qualquer@scannerdasaude.com",
  ]) assert.equal(geracaoPausadaParaConta(e), true, e);
  for (const e of ["gleryston@yahoo.com.br", "julimendesnutri@gmail.com", "suporte.vivitavares@gmail.com", "dpianura@gmail.com"])
    assert.equal(geracaoPausadaParaConta(e), false, e);
});
