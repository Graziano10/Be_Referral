// src/routes/profile.routes.ts
import { Router } from "express";
import {
  validateAssignRole,
  validateDeleteProfile,
  validateGetProfile,
  validateListProfiles,
  validateLogin,
  validateRegisterProfile,
  validateUpdateProfile,
} from "../validators/profile.validators";
import { registerProfile } from "../models/profile/postProfile.controller";
import {
  loginDashboard,
  loginRegister,
} from "../models/profile/auth/login.controller";
import { listProfiles } from "../models/controllers/getProfile.controller";
import { getProfileById } from "../models/controllers/getProfileById.controller";
import { authorizeToken } from "../middlewares/authorizeToken";
import { deleteProfile } from "../models/profile/deleteProfile.controller";
import { updateProfile } from "../models/profile/updateProfile.controller";
import { requireRole } from "../middlewares/requireRole";
import { assignRole } from "../models/controllers/assignRoles.controller";

export const profileRoutes = Router();

// POST /profile/register  (nel server lo monti con app.use("/profile", profileRoutes))
profileRoutes.post("/register", validateRegisterProfile(), registerProfile);

// CRM Register → tutti
profileRoutes.post("/login", validateLogin(), loginRegister);

// CRM Dashboard → solo admin/superAdmin
profileRoutes.post("/login/auth", validateLogin(), loginDashboard);

// PROFILE ROUTES
profileRoutes.get(
  "/:profileId",
  authorizeToken,
  validateGetProfile(),
  getProfileById
);

profileRoutes.put(
  "/:profileId",
  authorizeToken,
  validateUpdateProfile(),
  updateProfile
);

// DASHBOARD ADMIN ROUTES

profileRoutes.get(
  "/",
  authorizeToken,
  requireRole(["admin", "superAdmin"]),
  validateListProfiles(),
  listProfiles
);

profileRoutes.delete(
  "/:profileId",
  authorizeToken,
  requireRole(["admin", "superAdmin"]),
  validateDeleteProfile(),
  deleteProfile
);

profileRoutes.put(
  "/:profileId/role",
  authorizeToken,
  requireRole(["admin", "superAdmin"]),
  validateAssignRole(),
  assignRole
);
