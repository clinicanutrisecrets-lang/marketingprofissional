import fs from "node:fs";
import path from "node:path";
import { PASTA_DATASETS } from "./config.ts";
import { manifestoVazio, type Formato, type Manifesto } from "./regras.ts";

export function pastaDoDataset(nome: string): string {
  return path.join(PASTA_DATASETS, nome);
}

export function arquivoManifesto(nome: string): string {
  return path.join(pastaDoDataset(nome), "dataset.json");
}

export function lerManifesto(nome: string, formato: Formato, trigger: string): Manifesto {
  const arq = arquivoManifesto(nome);
  if (!fs.existsSync(arq)) return manifestoVazio(nome, formato, trigger);
  const m = JSON.parse(fs.readFileSync(arq, "utf8")) as Manifesto;
  m.entradas ??= [];
  m.pacotes ??= [];
  return m;
}

export function salvarManifesto(m: Manifesto): void {
  m.atualizado_em = new Date().toISOString();
  fs.mkdirSync(pastaDoDataset(m.dataset), { recursive: true });
  fs.writeFileSync(arquivoManifesto(m.dataset), JSON.stringify(m, null, 2) + "\n");
}
