import { HydratedDocument, Model, ObjectId, Types } from "mongoose";
import { ITALIAN_REGIONS } from "validators/profile.validators";

/********** PROFILE *********/

export type ProfileRole = "user" | "admin" | "superAdmin";

export type TProfileSchema = {
  _id: Types.ObjectId;
  user_id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;

  // address
  city?: string;
  cap?: string;
  codFiscale?: string;
  street?: string;

  // company
  isCompany: boolean;
  vatNumber?: string;
  businessName?: string;
  headquartersAddress?: string;
  ceoName?: string;

  region?: (typeof ITALIAN_REGIONS)[number];

  referralCode?: string;
  referredBy?: string | null;
  referralsCount: number;

  signed: boolean;
  signedAt?: Date | null;
  verified: boolean;
  newsletter: boolean;

  role: ProfileRole;

  dateJoined: Date;
  lastLogin?: Date;
  lastLogout?: Date;
  lastActivity?: Date;

  createdAt?: Date;
  updatedAt?: Date;
};

/********** SESSION *********/
export type TSessionSchema = {
  _id: ObjectId;
  profile: ObjectId; // ref -> Profile._id
  token: string;
  lastAuthorizedIp: string;
  datetime: Date;
  logoutAt?: Date | null;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
};

/********** AUTH USER *********/
export type TAuth_userSchema = {
  _id: ObjectId;
  id: number;
  username: string;
  password: string;
  last_login?: Date;
  first_name?: string;
  last_name?: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: Date;
};

/********** BANK ACCOUNT *********/
/** Campi realmente persistiti (DB shape) */
export type TBankAccountPersisted = {
  _id: Types.ObjectId;
  profileId: Types.ObjectId; // ref -> Profile._id
  holderName: string;
  iban_enc: string; // cifrato (select:false nello schema)
  iban_hash: string; // sha256(IBAN normalizzato) per unique/lookup
  bic?: string;
  bankName?: string;
  country?: string; // ISO 3166-1 alpha-2 (es. "IT")
  currency?: string; // ISO 4217 (es. "EUR")
  createdAt: Date;
  updatedAt: Date;
};

/** Virtuals NON persistiti */
export type TBankAccountVirtuals = {
  maskedIban: string;
};

/** Metodi di istanza */
export interface TBankAccountMethods {
  /** Decifra a runtime: richiede `.select('+iban_enc')` */
  getPlainIban(): string;
}

/** Documento Mongoose (istanza completa) */
export type TBankAccountDoc = HydratedDocument<
  TBankAccountPersisted & TBankAccountVirtuals,
  TBankAccountMethods
>;

/** Modello Mongoose (statiche) */
export interface TBankAccountModel
  extends Model<TBankAccountPersisted, {}, TBankAccountMethods> {
  findByIban(iban: string): Promise<TBankAccountDoc | null>;
  existsByIban(iban: string): Promise<boolean>;
}

/** Tipo per `.lean()` (niente metodi, include virtuals se `virtuals: true`) */
export type TBankAccountLean = Omit<
  TBankAccountPersisted & Partial<TBankAccountVirtuals>,
  "iban_enc" | "iban_hash"
> & { id: string };

/** Tipo input per create/update lato service (accetta IBAN in chiaro come virtual) */
export type TBankAccountInput = {
  profileId: Types.ObjectId;
  holderName: string;
  iban: string; // in chiaro, lo intercetta il middleware e cifra
  bic?: string;
  bankName?: string;
  country?: string;
  currency?: string;
};

/********** MAIN_AWARDS *********/
export type TMainAwardSchema = {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  points: number; // valore o costo in punti
  assignedTo: Types.ObjectId; // ref Profile (user che riceve)
  assignedBy: Types.ObjectId; // ref Profile (admin/superAdmin che assegna)
  redeemed: boolean; // true se riscattato
  redeemedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  paid: boolean;
  paidAt?: Date | null;
};
