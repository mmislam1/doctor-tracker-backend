import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";

export interface AuthenticatedRequest extends Request {
  authUser?: { id: string; role?: string | string[] | null };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Authentication is required" } });
      return;
    }
    (req as AuthenticatedRequest).authUser = {
      id: session.user.id,
      role: (session.user as typeof session.user & { role?: string | string[] | null }).role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = (req as AuthenticatedRequest).authUser?.role;
  const roles = Array.isArray(role) ? role : (role ?? "").split(",").map((value) => value.trim());
  if (!roles.includes("admin")) {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Administrator access is required" } });
    return;
  }
  next();
}
