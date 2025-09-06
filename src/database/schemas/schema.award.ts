import { TMainAwardSchema } from "database/types";
import { Schema, model, Types } from "mongoose";

const mainAwardSchema = new Schema<TMainAwardSchema>(
  {
    title: { type: String, trim: true, default: undefined },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: undefined,
    },

    points: { type: Number, required: true, min: 0 },

    assignedTo: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "Profile", required: true },

    redeemed: { type: Boolean, default: false },
    redeemedAt: { type: Date },

    // 👇 Nuovi campi per pagamento
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const MainAward = model<TMainAwardSchema>("main_award", mainAwardSchema);
