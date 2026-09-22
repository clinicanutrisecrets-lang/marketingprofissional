// Resolve import sem extensão (./x → ./x.ts) para os scripts que rodam o
// código do repo direto com `node --experimental-strip-types`.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(especificador, contexto, proximo) {
  if (especificador.startsWith(".") && !/\.[a-z]+$/.test(especificador)) {
    const base = new URL(especificador, contexto.parentURL);
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      const tentativa = new URL(base.href + ext);
      if (existsSync(fileURLToPath(tentativa))) {
        return { url: pathToFileURL(fileURLToPath(tentativa)).href, shortCircuit: true };
      }
    }
  }
  return proximo(especificador, contexto);
}
