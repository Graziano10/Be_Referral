import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthCtx = {
  profileId: string;
  email?: string;
  sub?: string;
  role?: string[];
};

export type AuthUser = { profileId: string; sub?: string; role?: string[] };
export type AuthRequest<
  P = {},
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = Request<P, ResBody, ReqBody, ReqQuery> & { user?: AuthCtx };

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
    req.auth = {
      profileId: String(payload.profileId),
      email: payload.email,
    };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
