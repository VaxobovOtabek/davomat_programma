import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, mkdir } from "node:fs/promises";
import { hash } from "@node-rs/argon2";
import sharp from "sharp";
process.env.DATA_DIR = ".data/tests-" + randomUUID();
process.env.APP_ORIGIN = "http://test.local";
process.env.DATABASE_URL = "";
process.env.NODE_ENV = "test";
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
const { query, transaction } = await import("../server/db.js");
const { default: app } = await import("../server/app.js");
test("full API flow: custom login, roles, lesson, evidence, payroll and revocation", async () => {
  const sql = await readFile(
    new URL("../server/schema.sql", import.meta.url),
    "utf8",
  );
  for (const stmt of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await query(stmt);
  const org = randomUUID(),
    branch = randomUUID(),
    owner = randomUUID(),
    password = "TestOnly-2026!";
  await query("INSERT INTO davomat.organizations VALUES($1,$2)", [org, "Test"]);
  await query(
    "INSERT INTO davomat.branches(id,org_id,name,latitude,longitude) VALUES($1,$2,$3,41,69)",
    [branch, org, "Test branch"],
  );
  await query(
    "INSERT INTO davomat.users(id,org_id,branch_id,login,password_hash,first_name,last_name,position,role,must_change_password) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,false)",
    [
      owner,
      org,
      branch,
      "00000001",
      await hash(password),
      "Test",
      "Admin",
      "Owner",
      "owner",
    ],
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", () => r()));
  const address = server.address() as any;
  const base = "http://127.0.0.1:" + address.port + "/api/v1";
  let adminCookie = "",
    teacherCookie = "";
  async function call(
    path: string,
    method = "GET",
    body?: any,
    cookie = adminCookie,
    key?: string,
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: "http://test.local",
        "Content-Type": "application/json",
        Cookie: cookie,
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = response.headers
      .get("content-type")
      ?.includes("application/json")
      ? await response.json()
      : await response.text();
    return {
      status: response.status,
      data,
      cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
    };
  }
  try {
    assert.equal((await call("/me")).status, 401);
    assert.equal(
      (await call("/auth/login", "POST", { login: "123", password })).status,
      400,
    );
    const login = await call("/auth/login", "POST", {
      login: "00000001",
      password,
    });
    assert.equal(login.status, 200);
    adminCookie = login.cookie;
    const profile = {
      first_name: "Aziz",
      last_name: "Karimov",
      position: "Ustoz",
      role: "teacher",
      branch_id: branch,
      login: "00123456",
      password,
      hourly_rate: 60000,
      rate_date: "2020-01-01",
    };
    const create = await call("/users", "POST", profile);
    assert.equal(create.status, 201, JSON.stringify(create.data));
    const teacher = create.data.id;
    assert.equal((await call("/users", "POST", profile)).status, 409);
    const signin = await call("/auth/login", "POST", {
      login: profile.login,
      password,
    });
    teacherCookie = signin.cookie;
    assert.equal(
      (await call("/lessons", "GET", undefined, teacherCookie)).status,
      403,
    );
    const change = await call(
      "/auth/change-password",
      "POST",
      { currentPassword: password, newPassword: password + "new" },
      teacherCookie,
    );
    assert.equal(change.status, 200);
    teacherCookie = change.cookie;
    assert.equal(
      (await call("/users", "GET", undefined, teacherCookie)).status,
      403,
    );
    const start = new Date(Date.now() - 5 * 60000).toISOString(),
      end = new Date(Date.now() + 40 * 60000).toISOString();
    const lesson = {
      teacher_id: teacher,
      branch_id: branch,
      subject: "Matematika",
      group_name: "9-A",
      room: "204",
      starts_at: start,
      ends_at: end,
      repeat_weeks: 1,
    };
    const planned = await call("/lessons", "POST", lesson);
    assert.equal(planned.status, 200, JSON.stringify(planned.data));
    const lessonId = planned.data.ids[0];
    assert.equal((await call("/lessons", "POST", lesson)).status, 409);
    const image =
      "data:image/jpeg;base64," +
      (
        await sharp({
          create: { width: 32, height: 32, channels: 3, background: "#abcdef" },
        })
          .jpeg()
          .toBuffer()
      ).toString("base64");
    async function proof() {
      const c = await call("/evidence/challenge", "POST", {}, teacherCookie);
      const m = await call(
        "/media",
        "POST",
        { kind: "selfie", data: image },
        teacherCookie,
      );
      assert.equal(m.status, 200, JSON.stringify(m.data));
      return {
        challenge_id: c.data.id,
        media_id: m.data.id,
        location: {
          latitude: 41,
          longitude: 69,
          accuracy: 10,
          captured_at: new Date().toISOString(),
        },
      };
    }
    const p = await proof();
    const key = randomUUID();
    const active = await call(
      "/attendance/start",
      "POST",
      { lesson_id: lessonId, ...p },
      teacherCookie,
      key,
    );
    assert.equal(active.status, 200, JSON.stringify(active.data));
    const aid = active.data.id;
    assert.equal(
      (
        await call(
          "/attendance/start",
          "POST",
          { lesson_id: lessonId, ...p },
          teacherCookie,
          key,
        )
      ).data.id,
      aid,
    );
    const concurrent = await call(
      "/attendance/start",
      "POST",
      { lesson_id: lessonId, ...p },
      teacherCookie,
      randomUUID(),
    );
    assert.equal(concurrent.status, 409);
    assert.equal(
      (
        await call(
          "/attendance/" + aid + "/resume",
          "POST",
          {},
          teacherCookie,
          randomUUID(),
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          "/attendance/" + aid + "/pause",
          "POST",
          {},
          teacherCookie,
          randomUUID(),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await call(
          "/attendance/" + aid + "/resume",
          "POST",
          {},
          teacherCookie,
          randomUUID(),
        )
      ).status,
      200,
    );
    const finished = await call(
      "/attendance/" + aid + "/finish",
      "POST",
      await proof(),
      teacherCookie,
      randomUUID(),
    );
    assert.equal(finished.status, 200, JSON.stringify(finished.data));
    const review = await call("/attendance/" + aid + "/review", "POST", {
      approval: "approved",
      reason: "Tekshirildi",
    });
    assert.equal(review.status, 200, JSON.stringify(review.data));
    const month = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
    }).format(new Date());
    const calculated = await call("/payroll/calculate", "POST", {
      month,
      branch_id: branch,
    });
    assert.equal(calculated.status, 200, JSON.stringify(calculated.data));
    const report = calculated.data.id;
    assert.equal(
      (await call("/payroll/" + report + "/lock", "POST", {})).status,
      200,
    );
    assert.equal(
      (
        await call("/payroll/" + report + "/adjust", "PATCH", {
          teacher_id: teacher,
          bonus: 100,
          deduction: 0,
          reason: "bonus",
        })
      ).status,
      409,
    );
    const excel = await fetch(
      base + "/payroll/" + report + "/export?format=xlsx",
      { headers: { Cookie: adminCookie } },
    );
    assert.equal(excel.status, 200);
    assert.ok((await excel.arrayBuffer()).byteLength > 1000);
    const otherOrg = randomUUID(),
      otherBranch = randomUUID(),
      otherUser = randomUUID();
    await query("INSERT INTO davomat.organizations VALUES($1,$2)", [
      otherOrg,
      "Other",
    ]);
    await query(
      "INSERT INTO davomat.branches(id,org_id,name,latitude,longitude) VALUES($1,$2,$3,41,69)",
      [otherBranch, otherOrg, "Other"],
    );
    await query(
      "INSERT INTO davomat.users(id,org_id,branch_id,login,password_hash,first_name,last_name,position,role,must_change_password) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,false)",
      [
        otherUser,
        otherOrg,
        otherBranch,
        "99887766",
        await hash(password),
        "Other",
        "Owner",
        "Owner",
        "owner",
      ],
    );
    const otherLogin = await call("/auth/login", "POST", {
      login: "99887766",
      password,
    });
    assert.equal(
      (await call("/media/" + p.media_id, "GET", undefined, otherLogin.cookie))
        .status,
      404,
    );
    assert.equal(
      (await call("/users/" + teacher, "PATCH", profile, otherLogin.cookie))
        .status,
      404,
    );
    assert.equal(
      (
        await call("/users/" + teacher + "/reset-password", "POST", {
          password: "NewReset123!",
        })
      ).status,
      200,
    );
    assert.equal(
      (await call("/me", "GET", undefined, teacherCookie)).status,
      401,
    );
    await query(
      "UPDATE davomat.lessons SET ends_at=now()-interval '1 second',starts_at=now()-interval '1 hour' WHERE id=$1",
      [lessonId],
    );
    assert.equal((await call("/users/" + teacher, "DELETE")).status, 200);
    assert.equal(
      (
        await query("SELECT id FROM davomat.attendance WHERE teacher_id=$1", [
          teacher,
        ])
      ).length,
      1,
    );
    assert.equal(
      (
        await call("/auth/login", "POST", {
          login: profile.login,
          password: "NewReset123!",
        })
      ).status,
      401,
    );
    const noOrigin = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: "00000001", password }),
    });
    assert.equal(noOrigin.status, 403);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
  }
});
