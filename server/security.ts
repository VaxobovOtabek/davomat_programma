import type { Request, Response, NextFunction } from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { query, type DB } from "./db.js";
import { config } from "./config.js";
export const digest = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (status: number, message: string): never => {
  throw new AppError(status, message);
};
export const asyncRoute =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.davomat_session;
    if (!token) fail(401, "Tizimga kiring.");
    const rows = await query(
      "SELECT u.* FROM davomat.auth_sessions s JOIN davomat.users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.status='active'",
      [digest(token)],
    );
    if (!rows[0]) fail(401, "Sessiya tugagan. Qayta kiring.");
    (req as any).user = rows[0];
    next();
  } catch (e) {
    next(e);
  }
}
export const actor = (req: Request) => (req as any).user as Record<string, any>;
export function manage(u: Record<string, any>) {
  if (!["owner", "admin"].includes(u.role))
    fail(403, "Bu amal uchun ruxsat yo‘q.");
}
export function branchAllowed(u: Record<string, any>, id: string) {
  if (u.role !== "owner" && u.branch_id !== id)
    fail(403, "Bu filial uchun ruxsat yo‘q.");
}
export function safeUser(u: Record<string, any>) {
  const { password_hash, ...rest } = u;
  return rest;
}
export async function audit(
  tx: DB,
  u: Record<string, any>,
  action: string,
  entity: string,
  details: unknown = {},
) {
  await tx.query(
    "INSERT INTO davomat.audit(id,org_id,actor_id,action,entity_id,details) VALUES($1,$2,$3,$4,$5,$6)",
    [randomUUID(), u.org_id, u.id, action, entity, JSON.stringify(details)],
  );
}
export async function lockOrg(tx: DB, u: Record<string, any>) {
  await tx.query(
    "SELECT id FROM davomat.organizations WHERE id=$1 FOR UPDATE",
    [u.org_id],
  );
}
export async function issueSession(res: Response, userId: string) {
  const token = randomBytes(32).toString("hex");
  await query("INSERT INTO davomat.auth_sessions VALUES($1,$2,$3)", [
    digest(token),
    userId,
    new Date(Date.now() + 7 * 86400000).toISOString(),
  ]);
  res.cookie("davomat_session", token, {
    httpOnly: true,
    secure: config.production,
    sameSite: "strict",
    maxAge: 7 * 86400000,
    path: "/",
  });
}
