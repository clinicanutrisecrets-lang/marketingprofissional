import { config } from "./config.js";
import { connect } from "./whatsapp/client.js";
import { sendEbook } from "./whatsapp/sender.js";
import { pickNextTopic } from "./content/topics.js";
import { searchAndFetch } from "./content/pubmed.js";
import { generate } from "./content/generator.js";
import { generateEbookPdf } from "./ebook/gamma.js";
import { computeNextRun, startScheduler } from "./scheduler/index.js";
import { load, recordSend } from "./scheduler/state.js";
import type { WASocket } from "@whiskeysockets/baileys";

async function runOnce(sock: WASocket): Promise<void> {
  if (!config.whatsapp.groupId) {
    throw new Error(
      "WHATSAPP_GROUP_ID não configurado. Rode `pnpm list-groups`, copie o ID e cole no .env."
    );
  }

  const state = load();
  const topic = pickNextTopic(state.topicHistory);
  console.log(`[pipeline] tópico escolhido: ${topic.slug} (${topic.pillar})`);

  // 1. PubMed
  console.log("[pipeline] buscando evidência no PubMed...");
  const articles = await searchAndFetch(topic.pubmedQuery, 6);
  console.log(`[pipeline] ${articles.length} artigos com abstract utilizável`);

  if (articles.length < 2) {
    throw new Error(`Evidência insuficiente (${articles.length} artigos) — abortando.`);
  }

  // 2. Claude gera conteúdo (ebook + caption)
  console.log("[pipeline] gerando ebook + caption com Claude...");
  const content = await generate(topic, articles);

  // 3. Gamma cria PDF
  console.log("[pipeline] gerando PDF no Gamma...");
  const { pdfPath, gammaUrl } = await generateEbookPdf(content.title, content.ebookInput);
  console.log(`[pipeline] PDF pronto: ${pdfPath} (${gammaUrl})`);

  // 4. WhatsApp
  console.log("[pipeline] enviando pro grupo...");
  await sendEbook(sock, config.whatsapp.groupId, content.whatsappCaption, pdfPath);

  // 5. Agenda próximo
  const next = computeNextRun();
  recordSend(topic.slug, next);
  console.log(`[pipeline] feito. Próximo envio: ${next.toLocaleString("pt-BR")}`);
}

async function main() {
  const sendNow = process.argv.includes("--now");

  console.log("[bot] conectando ao WhatsApp...");
  const sock = await connect();

  if (sendNow) {
    console.log("[bot] modo --now: enviando imediatamente e saindo.");
    await runOnce(sock);
    process.exit(0);
  }

  console.log("[bot] scheduler ativo. Ctrl+C pra parar.");
  startScheduler(() => runOnce(sock));
}

main().catch((e) => {
  console.error("[bot] erro fatal:", e);
  process.exit(1);
});
