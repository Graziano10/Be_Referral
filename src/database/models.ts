import mongoose from "mongoose";
import { ProfileSchema } from "./schemas/profile.schema";
import { SessionSchema } from "./schemas/session.schema";
import {
  TAuth_userSchema,
  TBankAccountDoc,
  TProfileSchema,
  TSessionSchema,
} from "./types";
import { Auth_userSchema } from "./schemas/auth_user.schema";

export const Profile = mongoose.model<TProfileSchema>(
  "Profile",
  ProfileSchema
  // , "main_profile"
);

export const Session = mongoose.model<TSessionSchema>(
  "Session",
  SessionSchema
  // , "main_session"
);

export const AuthUser = mongoose.model<TAuth_userSchema>(
  "AuthUser",
  Auth_userSchema
  // , "auth_user"
);
