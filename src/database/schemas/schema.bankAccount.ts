import {
  Schema,
  model,
  Types,
  Document,
  HydratedDocument,
  Model,
} from "mongoose";
import crypto from "crypto";

/* ===== crypto key (lazy init) ===== */
function ensureEnvKey(): Buffer {
  const hex = process.env.BANK_SECRET_KEY;
  if (!hex)
    throw new Error(
      "BANK_SECRET_KEY env var is required (64 hex chars for 32 bytes)."
    );
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32)
    throw new Error("BANK_SECRET_KEY must be 32 bytes (64 hex chars).");
  return key;
}
let AES_KEY: Buffer | null = null;
function getKey(): Buffer {
  if (AES_KEY) return AES_KEY;
  AES_KEY = ensureEnvKey();
  return AES_KEY;
}

/* ===== utils ===== */
function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}
function isIbanValid(iban: string): boolean {
  return /^[A-Z]{2}[0-9A-Z]{13,32}$/.test(iban);
}
function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

/** AES-256-GCM encryption: returns iv:ciphertext:tag (all hex) */
function encryptGCM(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${enc.toString("hex")}:${tag.toString("hex")}`;
}
function decryptGCM(payload: string): string {
  const [ivHex, ctHex, tagHex] = payload.split(":");
  if (!ivHex || !ctHex || !tagHex) throw new Error("Invalid ciphertext format");
  const iv = Buffer.from(ivHex, "hex");
  const ct = Buffer.from(ctHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString("utf8");
}

/* ===== types ===== */
export interface BankAccountDoc extends Document {
  profileId: Types.ObjectId; // <-- coerente con i tuoi types
  holderName: string;
  email: string;
  iban_enc: string; // ciphertext (mai esposto)
  iban_hash: string; // sha256(normalized IBAN) per unique/lookup
  bic?: string;
  bankName?: string;
  country?: string; // ISO 3166-1 alpha-2
  currency?: string; // ISO 4217
  createdAt: Date;
  updatedAt: Date;

  // helpers
  getPlainIban(): string; // decifra a runtime (da usare con cautela)
  maskedIban: string; // virtual per risposte API
}

interface BankAccountModel extends Model<BankAccountDoc> {
  findByIban(iban: string): Promise<HydratedDocument<BankAccountDoc> | null>;
  existsByIban(iban: string): Promise<boolean>;
}

/* ===== schema ===== */
const BankAccountSchema = new Schema<BankAccountDoc, BankAccountModel>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    holderName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      index: true,
      validate: {
        validator: (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid email format",
      },
    },
    // NON salvare iban in chiaro. Usiamo questi due campi:
    iban_enc: { type: String, required: true, select: false },
    iban_hash: { type: String, required: true },
    bic: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: (v: string) =>
          !v || /^[A-Z0-9]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(v),
        message: "Invalid BIC/SWIFT format",
      },
    },
    bankName: { type: String, trim: true, maxlength: 150 },
    country: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
      default: "EUR",
    },
  },
  {
    collection: "main_bankAccounts", // <-- QUI (livello root delle options)
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id?.toString?.() ?? ret.id;
        Reflect.deleteProperty(ret, "_id");
        Reflect.deleteProperty(ret, "iban_enc");
        Reflect.deleteProperty(ret, "iban_hash");
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ===== virtuals & methods ===== */
BankAccountSchema.virtual("maskedIban").get(function (this: BankAccountDoc) {
  return "****IBAN_PROTETTO****";
});

BankAccountSchema.methods.getPlainIban = function (
  this: BankAccountDoc
): string {
  if (!this.iban_enc)
    throw new Error("iban_enc not selected; use .select('+iban_enc').");
  return decryptGCM(this.iban_enc);
};

/* ===== statics ===== */
BankAccountSchema.statics.findByIban = function (iban: string) {
  const norm = normalizeIban(iban);
  if (!isIbanValid(norm)) return Promise.resolve(null);
  const hash = sha256Hex(norm);
  return this.findOne({ iban_hash: hash });
};
BankAccountSchema.statics.existsByIban = async function (iban: string) {
  const norm = normalizeIban(iban);
  if (!isIbanValid(norm)) return false;
  const hash = sha256Hex(norm);
  const exists = await this.exists({ iban_hash: hash });
  return !!exists;
};

/* ===== middleware ===== */
// accetta `iban` virtual in create/save
(BankAccountSchema as any)
  .virtual("iban")
  .set(function (this: BankAccountDoc, raw: string) {
    const norm = normalizeIban(raw);
    (this as any)._iban_plain_input = norm;
  });

BankAccountSchema.pre("validate", function (next) {
  // @ts-ignore
  const norm: string | undefined = this._iban_plain_input;
  if (norm !== undefined) {
    if (!isIbanValid(norm)) return next(new Error("Invalid IBAN format"));
    (this as any).iban_hash = sha256Hex(norm);
    (this as any).iban_enc = encryptGCM(norm);
    // @ts-ignore
    delete this._iban_plain_input;
  }
  next();
});

function handleUpdateEncryption(this: any, next: Function) {
  const update = this.getUpdate() || {};
  const rawIban = update.iban ?? (update.$set && update.$set.iban) ?? undefined;

  if (rawIban !== undefined) {
    const s = String(rawIban).trim();
    if (!s) return next(new Error("Invalid IBAN format"));
    const norm = normalizeIban(s);
    if (!isIbanValid(norm)) return next(new Error("Invalid IBAN format"));

    const patch = { iban_enc: encryptGCM(norm), iban_hash: sha256Hex(norm) };

    delete update.iban;
    if (update.$set) {
      delete update.$set.iban;
      update.$set = { ...update.$set, ...patch };
    } else {
      update.$set = patch;
    }
    this.setUpdate(update);
  }
  next();
}
BankAccountSchema.pre("findOneAndUpdate", handleUpdateEncryption);
BankAccountSchema.pre("updateOne", handleUpdateEncryption);
BankAccountSchema.pre("updateMany", handleUpdateEncryption);

// cifra anche in bulk insert
BankAccountSchema.pre("insertMany", function (next, docs: any[]) {
  try {
    for (const d of docs) {
      const raw = (d as any).iban;
      if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
        const norm = normalizeIban(String(raw));
        if (!isIbanValid(norm)) throw new Error("Invalid IBAN format");
        (d as any).iban_hash = sha256Hex(norm);
        (d as any).iban_enc = encryptGCM(norm);
        delete (d as any).iban;
      }
    }
    next();
  } catch (e) {
    next(e as any);
  }
});

/* ===== indexes ===== */
// Unicità globale:
BankAccountSchema.index({ profileId: 1, iban_hash: 1 }, { unique: true });
// In alternativa (SE preferisci per-utente):
// BankAccountSchema.index({ profileId: 1, iban_hash: 1 }, { unique: true });

export const BankAccount = model<BankAccountDoc, BankAccountModel>(
  "BankAccount",
  BankAccountSchema,
  "main_bankAccounts" // nome collection forzato
);
