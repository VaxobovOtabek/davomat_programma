import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import Decimal from "decimal.js";
import ExcelJS from "exceljs";
import { query, transaction } from "../db.js";
import {
  actor,
  asyncRoute,
  audit,
  branchAllowed,
  fail,
  lockOrg,
} from "../security.js";
import { minutesInWindow, amountFor, monthWindow, csvCell } from "../domain.js";
export const payrollRouter = Router();
const month = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const uuid = z.string().uuid();
function access(u: Record<string, any>) {
  if (!["owner", "admin", "accountant"].includes(u.role))
    fail(403, "Hisoblashga ruxsat yo‘q.");
}
async function getRun(id: string, u: Record<string, any>) {
  const run = (
    await query("SELECT * FROM davomat.payroll WHERE id=$1 AND org_id=$2", [
      id,
      u.org_id,
    ])
  )[0];
  if (!run) fail(404, "Hisobot topilmadi.");
  if (u.role !== "owner" && run.branch_id !== u.branch_id)
    fail(403, "Filial mos emas.");
  return run;
}
payrollRouter.get(
  "/payroll",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    const m = month.parse(
      req.query.month || new Date().toISOString().slice(0, 7),
    );
    const rows = await query(
      "SELECT * FROM davomat.payroll WHERE org_id=$1 AND month=$2 AND ($3='owner' OR branch_id=$4) ORDER BY created_at DESC",
      [u.org_id, m, u.role, u.branch_id],
    );
    res.json(
      rows.map((r) => ({
        ...r,
        items:
          u.role === "teacher"
            ? r.items.filter((i: any) => i.teacher_id === u.id)
            : r.items,
      })),
    );
  }),
);
payrollRouter.post(
  "/payroll/calculate",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    access(u);
    const b = z.object({ month, branch_id: uuid }).parse(req.body);
    branchAllowed(u, b.branch_id);
    const w = monthWindow(b.month);
    const id = randomUUID();
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const rows = await tx.query(
        "SELECT a.*,u.first_name,u.last_name,l.subject FROM davomat.attendance a JOIN davomat.users u ON u.id=a.teacher_id JOIN davomat.lessons l ON l.id=a.lesson_id WHERE a.org_id=$1 AND a.branch_id=$2 AND a.started_at<$3 AND COALESCE(a.ended_at,a.planned_end)>$4",
        [u.org_id, b.branch_id, w.end, w.start],
      );
      const items = new Map<string, any>();
      for (const a of rows) {
        if (a.approval !== "approved" || a.state !== "completed") continue;
        const minutes = minutesInWindow(
          a.started_at,
          a.ended_at,
          a.planned_start,
          a.planned_end,
          a.breaks,
          w.start,
          w.end,
        );
        const amount = amountFor(minutes, a.hourly_rate);
        const item = items.get(a.teacher_id) || {
          teacher_id: a.teacher_id,
          name: a.first_name + " " + a.last_name,
          minutes: 0,
          base: "0",
          bonus: "0",
          deduction: "0",
          adjustment_reason: "",
          total: "0",
          lessons: [],
        };
        item.minutes += minutes;
        item.base = new Decimal(item.base).add(amount).toFixed(6);
        item.total = new Decimal(item.base).toFixed(0);
        item.lessons.push({
          attendance_id: a.id,
          version: a.version,
          subject: a.subject,
          start: a.started_at,
          end: a.ended_at,
          minutes,
          rate: a.hourly_rate,
          amount,
        });
        items.set(a.teacher_id, item);
      }
      const v = (
        await tx.query(
          "SELECT COALESCE(max(version),0)+1 v FROM davomat.payroll WHERE org_id=$1 AND branch_id=$2 AND month=$3",
          [u.org_id, b.branch_id, b.month],
        )
      )[0].v;
      await tx.query(
        "INSERT INTO davomat.payroll(id,org_id,branch_id,month,version,items,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id,
          u.org_id,
          b.branch_id,
          b.month,
          v,
          JSON.stringify([...items.values()]),
          u.id,
        ],
      );
      await audit(tx, u, "payroll_calculated", id, {
        month: b.month,
        version: v,
      });
    });
    res.json({ id });
  }),
);
payrollRouter.patch(
  "/payroll/:id/adjust",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    access(u);
    const run = await getRun(uuid.parse(req.params.id), u);
    const b = z
      .object({
        teacher_id: uuid,
        bonus: z.coerce.number().min(0).max(1000000000),
        deduction: z.coerce.number().min(0).max(1000000000),
        reason: z.string().min(3).max(1000),
      })
      .parse(req.body);
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const fresh = (
        await tx.query("SELECT * FROM davomat.payroll WHERE id=$1 FOR UPDATE", [
          run.id,
        ])
      )[0];
      if (fresh.state === "locked")
        fail(409, "Yopilgan hisobotni o‘zgartirib bo‘lmaydi.");
      const item = fresh.items.find((i: any) => i.teacher_id === b.teacher_id);
      if (!item) fail(404, "Ustoz satri topilmadi.");
      item.bonus = String(b.bonus);
      item.deduction = String(b.deduction);
      item.adjustment_reason = b.reason;
      item.total = new Decimal(item.base)
        .add(b.bonus)
        .sub(b.deduction)
        .toFixed(0);
      await tx.query(
        "UPDATE davomat.payroll SET items=$1,state='draft' WHERE id=$2",
        [JSON.stringify(fresh.items), run.id],
      );
      await audit(tx, u, "payroll_adjusted", run.id, b);
    });
    res.json({ ok: true });
  }),
);
payrollRouter.post(
  "/payroll/:id/lock",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    access(u);
    const run = await getRun(uuid.parse(req.params.id), u);
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const fresh = (
        await tx.query("SELECT * FROM davomat.payroll WHERE id=$1 FOR UPDATE", [
          run.id,
        ])
      )[0];
      if (fresh.state === "locked") return;
      const w = monthWindow(run.month);
      const rows = await tx.query(
        "SELECT * FROM davomat.attendance WHERE org_id=$1 AND branch_id=$2 AND started_at<$3 AND COALESCE(ended_at,planned_end)>$4",
        [u.org_id, run.branch_id, w.end, w.start],
      );
      if (
        rows.some(
          (a) =>
            a.approval === "pending" || ["active", "paused"].includes(a.state),
        )
      )
        fail(409, "Avval tekshiruvdagi va ochiq darslarni hal qiling.");
      const saved = fresh.items.flatMap((i: any) => i.lessons);
      const approved = rows.filter(
        (a) => a.approval === "approved" && a.state === "completed",
      );
      if (
        saved.length !== approved.length ||
        approved.some(
          (a) =>
            !saved.some(
              (s: any) => s.attendance_id === a.id && s.version === a.version,
            ),
        )
      )
        fail(409, "Davomat o‘zgargan. Hisobotni qayta hisoblang.");
      await tx.query(
        "UPDATE davomat.payroll SET state='locked',locked_at=now() WHERE id=$1",
        [run.id],
      );
      await audit(tx, u, "payroll_locked", run.id);
    });
    res.json({ ok: true });
  }),
);
payrollRouter.get(
  "/payroll/:id/export",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    access(u);
    const run = await getRun(uuid.parse(req.params.id), u);
    const rows = [
      [
        "Davomat",
        run.month,
        "Asia/Tashkent",
        "Hisobot ID",
        run.id,
        "Versiya",
        run.version,
        "Holat",
        run.state,
      ],
      ["Ustoz", "Daqiqa", "Hisoblangan", "Bonus", "Ushlab qolish", "Jami"],
      ...run.items.map((i: any) => [
        i.name,
        i.minutes,
        i.base,
        i.bonus,
        i.deduction,
        i.total,
      ]),
    ];
    await audit({ query }, u, "payroll_exported", run.id);
    if (req.query.format === "xlsx") {
      const book = new ExcelJS.Workbook();
      book.creator = "Davomat";
      const sheet = book.addWorksheet("Oylik");
      sheet.addRows(rows);
      sheet.getRow(2).font = { bold: true };
      sheet.columns.forEach((col) => {
        col.width = 24;
      });
      const details = book.addWorksheet("Darslar");
      details.addRow([
        "Ustoz",
        "Davomat ID",
        "Fan",
        "Boshlanish",
        "Tugash",
        "Daqiqa",
        "Stavka",
        "Summa",
      ]);
      for (const i of run.items)
        for (const l of i.lessons)
          details.addRow([
            i.name,
            l.attendance_id,
            l.subject,
            l.start,
            l.end,
            l.minutes,
            l.rate,
            l.amount,
          ]);
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="davomat-' + run.month + '.xlsx"',
      );
      res
        .type(
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        .send(Buffer.from(await book.xlsx.writeBuffer()));
    } else {
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="davomat-' + run.month + '.csv"',
      );
      res
        .type("text/csv; charset=utf-8")
        .send(
          "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"),
        );
    }
  }),
);
