/**
 * Slides do "Carrossel por tema" (que mora no Scanner) salvos na "Minha
 * galeria" daqui (Aline/Juliana, 15/10/2026).
 *
 * O Scanner desenha o slide no navegador (PNG). O arquivo NUNCA passa pelo
 * corpo de uma função da Vercel (limite de 4,5 MB): o Scanner pede aqui uma
 * URL assinada de upload, o navegador sobe direto pro Storage, e só então o
 * Scanner pede pra confirmar. A confirmação confere que o arquivo existe, é
 * imagem e é desta franqueada, e só aí grava a linha em `artes_geradas`.
 *
 * Regras puras, sem Supabase: rodam com
 * `node --experimental-strip-types --test src/lib/galeria/scanner.test.ts`.
 */

export const BUCKET_GALERIA = "franqueadas-assets";
/** Pasta própria, pra nunca colidir com o que o editor de arte salva. */
export const PASTA_CARROSSEL = "carrossel-scanner";
/** Um slide de 1080x1350 em PNG com foto fica bem abaixo disso. */
export const TAMANHO_MAX_SLIDE = 15 * 1024 * 1024;
export const MAX_SLIDES = 20;
export const TIPOS_ACEITOS = ["image/png", "image/jpeg"] as const;

/** Caminho do arquivo do slide, sempre DENTRO da pasta da franqueada. */
export function caminhoSlide(franqueadaId: string, slide: number, agora = Date.now()): string {
  const n = Math.max(1, Math.min(MAX_SLIDES, Math.trunc(slide) || 1));
  return `${franqueadaId}/${PASTA_CARROSSEL}/${agora}_slide${String(n).padStart(2, "0")}.png`;
}

/**
 * 🔴 O `path` da confirmação vem de fora: só passa se for exatamente o
 * formato que `caminhoSlide` gera para ESTA franqueada. Sem isso, um corpo
 * forjado registraria na galeria dela um arquivo de outra conta.
 */
export function caminhoPertence(franqueadaId: string, path: string): boolean {
  if (!franqueadaId || typeof path !== "string") return false;
  const esperado = new RegExp(
    `^${franqueadaId.replace(/[^0-9a-f-]/gi, "")}/${PASTA_CARROSSEL}/\\d{10,}_slide\\d{2}\\.png$`,
  );
  return esperado.test(path);
}

/** Separa a pasta e o nome, pra conferir o arquivo com `storage.list`. */
export function pastaENome(path: string): { pasta: string; nome: string } {
  const i = path.lastIndexOf("/");
  return { pasta: path.slice(0, i), nome: path.slice(i + 1) };
}

/** O arquivo que o Storage listou serve? Devolve o motivo quando não serve. */
export function arquivoServe(meta: { size?: number | null; mimetype?: string | null } | null): string | null {
  if (!meta) return "o arquivo não chegou ao armazenamento";
  const tamanho = Number(meta.size ?? 0);
  if (!tamanho) return "o arquivo chegou vazio";
  if (tamanho > TAMANHO_MAX_SLIDE) return "o arquivo passou do tamanho máximo";
  const tipo = String(meta.mimetype ?? "").toLowerCase();
  if (tipo && !(TIPOS_ACEITOS as readonly string[]).includes(tipo)) return "o arquivo não é imagem";
  return null;
}

/** Título que aparece no card da galeria. */
export function tituloDoSlide(titulo: unknown, slide: number, total: number): string {
  const t = typeof titulo === "string" ? titulo.replace(/\s+/g, " ").trim().slice(0, 140) : "";
  const base = t || "Carrossel por tema";
  const n = Math.max(1, Math.trunc(slide) || 1);
  const tot = Math.max(n, Math.trunc(total) || n);
  return `${base} (slide ${n}/${tot})`;
}
