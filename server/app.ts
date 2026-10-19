import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { ZodError } from "zod";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";
import { isAllowedOrigin } from "./origin.js";
import {
  AppError,
  authenticate,
  asyncRoute,
  actor,
  safeUser,
  fail,
} from "./security.js";
import { query } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { attendanceRouter } from "./routes/attendance.js";
import { payrollRouter } from "./routes/payroll.js";
const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json({ limit: "3mb" }));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", (req, _res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.origin;
    if (!isAllowedOrigin(origin, config.origin, config.production))
      return next(new AppError(403, "So‘rov manbasiga ruxsat yo‘q."));
  }
  next();
});
app.get(
  "/api/v1/health",
  asyncRoute(async (_req, res) => {
    await query("SELECT 1");
    res.json({
      ok: true,
      storage: config.databaseUrl ? "postgres" : "local-postgres",
    });
  }),
);
app.use("/api/v1", authRouter);
app.use("/api/v1", authenticate);
app.get(
  "/api/v1/me",
  asyncRoute(async (req, res) => {
    res.json(safeUser(actor(req)));
  }),
);
app.use("/api/v1", adminRouter, attendanceRouter, payrollRouter);
app.use("/api", (_req, res) =>
  res.status(404).json({ message: "API topilmadi." }),
);
app.use(
  (
    error: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const requestId = randomUUID();
    if (error instanceof ZodError)
      return res.status(400).json({
        message: "Maydonlarni tekshiring.",
        fields: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
        requestId,
      });
    if (error instanceof AppError)
      return res
        .status(error.status)
        .json({ message: error.message, requestId });
    if (error?.code === "23505")
      return res
        .status(409)
        .json({ message: "Bunday yozuv allaqachon mavjud.", requestId });
    console.error("API error", requestId, error?.message);
    res.status(error?.status === 413 ? 413 : 500).json({
      message:
        error?.status === 413
          ? "Fayl hajmi katta."
          : "Server xatosi. Qayta urinib ko‘ring.",
      requestId,
    });
  },
);
export default app;
