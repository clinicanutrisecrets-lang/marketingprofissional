import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import fs from "node:fs";
import { config } from "../config.js";

const logger = pino({ level: "warn" });

export async function connect(): Promise<WASocket> {
  fs.mkdirSync(config.whatsapp.authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(config.whatsapp.authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: ["Studio Aline Bot", "Chrome", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on("creds.update", saveCreds);

  return new Promise((resolve, reject) => {
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("\nEscaneie o QR abaixo com o WhatsApp do celular:");
        console.log("(Celular → Configurações → Aparelhos conectados → Conectar aparelho)\n");
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        console.log("[whatsapp] conectado como", sock.user?.id);
        resolve(sock);
      }

      if (connection === "close") {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        if (loggedOut) {
          console.error(
            "[whatsapp] sessão deslogada. Apague data/auth/ e rode novamente pra escanear o QR."
          );
          reject(new Error("WhatsApp logged out"));
        } else {
          console.warn(`[whatsapp] conexão caiu (code=${code}). Reconectando...`);
          connect().then(resolve, reject);
        }
      }
    });
  });
}

export async function listGroups(sock: WASocket): Promise<
  Array<{ id: string; subject: string; size: number }>
> {
  const groups = await sock.groupFetchAllParticipating();
  return Object.values(groups).map((g) => ({
    id: g.id,
    subject: g.subject,
    size: g.participants.length,
  }));
}
