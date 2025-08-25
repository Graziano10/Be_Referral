import { Schema } from "mongoose";
import { TSessionSchema } from "../types";

export const SessionSchema = new Schema<TSessionSchema>(
  {
    profile: {
      type: Schema.Types.ObjectId,
      ref: "Profile", // 👈 nome del model, non "main_profile"
      required: true,
      index: true,
    },
    token: { type: String, required: true, index: true },
    lastAuthorizedIp: { type: String, maxlength: 45, required: true },
    datetime: { type: Date, default: Date.now },
    logoutAt: { type: Date, default: null },
    userAgent: { type: String, default: "" },
  },
  {
    collection: "main_session",
    timestamps: true,
  }
);
