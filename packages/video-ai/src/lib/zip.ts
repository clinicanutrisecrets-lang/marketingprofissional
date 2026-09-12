import fs from "node:fs";
import archiver from "archiver";

/** Zipa a pasta preparada (arquivos na raiz do zip, como o trainer espera). */
export function zipar(pasta: string, destino: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const saida = fs.createWriteStream(destino);
    const arq = archiver("zip", { zlib: { level: 6 } });
    saida.on("close", () => resolve(arq.pointer()));
    arq.on("error", reject);
    arq.pipe(saida);
    arq.directory(pasta, false);
    void arq.finalize();
  });
}
