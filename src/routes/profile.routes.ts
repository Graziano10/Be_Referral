// src/routes/profile.routes.ts
import { Router } from "express";
import {
  validateGetProfile,
  validateListProfiles,
  validateLogin,
  validateRegisterProfile,
} from "../validators/profile.validators";
import { registerProfile } from "../models/profile/postProfile.controller";
import { login } from "../models/profile/auth/login.controller";
import { listProfiles } from "../models/controllers/getProfile.controller";
import { getProfileById } from "../models/controllers/getProfileById.controller";

export const profileRoutes = Router();

// POST /profile/register  (nel server lo monti con app.use("/profile", profileRoutes))
profileRoutes.post("/register", validateRegisterProfile(), registerProfile);

profileRoutes.post("/login", validateLogin(), login);

profileRoutes.get("/", validateListProfiles(), listProfiles);

profileRoutes.get("/:profileId", validateGetProfile(), getProfileById);
