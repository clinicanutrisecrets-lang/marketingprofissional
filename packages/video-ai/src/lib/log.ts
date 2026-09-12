/** Saída de terminal em português, sem dependência. */
export const log = {
  info: (m: string) => console.log(m),
  ok: (m: string) => console.log(`✔ ${m}`),
  aviso: (m: string) => console.warn(`⚠ ${m}`),
  erro: (m: string) => console.error(`✖ ${m}`),
  passo: (m: string) => console.log(`\n▶ ${m}`),
};
