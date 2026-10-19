import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query, transaction, type DB } from "../db.js";
import {
  actor,
  asyncRoute,
  audit,
  branchAllowed,
  fail,
  lockOrg,
  manage,
} from "../security.js";
import { distanceM } from "../domain.js";
export const attendanceRouter = Router();
const uuid = z.string().uuid();
const evidenceInput = z.object({
  challenge_id: uuid,
  media_id: uuid,
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0),
    captured_at: z.string().datetime(),
  }),
  offline: z.boolean().default(false),
});
async function evidence(
  tx: DB,
  u: Record<string, any>,
  body: unknown,
  branchId: string,
) {
  const b = evidenceInput.parse(body);
  const c = (
    await tx.query(
      "SELECT * FROM davomat.challenges WHERE id=$1 AND user_id=$2 AND used=false AND expires_at>now()",
      [b.challenge_id, u.id],
    )
  )[0];
  if (!c) fail(400, "Tasdiqlash muddati tugadi. Qayta selfi oling.");
  const m = (
    await tx.query(
      "SELECT * FROM davomat.evidence WHERE id=$1 AND user_id=$2 AND kind='selfie' AND used=false AND created_at>now()-interval '10 minutes'",
      [b.media_id, u.id],
    )
  )[0];
  if (!m) fail(400, "Yangi selfi talab qilinadi.");
  const branch = (
    await tx.query("SELECT * FROM davomat.branches WHERE id=$1 AND org_id=$2", [
      branchId,
      u.org_id,
    ])
  )[0];
  const distance = distanceM(
    branch.latitude,
    branch.longitude,
    b.location.latitude,
    b.location.longitude,
  );
  const age = Math.abs(Date.now() - Date.parse(b.location.captured_at));
  const reason = b.offline
    ? "Oflayn yuborilgan dalil"
    : age > 60000
      ? "Lokatsiya eskirgan"
      : b.location.accuracy > branch.max_accuracy_m
        ? "Lokatsiya aniqligi past"
        : distance > branch.radius_m
          ? "Filial radiusidan tashqarida"
          : null;
  await tx.query("UPDATE davomat.challenges SET used=true WHERE id=$1", [c.id]);
  await tx.query("UPDATE davomat.evidence SET used=true WHERE id=$1", [m.id]);
  return {
    mediaId: m.id,
    location: {
      ...b.location,
      distance_m: Math.round(distance),
      received_at: new Date().toISOString(),
    },
    reason,
  };
}
async function owned(tx: DB, id: string, u: Record<string, any>) {
  const a = (
    await tx.query(
      "SELECT * FROM davomat.attendance WHERE id=$1 AND org_id=$2",
      [id, u.org_id],
    )
  )[0];
  if (!a) fail(404, "Davomat topilmadi.");
  branchAllowed(u, a.branch_id);
  if (u.role === "teacher" && a.teacher_id !== u.id)
    fail(403, "Bu sizning darsingiz emas.");
  return a;
}
async function operation(
  req: any,
  action: (tx: DB, u: Record<string, any>) => Promise<any>,
) {
  const u = actor(req);
  const key = z.string().min(8).max(100).parse(req.headers["idempotency-key"]);
  return transaction(async (tx) => {
    await lockOrg(tx, u);
    const previous = (
      await tx.query(
        "SELECT * FROM davomat.operations WHERE user_id=$1 AND key=$2",
        [u.id, key],
      )
    )[0];
    if (previous) {
      if (previous.route !== req.path)
        fail(409, "So‘rov kaliti boshqa amalga tegishli.");
      return previous.result;
    }
    const result = await action(tx, u);
    await tx.query("INSERT INTO davomat.operations VALUES($1,$2,$3,$4)", [
      u.id,
      key,
      req.path,
      JSON.stringify(result),
    ]);
    return result;
  });
}
attendanceRouter.post(
  "/evidence/challenge",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    if (u.role !== "teacher") fail(403, "Faqat ustoz davomat boshlaydi.");
    const id = randomUUID();
    await query("INSERT INTO davomat.challenges VALUES($1,$2,$3,false)", [
      id,
      u.id,
      new Date(Date.now() + 600000).toISOString(),
    ]);
    res.json({ id });
  }),
);
attendanceRouter.post(
  "/attendance/start",
  asyncRoute(async (req, res) => {
    res.json(
      await operation(req, async (tx, u) => {
        if (u.role !== "teacher") fail(403, "Faqat ustoz davomat boshlaydi.");
        const lessonId = uuid.parse(req.body.lesson_id);
        const l = (
          await tx.query(
            "SELECT * FROM davomat.lessons WHERE id=$1 AND teacher_id=$2 AND org_id=$3 AND status='scheduled'",
            [lessonId, u.id, u.org_id],
          )
        )[0];
        if (!l) fail(404, "Dars topilmadi.");
        if (
          Date.now() < Date.parse(l.starts_at) - 30 * 60000 ||
          Date.now() > Date.parse(l.ends_at) + 30 * 60000
        )
          fail(400, "Dars faqat jadval vaqtiga yaqin boshlanadi (±30 daqiqa).");
        if (
          (
            await tx.query(
              "SELECT id FROM davomat.attendance WHERE teacher_id=$1 AND state IN('active','paused')",
              [u.id],
            )
          ).length
        )
          fail(409, "Avval faol darsni yakunlang.");
        const e = await evidence(tx, u, req.body, l.branch_id);
        const r = (
          await tx.query(
            "SELECT hourly_rate FROM davomat.rates WHERE user_id=$1 AND effective_from<=($2::timestamptz AT TIME ZONE 'Asia/Tashkent')::date ORDER BY effective_from DESC LIMIT 1",
            [u.id, l.starts_at],
          )
        )[0];
        if (!r) fail(400, "Admin siz uchun soatlik stavka belgilashi kerak.");
        const id = randomUUID();
        await tx.query(
          "INSERT INTO davomat.attendance(id,org_id,branch_id,teacher_id,lesson_id,state,approval,started_at,planned_start,planned_end,hourly_rate,reason,start_evidence,start_location) VALUES($1,$2,$3,$4,$5,'active','pending',now(),$6,$7,$8,$9,$10,$11)",
          [
            id,
            u.org_id,
            l.branch_id,
            u.id,
            l.id,
            l.starts_at,
            l.ends_at,
            r.hourly_rate,
            e.reason,
            e.mediaId,
            JSON.stringify(e.location),
          ],
        );
        await audit(tx, u, "attendance_started", id);
        return { id };
      }),
    );
  }),
);
attendanceRouter.post(
  "/attendance/:id/:action",
  (req, _res, next) => {
    if (!["pause", "resume", "finish"].includes(String(req.params.action)))
      return next("route");
    next();
  },
  asyncRoute(async (req, res) => {
    const action = z
      .enum(["pause", "resume", "finish"])
      .parse(req.params.action);
    res.json(
      await operation(req, async (tx, u) => {
        const a = await owned(tx, uuid.parse(req.params.id), u);
        if (a.teacher_id !== u.id) fail(403, "Faqat dars ustoziga ruxsat.");
        const now = new Date().toISOString();
        const breaks = a.breaks as { start: string; end: string | null }[];
        if (action === "pause") {
          if (a.state !== "active") fail(409, "Dars faol emas.");
          breaks.push({ start: now, end: null });
          await tx.query(
            "UPDATE davomat.attendance SET state='paused',breaks=$1,version=version+1 WHERE id=$2",
            [JSON.stringify(breaks), a.id],
          );
        } else if (action === "resume") {
          if (a.state !== "paused") fail(409, "Dars tanaffusda emas.");
          breaks[breaks.length - 1]!.end = now;
          await tx.query(
            "UPDATE davomat.attendance SET state='active',breaks=$1,version=version+1 WHERE id=$2",
            [JSON.stringify(breaks), a.id],
          );
        } else {
          if (!["active", "paused"].includes(a.state))
            fail(409, "Dars allaqachon yakunlangan.");
          const e = await evidence(tx, u, req.body, a.branch_id);
          if (a.state === "paused") breaks[breaks.length - 1]!.end = now;
          const reason = a.reason || e.reason;
          await tx.query(
            "UPDATE davomat.attendance SET state='completed',ended_at=$1,breaks=$2,end_evidence=$3,end_location=$4,reason=$5,approval=$6,version=version+1 WHERE id=$7",
            [
              now,
              JSON.stringify(breaks),
              e.mediaId,
              JSON.stringify(e.location),
              reason,
              reason ? "pending" : "approved",
              a.id,
            ],
          );
        }
        await audit(tx, u, "attendance_" + action, a.id);
        return { id: a.id };
      }),
    );
  }),
);
attendanceRouter.get(
  "/attendance",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    const rows = await query(
      "SELECT a.*,l.subject,l.group_name,l.room,u.first_name,u.last_name FROM davomat.attendance a JOIN davomat.lessons l ON l.id=a.lesson_id JOIN davomat.users u ON u.id=a.teacher_id WHERE a.org_id=$1 AND ($2='owner' OR a.branch_id=$3) AND ($2<>'teacher' OR a.teacher_id=$4) ORDER BY a.started_at DESC LIMIT 1000",
      [u.org_id, u.role, u.branch_id, u.id],
    );
    res.json(
      rows.map((a) => {
        if (u.role === "accountant") {
          delete a.start_location;
          delete a.end_location;
          delete a.start_evidence;
          delete a.end_evidence;
        }
        return a;
      }),
    );
  }),
);
attendanceRouter.post(
  "/attendance/:id/review",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    const b = z
      .object({
        approval: z.enum(["approved", "rejected"]),
        reason: z.string().min(3).max(1000),
      })
      .parse(req.body);
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const a = await owned(tx, uuid.parse(req.params.id), u);
      if (a.state !== "completed")
        fail(409, "Avval darsni yakunlang yoki vaqtni tuzating.");
      await tx.query(
        "UPDATE davomat.attendance SET approval=$1,reason=$2,version=version+1 WHERE id=$3",
        [b.approval, b.reason, a.id],
      );
      await audit(tx, u, "attendance_reviewed", a.id, b);
    });
    res.json({ ok: true });
  }),
);
attendanceRouter.post(
  "/corrections",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    const b = z
      .object({
        attendance_id: uuid,
        proposed_start: z.string().datetime(),
        proposed_end: z.string().datetime(),
        reason: z.string().min(5).max(1000),
      })
      .parse(req.body);
    if (Date.parse(b.proposed_end) <= Date.parse(b.proposed_start))
      fail(400, "Tugash boshlanishdan keyin bo‘lsin.");
    await transaction(async (tx) => {
      const a = await owned(tx, b.attendance_id, u);
      if (u.role === "accountant") fail(403, "Ruxsat yo‘q.");
      await tx.query(
        "INSERT INTO davomat.corrections(id,org_id,user_id,attendance_id,proposed_start,proposed_end,reason) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          randomUUID(),
          u.org_id,
          u.id,
          a.id,
          b.proposed_start,
          b.proposed_end,
          b.reason,
        ],
      );
    });
    res.json({ ok: true });
  }),
);
attendanceRouter.get(
  "/corrections",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    if (u.role === "accountant") fail(403, "Ruxsat yo‘q.");
    res.json(
      await query(
        "SELECT c.*,u.first_name,u.last_name FROM davomat.corrections c JOIN davomat.attendance a ON a.id=c.attendance_id JOIN davomat.users u ON u.id=a.teacher_id WHERE c.org_id=$1 AND ($2='owner' OR a.branch_id=$3) AND ($2<>'teacher' OR a.teacher_id=$4) ORDER BY c.created_at DESC LIMIT 200",
        [u.org_id, u.role, u.branch_id, u.id],
      ),
    );
  }),
);
attendanceRouter.post(
  "/corrections/:id/review",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    const b = z
      .object({ approve: z.boolean(), reason: z.string().min(3).max(1000) })
      .parse(req.body);
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const c = (
        await tx.query(
          "SELECT * FROM davomat.corrections WHERE id=$1 AND org_id=$2 AND status='pending'",
          [uuid.parse(req.params.id), u.org_id],
        )
      )[0];
      if (!c) fail(404, "So‘rov topilmadi.");
      const a = await owned(tx, c.attendance_id, u);
      if (b.approve) {
        if (
          (
            await tx.query(
              "SELECT id FROM davomat.attendance WHERE teacher_id=$1 AND id<>$2 AND state<>'cancelled' AND started_at<$3 AND COALESCE(ended_at,now())>$4",
              [a.teacher_id, a.id, c.proposed_end, c.proposed_start],
            )
          ).length
        )
          fail(409, "Tuzatilgan vaqt boshqa dars bilan kesishadi.");
        await tx.query(
          "UPDATE davomat.attendance SET started_at=$1,ended_at=$2,state='completed',approval='approved',reason=$3,version=version+1 WHERE id=$4",
          [c.proposed_start, c.proposed_end, b.reason, a.id],
        );
      }
      await tx.query(
        "UPDATE davomat.corrections SET status=$1,reviewer_id=$2,review_reason=$3 WHERE id=$4",
        [b.approve ? "approved" : "rejected", u.id, b.reason, c.id],
      );
      await audit(tx, u, "correction_reviewed", c.id, {
        ...b,
        before: { start: a.started_at, end: a.ended_at },
        after: { start: c.proposed_start, end: c.proposed_end },
      });
    });
    res.json({ ok: true });
  }),
);
