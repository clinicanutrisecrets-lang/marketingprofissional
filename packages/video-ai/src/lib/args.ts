/**
 * Leitor de argumentos minúsculo e previsível: `--chave valor`, `--chave=valor`,
 * `--flag` (true). Puro, pra ser testado sem processo.
 */
export type Args = { flags: Record<string, string | true>; soltos: string[] };

/**
 * `booleanas`: flags que NUNCA levam valor (ex.: --forcar). Sem isso,
 * `--forcar extra` engoliria "extra" como valor e a flag sairia desligada.
 */
export function lerArgs(argv: string[], booleanas: ReadonlySet<string> = new Set()): Args {
  const flags: Record<string, string | true> = {};
  const soltos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      soltos.push(a);
      continue;
    }
    const semPrefixo = a.slice(2);
    const igual = semPrefixo.indexOf("=");
    if (igual >= 0) {
      flags[semPrefixo.slice(0, igual)] = semPrefixo.slice(igual + 1);
      continue;
    }
    const proximo = argv[i + 1];
    if (!booleanas.has(semPrefixo) && proximo !== undefined && !proximo.startsWith("--")) {
      flags[semPrefixo] = proximo;
      i++;
    } else {
      flags[semPrefixo] = true;
    }
  }
  return { flags, soltos };
}

export function texto(args: Args, chave: string, padrao?: string): string | undefined {
  const v = args.flags[chave];
  if (v === undefined || v === true) return padrao;
  return v;
}

export function ligado(args: Args, chave: string): boolean {
  const v = args.flags[chave];
  return v === true || v === "true" || v === "1";
}

export function numero(args: Args, chave: string, padrao: number): number {
  const v = texto(args, chave);
  if (v === undefined) return padrao;
  const n = Number(v);
  return Number.isFinite(n) ? n : padrao;
}
