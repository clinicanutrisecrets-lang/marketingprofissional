/**
 * Cifra de tokens no APP — AES-256-GCM com chave derivada de ENCRYPTION_KEY.
 * Mesmo desenho do app das nutris (apps/franquias/src/lib/security/encrypt.ts).
 *
 * Por que aqui e não no banco: as RPCs de aline/006 dependem de
 * public.encrypt_token (pgsodium), que nunca foi aplicada em produção.
 *
 * Gerar ENCRYPTION_KEY: openssl rand -base64 32
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = "studio_aline_tokens_v1"; // fixo, não sensível
const PREFIXO = "enc1."; // marca o formato — texto sem o prefixo é tratado como legado

let _cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (_cachedKey) return _cachedKey;
  const master = process.env.ENCRYPTION_KEY;
  if (!master) throw new Error("ENCRYPTION_KEY não definida na Vercel do studio-aline");
  _cachedKey = scryptSync(master, SALT, 32) as Buffer;
  return _cachedKey;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIXO}${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function estaCifrado(valor: string | null | undefined): boolean {
  return typeof valor === "string" && valor.startsWith(PREFIXO);
}

/**
 * Descriptografa o formato de encrypt(). Valor SEM o prefixo é devolvido como
 * está (token legado gravado em texto puro por sessões antigas).
 */
export function decrypt(valor: string): string {
  if (!estaCifrado(valor)) return valor;
  const parts = valor.slice(PREFIXO.length).split(".");
  if (parts.length !== 3) throw new Error("Formato de token inválido");
  const [ivB64, authTagB64, encB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
