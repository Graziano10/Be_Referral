// src/utils/decryptIban.ts
import crypto from "crypto";

export function decryptIban(payload: string, hexKey: string): string {
  const [ivHex, ctHex, tagHex] = payload.split(":");
  if (!ivHex || !ctHex || !tagHex)
    throw new Error("Formato atteso: iv:ciphertext:tag (hex)");

  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32)
    throw new Error("Chiave segreta deve essere lunga 32 byte (64 hex)");

  const iv = Buffer.from(ivHex, "hex");
  const ct = Buffer.from(ctHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString("utf8");
}
