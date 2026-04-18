import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

type State = {
  lastRunAt: string | null;   // ISO
  nextRunAt: string | null;   // ISO
  topicHistory: string[];     // slugs em ordem de envio (mais antigo primeiro)
};

const EMPTY: State = { lastRunAt: null, nextRunAt: null, topicHistory: [] };

export function load(): State {
  try {
    const raw = fs.readFileSync(config.paths.state, "utf8");
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

export function save(s: State): void {
  fs.mkdirSync(path.dirname(config.paths.state), { recursive: true });
  fs.writeFileSync(config.paths.state, JSON.stringify(s, null, 2));
}

export function recordSend(topicSlug: string, nextRunAt: Date): void {
  const s = load();
  s.lastRunAt = new Date().toISOString();
  s.nextRunAt = nextRunAt.toISOString();
  s.topicHistory = [...s.topicHistory, topicSlug].slice(-30); // mantém últimos 30
  save(s);
}
