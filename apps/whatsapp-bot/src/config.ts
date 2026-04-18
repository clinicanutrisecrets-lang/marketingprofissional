import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env ${name} é obrigatória. Veja .env.example.`);
  return v;
}

function num(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Env ${name} precisa ser número`);
  return n;
}

export const config = {
  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  },
  gamma: {
    apiKey: required("GAMMA_API_KEY"),
    themeId: process.env.GAMMA_THEME_ID || "xorjxo3seh6pyiu",
    baseUrl: "https://public-api.gamma.app/v1.0",
  },
  whatsapp: {
    groupId: process.env.WHATSAPP_GROUP_ID || "",
    authDir: path.resolve(__dirname, "..", "data", "auth"),
  },
  schedule: {
    windowStartHour: num("SEND_WINDOW_START_HOUR", 9),
    windowEndHour: num("SEND_WINDOW_END_HOUR", 19),
    minDays: num("SEND_INTERVAL_MIN_DAYS", 2),
    maxDays: num("SEND_INTERVAL_MAX_DAYS", 4),
    tz: process.env.TZ || "America/Sao_Paulo",
  },
  ncbi: {
    email: process.env.NCBI_EMAIL || "contato@scannerdasaude.com",
    apiKey: process.env.NCBI_API_KEY || "",
  },
  paths: {
    state: path.resolve(__dirname, "..", "data", "state.json"),
    ebooks: path.resolve(__dirname, "..", "data", "ebooks"),
  },
  brand: {
    author: "Aline Quissak — CRN 8 10607",
    instaNutri: "https://instagram.com/nutri_secrets",
    instaScanner: "https://instagram.com/scannerdasaude.d",
    palette: {
      primary: "#0BB8A8",
      secondary: "#7C3AED",
      accent: "#F59E0B",
      text: "#1A2E45",
      bg: "#FFFFFF",
    },
    aboutAuthor: `Nutricionista e empresária renomada, com mais de 9 especializações internacionais e uma carreira que abrange Brasil e Canadá, além de consultorias para empresas nos EUA, Alemanha e Espanha. Com mais de 9 mil pacientes atendidos e um investimento de mais de 5 milhões de reais em pesquisa científica própria sobre genética, microbiota e o poder terapêutico dos alimentos e compostos bioativos, Aline é referência em inovação e ciência nutricional.

Graduada em Nutrição pela Universidade Federal de Alfenas (MG) e em Applied Human Nutrition pela University of Guelph, Canadá.

**Especializações**

Com qualificações em Oncologia, Síndrome Metabólica, Pacientes Críticos, Pediatria, Fitoterapia, Nutrição Esportiva, Nutrigenética, Nutrição Funcional e Psicologia da Nutrição, adquiridas no Canadá e nos EUA, Aline combina uma base científica sólida com a aplicação prática em áreas de alta complexidade e demanda.

**Mestrado em Genética e Bioquímica — Espanha**

Dedicada a desvendar as interações genéticas e bioquímicas para intervenções nutricionais, Aline traz à prática clínica uma visão pioneira sobre a individualidade biológica.`,
    aboutScanner: `**Scanner da Saúde** — software para nutricionistas.

O único sistema que vai além de macros, micros e calorias — e faz correlação clínica real entre **genética, microbiota e exames laboratoriais**, entregando diagnóstico de precisão com sinergia nutricional de alimentos e compostos bioativos.`,
  },
} as const;
