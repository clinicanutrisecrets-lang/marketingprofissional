/**
 * Token encryption helper — AES-256-GCM com key derivada de ENCRYPTION_KEY.
 * Não é tão robusto quanto pgsodium, mas funciona com uma env var só e
 * é suficiente até migrarmos pra vault do Supabase.
 *
 * Gerar ENCRYPTION_KEY: openssl rand -base64 32
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = "scanner_saude_franquia_v1"; // fixo — não sensível

// FIX 7: Cache derived key so scryptSync runs only once per process
let _cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (_cachedKey) return _cachedKey;
  const master = process.env.ENCRYPTION_KEY;
  if (!master) {
    throw new Error("ENCRYPTION_KEY env var não definida");
  }
  _cachedKey = scryptSync(master, SALT, 32) as Buffer;
  return _cachedKey;
}

/**
 * Criptografa uma string. Retorna formato: iv.authTag.ciphertext em base64.
 */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

/**
 * Descriptografa uma string no formato retornado por encrypt().
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(".");
  if (parts.length !== 3) throw new Error("Formato de token inválido");
  const [ivB64, authTagB64, encB64] = parts;
  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
