import { z } from "zod";

// Validator per un MongoDB ObjectId (24 caratteri esadecimali)
export const MongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID non valido");
