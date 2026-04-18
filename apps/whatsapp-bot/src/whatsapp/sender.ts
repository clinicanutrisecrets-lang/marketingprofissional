import type { WASocket } from "@whiskeysockets/baileys";
import fs from "node:fs";
import path from "node:path";

export async function sendEbook(
  sock: WASocket,
  groupId: string,
  caption: string,
  pdfPath: string
): Promise<void> {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF não encontrado: ${pdfPath}`);
  }

  // Primeiro a mensagem-caption, pra aparecer na notificação
  await sock.sendMessage(groupId, { text: caption });

  // Pequeno delay humano antes do anexo
  await sleep(randomBetween(2500, 5500));

  const fileName = path.basename(pdfPath);
  await sock.sendMessage(groupId, {
    document: fs.readFileSync(pdfPath),
    mimetype: "application/pdf",
    fileName,
  });

  console.log(`[whatsapp] enviado "${fileName}" pro grupo ${groupId}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
