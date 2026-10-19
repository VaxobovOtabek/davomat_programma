import { Router } from "express";
import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";
import { query, transaction } from "../db.js";
import {
  actor,
  asyncRoute,
  authenticate,
  digest,
  fail,
  issueSession,
  audit,
} from "../security.js";
export const authRouter = Router();
const password = z.string().min(8).max(128);
authRouter.post(
  "/auth/login",
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        login: z.string().regex(/^[0-9]{8}$/),
        password: z.string().min(1).max(128),
      })
      .parse(req.body);
    for (const key of ["login:" + body.login, "ip:" + (req.ip || "unknown")]) {
      const rows = await query(
        "INSERT INTO davomat.login_attempts(key,count,window_start) VALUES($1,1,now()) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN davomat.login_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE davomat.login_attempts.count+1 END,window_start=CASE WHEN davomat.login_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE davomat.login_attempts.window_start END RETURNING count",
        [key],
      );
      if (rows[0].count > (key.startsWith("ip:") ? 100 : 10))
        fail(429, "Ko‘p urinish. 15 daqiqadan keyin qayta urinib ko‘ring.");
    }
    const user = (
      await query("SELECT * FROM davomat.users WHERE login=$1", [body.login])
    )[0];
    if (
      !user ||
      user.status !== "active" ||
      !(await verify(user.password_hash, body.password))
    )
      fail(401, "Login yoki parol noto‘g‘ri.");
    await issueSession(res, user.id);
    res.json({ ok: true });
  }),
);
authRouter.post(
  "/auth/logout",
  authenticate,
  asyncRoute(async (req, res) => {
    await query("DELETE FROM davomat.auth_sessions WHERE token_hash=$1", [
      digest(req.cookies.davomat_session),
    ]);
    res.clearCookie("davomat_session", { path: "/" });
    res.json({ ok: true });
  }),
);
authRouter.post(
  "/auth/change-password",
  authenticate,
  asyncRoute(async (req, res) => {
    const body = z
      .object({ currentPassword: z.string().optional(), newPassword: password })
      .parse(req.body);
    const u = actor(req);
    if (body.currentPassword && !(await verify(u.password_hash, body.currentPassword)))
      fail(400, "Joriy parol noto‘g‘ri.");
    const encoded = await hash(body.newPassword, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await transaction(async (tx) => {
      await tx.query(
        "UPDATE davomat.users SET password_hash=$1,must_change_password=false WHERE id=$2",
        [encoded, u.id],
      );
      await tx.query("DELETE FROM davomat.auth_sessions WHERE user_id=$1", [
        u.id,
      ]);
      await audit(tx, u, "password_changed", u.id);
    });
    await issueSession(res, u.id);
    res.json({ ok: true });
  }),
);
