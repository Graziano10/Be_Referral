// src/modules/auth/password.utils.ts
import crypto from "crypto";

/** Verifica formato: pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex> */
export function verifyPbkdf2Sha256Password(
  plain: string,
  stored: string
): boolean {
  try {
    const [scheme, iterationsStr, saltHex, hashHex] = stored.split("$");
    if (scheme !== "pbkdf2_sha256") return false;

    const iterations = Number(iterationsStr);
    if (!Number.isInteger(iterations) || iterations <= 0) return false;

    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = crypto.pbkdf2Sync(
      plain,
      salt,
      iterations,
      expected.length,
      "sha256"
    );
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
