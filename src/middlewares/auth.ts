import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = { profileId: string; sub?: string; roles?: string[] };
export type AuthRequest<T = any> = Request<{}, any, T> & { user?: AuthUser };

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const h = req.header("authorization") || req.header("Authorization");
  if (!h || !h.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Missing or invalid Authorization header" });
  }
  const token = h.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (!payload?.profileId) {
      return res.status(401).json({ message: "Missing profile context" });
    }
    req.user = {
      profileId: String(payload.profileId),
      sub: payload.sub,
      roles: payload.roles,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
