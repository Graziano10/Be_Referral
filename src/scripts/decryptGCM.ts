// src/scripts/decryptGCM.ts
import "dotenv/config";
import crypto from "crypto";

function decryptGCM(payload: string, hexKey: string): string {
  const [ivHex, ctHex, tagHex] = payload.split(":");
  if (!ivHex || !ctHex || !tagHex)
    throw new Error("Formato atteso: iv:ciphertext:tag (hex)");
  const key = Buffer.from(hexKey, "hex");
  if (key.length !== 32)
    throw new Error("BANK_SECRET_KEY deve essere 32 byte (64 hex).");

  const iv = Buffer.from(ivHex, "hex");
  const ct = Buffer.from(ctHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString("utf8");
}

const enc = process.argv[2];
if (!enc) {
  console.error(
    'Uso: npx ts-node src/scripts/decryptGCM.ts "<iv:ciphertext:tag>"'
  );
  process.exit(1);
}

const secret = process.env.BANK_SECRET_KEY || "";
console.log(decryptGCM(enc, secret));
