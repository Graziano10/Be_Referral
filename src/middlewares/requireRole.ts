// src/middlewares/requireRole.ts
import { Request, Response, NextFunction } from "express";

/**
 * Middleware per autorizzare in base ai ruoli.
 * Usa i ruoli salvati nel JWT (req.auth.role).
 */
export function requireRole(role: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.auth?.role || [];
    if (!role.some((r) => userRoles.includes(r))) {
      return res.status(403).json({
        status: "Forbidden",
        message: "Non hai i permessi per accedere a questa risorsa",
      });
    }
    next();
  };
}
