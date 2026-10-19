import { Router } from "express";
import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { z } from "zod";
import { query, transaction } from "../db.js";
import {
  actor,
  asyncRoute,
  audit,
  branchAllowed,
  fail,
  lockOrg,
  manage,
  safeUser,
} from "../security.js";
import { saveImage, readImage } from "../media.js";
import { autoCompleteLessons } from "./attendance.js";
export const adminRouter = Router();
const uuid = z.string().uuid();

// Editing is only allowed before attendance exists; historical lesson snapshots remain intact.
adminRouter.patch(
  "/lessons/:id",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    const id = uuid.parse(req.params.id),
      b = lessonInput.parse(req.body);
    branchAllowed(u, b.branch_id);
    if (
      Date.parse(b.ends_at) <= Date.parse(b.starts_at) ||
      Date.parse(b.ends_at) - Date.parse(b.starts_at) > 12 * 3600000
    )
      fail(400, "Dars vaqti noto‘g‘ri.");
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const old = (
        await tx.query(
          "SELECT * FROM davomat.lessons WHERE id=$1 AND org_id=$2",
          [id, u.org_id],
        )
      )[0];
      if (!old) fail(404, "Dars topilmadi.");
      branchAllowed(u, old.branch_id);
      if (
        (
          await tx.query(
            "SELECT id FROM davomat.attendance WHERE lesson_id=$1",
            [id],
          )
        ).length
      )
        fail(409, "Davomat boshlangan dars jadvali tahrirlanmaydi.");
      if (
        !(
          await tx.query(
            "SELECT id FROM davomat.users WHERE id=$1 AND org_id=$2 AND branch_id=$3 AND role='teacher' AND status='active'",
            [b.teacher_id, u.org_id, b.branch_id],
          )
        )[0]
      )
        fail(400, "Faol ustoz va filial mos emas.");
      if (
        (
          await tx.query(
            "SELECT id FROM davomat.lessons WHERE id<>$1 AND org_id=$2 AND status='scheduled' AND starts_at<$3 AND ends_at>$4 AND (teacher_id=$5 OR (branch_id=$6 AND room=$7))",
            [
              id,
              u.org_id,
              b.ends_at,
              b.starts_at,
              b.teacher_id,
              b.branch_id,
              b.room,
            ],
          )
        ).length
      )
        fail(409, "Ustoz yoki xona bu vaqtda band.");
      await tx.query(
        "UPDATE davomat.lessons SET teacher_id=$1,branch_id=$2,subject=$3,group_name=$4,room=$5,starts_at=$6,ends_at=$7 WHERE id=$8",
        [
          b.teacher_id,
          b.branch_id,
          b.subject,
          b.group_name,
          b.room,
          b.starts_at,
          b.ends_at,
          id,
        ],
      );
      await audit(tx, u, "lesson_updated", id, { before: old, after: b });
    });
    res.json({ ok: true });
  }),
);

const text = z.string().trim().min(1).max(120);
const userInput = z.object({
  first_name: text,
  last_name: text,
  position: text,
  login: z.string().regex(/^[0-9]{8}$/),
  role: z.enum(["owner", "admin", "teacher", "accountant"]),
  branch_id: uuid,
  avatar_id: uuid.nullable().optional(),
  hourly_rate: z.coerce.number().min(0).max(100000000),
  rate_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  password: z.string().min(8).max(128).optional(),
});
adminRouter.get(
  "/users",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    if (u.role === "teacher") fail(403, "Ruxsat yo‘q.");
    const rows = await query(
      "SELECT u.*, (SELECT hourly_rate FROM davomat.rates r WHERE r.user_id=u.id AND effective_from<=CURRENT_DATE ORDER BY effective_from DESC LIMIT 1) hourly_rate FROM davomat.users u WHERE u.org_id=$1 AND ($2::text='owner' OR u.branch_id=$3) ORDER BY u.created_at DESC",
      [u.org_id, u.role, u.branch_id],
    );
    res.json(rows.map(safeUser));
  }),
);
adminRouter.post(
  "/users",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    const b = userInput.parse(req.body);
    if (!b.password) fail(400, "Boshlang‘ich parolni kiriting.");
    if (u.role !== "owner" && b.role === "owner")
      fail(403, "Egasi rolini bera olmaysiz.");
    branchAllowed(u, b.branch_id);
    const encoded = await hash(b.password!, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const id = randomUUID();
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      if (
        !(
          await tx.query(
            "SELECT id FROM davomat.branches WHERE id=$1 AND org_id=$2",
            [b.branch_id, u.org_id],
          )
        )[0]
      )
        fail(400, "Filial topilmadi.");
      if (
        b.avatar_id &&
        !(
          await tx.query(
            "SELECT id FROM davomat.evidence WHERE id=$1 AND user_id=$2 AND kind='avatar'",
            [b.avatar_id, u.id],
          )
        )[0]
      )
        fail(400, "Rasm sizga tegishli emas.");
      await tx.query(
        "INSERT INTO davomat.users(id,org_id,branch_id,login,password_hash,first_name,last_name,position,role,avatar_id,must_change_password) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false)",
        [
          id,
          u.org_id,
          b.branch_id,
          b.login,
          encoded,
          b.first_name,
          b.last_name,
          b.position,
          b.role,
          b.avatar_id || null,
        ],
      );
      await tx.query("INSERT INTO davomat.rates VALUES($1,$2,$3,$4)", [
        randomUUID(),
        id,
        b.rate_date,
        b.hourly_rate,
      ]);
      await audit(tx, u, "user_created", id, { login: b.login, role: b.role });
    });
    res.status(201).json({ id });
  }),
);
adminRouter.patch(
  "/users/:id",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    const b = userInput.parse(req.body),
      id = uuid.parse(req.params.id);
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const old = (
        await tx.query(
          "SELECT * FROM davomat.users WHERE id=$1 AND org_id=$2",
          [id, u.org_id],
        )
      )[0];
      if (!old) fail(404, "Foydalanuvchi topilmadi.");
      branchAllowed(u, old.branch_id);
      branchAllowed(u, b.branch_id);
      if (u.role !== "owner" && (b.role === "owner" || old.role === "owner"))
        fail(403, "Ruxsat yo‘q.");
      if (
        old.role === "owner" &&
        b.role !== "owner" &&
        (
          await tx.query(
            "SELECT id FROM davomat.users WHERE org_id=$1 AND role='owner' AND status='active'",
            [u.org_id],
          )
        ).length < 2
      )
        fail(400, "Oxirgi egasining rolini o‘zgartirib bo‘lmaydi.");
      if (
        !(
          await tx.query(
            "SELECT id FROM davomat.branches WHERE id=$1 AND org_id=$2",
            [b.branch_id, u.org_id],
          )
        )[0]
      )
        fail(400, "Filial topilmadi.");
      if (
        b.avatar_id &&
        b.avatar_id !== old.avatar_id &&
        !(
          await tx.query(
            "SELECT id FROM davomat.evidence WHERE id=$1 AND user_id=$2 AND kind='avatar'",
            [b.avatar_id, u.id],
          )
        )[0]
      )
        fail(400, "Rasm sizga tegishli emas.");
      await tx.query(
        "UPDATE davomat.users SET first_name=$1,last_name=$2,position=$3,login=$4,role=$5,branch_id=$6,avatar_id=$7 WHERE id=$8",
        [
          b.first_name,
          b.last_name,
          b.position,
          b.login,
          b.role,
          b.branch_id,
          b.avatar_id || null,
          id,
        ],
      );
      await tx.query(
        "INSERT INTO davomat.rates VALUES($1,$2,$3,$4) ON CONFLICT(user_id,effective_from) DO UPDATE SET hourly_rate=excluded.hourly_rate",
        [randomUUID(), id, b.rate_date, b.hourly_rate],
      );
      if (
        old.login !== b.login ||
        old.role !== b.role ||
        old.branch_id !== b.branch_id
      )
        await tx.query("DELETE FROM davomat.auth_sessions WHERE user_id=$1", [
          id,
        ]);
      await audit(tx, u, "user_updated", id, {
        first_name: b.first_name,
        last_name: b.last_name,
        role: b.role,
        login: b.login,
      });
    });
    res.json({ ok: true });
  }),
);
adminRouter.post(
  "/users/:id/reset-password",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    const id = uuid.parse(req.params.id);
    const { password } = z
      .object({ password: z.string().min(8).max(128) })
      .parse(req.body);
    const encoded = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const target = (
        await tx.query(
          "SELECT * FROM davomat.users WHERE id=$1 AND org_id=$2",
          [id, u.org_id],
        )
      )[0];
      if (!target) fail(404, "Topilmadi.");
      branchAllowed(u, target.branch_id);
      if (target.role === "owner" && u.role !== "owner")
        fail(403, "Ruxsat yo‘q.");
      await tx.query(
        "UPDATE davomat.users SET password_hash=$1,must_change_password=false WHERE id=$2",
        [encoded, id],
      );
      await tx.query("DELETE FROM davomat.auth_sessions WHERE user_id=$1", [
        id,
      ]);
      await audit(tx, u, "password_reset", id);
    });
    res.json({ ok: true });
  }),
);
adminRouter.delete(
  "/users/:id",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    const id = uuid.parse(req.params.id);
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const target = (
        await tx.query(
          "SELECT * FROM davomat.users WHERE id=$1 AND org_id=$2",
          [id, u.org_id],
        )
      )[0];
      if (!target) fail(404, "Topilmadi.");
      branchAllowed(u, target.branch_id);
      if (target.role === "owner" && u.role !== "owner")
        fail(403, "Ruxsat yo‘q.");
      if (
        target.role === "owner" &&
        (
          await tx.query(
            "SELECT id FROM davomat.users WHERE org_id=$1 AND role='owner' AND status='active'",
            [u.org_id],
          )
        ).length < 2
      )
        fail(400, "Oxirgi egasini o‘chirib bo‘lmaydi.");
      if (
        (
          await tx.query(
            "SELECT id FROM davomat.attendance WHERE teacher_id=$1 AND state IN('active','paused')",
            [id],
          )
        ).length ||
        (
          await tx.query(
            "SELECT id FROM davomat.lessons WHERE teacher_id=$1 AND ends_at>now() AND status='scheduled'",
            [id],
          )
        ).length
      )
        fail(
          409,
          "Avval faol darsni yakunlang va kelgusi jadvalni o‘tkazing yoki bekor qiling.",
        );
      await tx.query(
        "UPDATE davomat.users SET status='deleted',deleted_at=now() WHERE id=$1",
        [id],
      );
      await tx.query("DELETE FROM davomat.auth_sessions WHERE user_id=$1", [
        id,
      ]);
      await audit(tx, u, "user_deleted", id);
    });
    res.json({ ok: true });
  }),
);
adminRouter.get(
  "/branches",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    res.json(
      await query(
        "SELECT * FROM davomat.branches WHERE org_id=$1 AND ($2='owner' OR id=$3)",
        [u.org_id, u.role, u.branch_id],
      ),
    );
  }),
);
adminRouter.post(
  "/branches",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    if (u.role !== "owner") fail(403, "Faqat tashkilot egasi.");
    const b = z
      .object({
        name: text,
        latitude: z.coerce.number().min(-90).max(90),
        longitude: z.coerce.number().min(-180).max(180),
        radius_m: z.coerce.number().min(20).max(1000),
        max_accuracy_m: z.coerce.number().min(5).max(200),
        id: uuid.optional(),
      })
      .parse(req.body);
    const id = b.id || randomUUID();
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      if (b.id)
        await tx.query(
          "UPDATE davomat.branches SET name=$1,latitude=$2,longitude=$3,radius_m=$4,max_accuracy_m=$5 WHERE id=$6 AND org_id=$7",
          [
            b.name,
            b.latitude,
            b.longitude,
            b.radius_m,
            b.max_accuracy_m,
            id,
            u.org_id,
          ],
        );
      else
        await tx.query(
          "INSERT INTO davomat.branches VALUES($1,$2,$3,$4,$5,$6,$7)",
          [
            id,
            u.org_id,
            b.name,
            b.latitude,
            b.longitude,
            b.radius_m,
            b.max_accuracy_m,
          ],
        );
      await audit(tx, u, "branch_saved", id);
    });
    res.json({ id });
  }),
);
adminRouter.post(
  "/media",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    const b = z
      .object({
        kind: z.enum(["avatar", "selfie"]),
        data: z.string().max(2900000),
      })
      .parse(req.body);
    if (b.kind === "avatar") manage(u);
    const id = randomUUID(),
      path = u.org_id + "/" + u.id + "/" + id + ".jpg";
    await saveImage(b.data, path, b.kind);
    await query(
      "INSERT INTO davomat.evidence(id,org_id,user_id,kind,path,mime) VALUES($1,$2,$3,$4,$5,$6)",
      [id, u.org_id, u.id, b.kind, path, "image/jpeg"],
    );
    res.json({ id });
  }),
);
adminRouter.get(
  "/media/:id",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    const m = (
      await query(
        "SELECT e.*,u.branch_id FROM davomat.evidence e JOIN davomat.users u ON u.id=e.user_id WHERE e.id=$1 AND e.org_id=$2",
        [uuid.parse(req.params.id), u.org_id],
      )
    )[0];
    if (!m) fail(404, "Topilmadi.");
    if (m.kind === "selfie") {
      if (u.role === "accountant") fail(403, "Ruxsat yo‘q.");
      if (u.role === "teacher" && m.user_id !== u.id) fail(403, "Ruxsat yo‘q.");
      branchAllowed(u, m.branch_id);
    } else if (m.user_id !== u.id) {
      const profile = (
        await query(
          "SELECT id,branch_id FROM davomat.users WHERE avatar_id=$1 AND org_id=$2",
          [m.id, u.org_id],
        )
      )[0];
      if (!profile) fail(403, "Ruxsat yo‘q.");
      if (u.role === "teacher" && profile.id !== u.id)
        fail(403, "Ruxsat yo‘q.");
      branchAllowed(u, profile.branch_id);
    }
    res.type("jpeg").send(await readImage(m.path));
  }),
);
adminRouter.get(
  "/audit",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    res.json(
      await query(
        "SELECT a.*,u.first_name,u.last_name FROM davomat.audit a JOIN davomat.users u ON u.id=a.actor_id WHERE a.org_id=$1 AND ($2='owner' OR u.branch_id=$3) ORDER BY a.created_at DESC LIMIT 200",
        [u.org_id, u.role, u.branch_id],
      ),
    );
  }),
);
const lessonInput = z.object({
  teacher_id: uuid,
  branch_id: uuid,
  subject: text,
  group_name: text,
  room: text,
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  repeat_weeks: z.coerce.number().int().min(1).max(16).default(1),
});
adminRouter.get(
  "/lessons",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    const from = z
        .string()
        .datetime()
        .parse(req.query.from || new Date(Date.now() - 86400000).toISOString()),
      to = z
        .string()
        .datetime()
        .parse(
          req.query.to || new Date(Date.now() + 7 * 86400000).toISOString(),
        );
    await autoCompleteLessons({ query });
    res.json(
      await query(
        "SELECT l.*,u.first_name,u.last_name FROM davomat.lessons l JOIN davomat.users u ON u.id=l.teacher_id WHERE l.org_id=$1 AND l.starts_at<$2 AND l.ends_at>$3 AND ($4='owner' OR l.branch_id=$5) AND ($4<>'teacher' OR l.teacher_id=$6) ORDER BY l.starts_at LIMIT 1000",
        [u.org_id, to, from, u.role, u.branch_id, u.id],
      ),
    );
  }),
);
adminRouter.post(
  "/lessons",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    const b = lessonInput.parse(req.body);
    branchAllowed(u, b.branch_id);
    if (
      Date.parse(b.ends_at) <= Date.parse(b.starts_at) ||
      Date.parse(b.ends_at) - Date.parse(b.starts_at) > 12 * 3600000
    )
      fail(400, "Dars vaqti noto‘g‘ri (maksimum 12 soat).");
    const ids: string[] = [];
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      if (
        !(
          await tx.query(
            "SELECT id FROM davomat.users WHERE id=$1 AND org_id=$2 AND branch_id=$3 AND role='teacher' AND status='active'",
            [b.teacher_id, u.org_id, b.branch_id],
          )
        )[0]
      )
        fail(400, "Faol ustoz va filial mos bo‘lishi kerak.");
      for (let n = 0; n < b.repeat_weeks; n++) {
        const start = new Date(
            Date.parse(b.starts_at) + n * 7 * 86400000,
          ).toISOString(),
          end = new Date(
            Date.parse(b.ends_at) + n * 7 * 86400000,
          ).toISOString();
        if (
          (
            await tx.query(
              "SELECT id FROM davomat.lessons WHERE org_id=$1 AND status='scheduled' AND starts_at<$2 AND ends_at>$3 AND (teacher_id=$4 OR (branch_id=$5 AND room=$6))",
              [u.org_id, end, start, b.teacher_id, b.branch_id, b.room],
            )
          ).length
        )
          fail(409, "Ustoz yoki xona bu vaqtda band.");
        const id = randomUUID();
        ids.push(id);
        await tx.query(
          "INSERT INTO davomat.lessons VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'scheduled')",
          [
            id,
            u.org_id,
            b.branch_id,
            b.teacher_id,
            b.subject,
            b.group_name,
            b.room,
            start,
            end,
          ],
        );
      }
      await audit(tx, u, "lessons_created", ids[0], { count: ids.length });
    });
    res.json({ ids });
  }),
);
adminRouter.delete(
  "/lessons/:id",
  asyncRoute(async (req, res) => {
    const u = actor(req);
    manage(u);
    await transaction(async (tx) => {
      await lockOrg(tx, u);
      const l = (
        await tx.query(
          "SELECT * FROM davomat.lessons WHERE id=$1 AND org_id=$2",
          [uuid.parse(req.params.id), u.org_id],
        )
      )[0];
      if (!l) fail(404, "Topilmadi.");
      branchAllowed(u, l.branch_id);
      if (
        (
          await tx.query(
            "SELECT id FROM davomat.attendance WHERE lesson_id=$1",
            [l.id],
          )
        ).length
      )
        fail(409, "Davomat mavjud darsni bekor qilib bo‘lmaydi.");
      await tx.query(
        "UPDATE davomat.lessons SET status='cancelled' WHERE id=$1",
        [l.id],
      );
      await audit(tx, u, "lesson_cancelled", l.id);
    });
    res.json({ ok: true });
  }),
);
