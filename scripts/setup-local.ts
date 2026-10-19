import "dotenv/config";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import { hash } from "@node-rs/argon2";
import { query, transaction, closeDatabase } from "../server/db.js";
async function setup() {
  if (
    process.env.VERCEL ||
    process.env.NODE_ENV === "production" ||
    process.env.DATABASE_URL
  )
    throw new Error(
      "Bu buyruq faqat lokal baza uchun. Cloud baza uchun db:migrate va seed ishlating.",
    );
  const directory = process.env.DATA_DIR || ".data",
    credentials = resolve(directory, "LOCAL_LOGIN.txt");
  const running = await fetch(
    "http://127.0.0.1:" + (process.env.PORT || "3001") + "/api/v1/health",
    { signal: AbortSignal.timeout(2000) },
  )
    .then(async (r) => r.ok && (await r.json()).storage === "local-postgres")
    .catch(() => false);
  if (running) {
    console.log(
      "Davomat serveri ishlayapti. Mavjud baza va parollar o‘zgartirilmadi.\nKirish ma’lumotlari: " +
        credentials +
        "\nBazani sozlash uchun avval dev terminalida Ctrl+C bosing.",
    );
    return;
  }
  await mkdir(directory, { recursive: true });
  const sql = await readFile(
    new URL("../server/schema.sql", import.meta.url),
    "utf8",
  );
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await query(statement);
  if ((await query("SELECT id FROM davomat.users LIMIT 1")).length) {
    console.log(
      "Lokal baza avval tayyorlangan. Foydalanuvchilar, parollar va davomat saqlandi.",
    );
    try {
      await access(credentials);
      console.log("Kirish ma’lumotlari: " + credentials);
    } catch {
      console.log(
        "Kirish fayli topilmadi. Mavjud admin parolidan foydalaning; parol almashtirilmadi.",
      );
    }
    console.log("Keyingi qadam: npm run dev");
    return;
  }
  const password = randomBytes(12).toString("base64url"),
    org = randomUUID(),
    branch = randomUUID(),
    user = randomUUID();
  const encoded = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  await transaction(async (tx) => {
    await tx.query("INSERT INTO davomat.organizations VALUES($1,$2)", [
      org,
      "Ta’lim markazi",
    ]);
    await tx.query(
      "INSERT INTO davomat.branches(id,org_id,name,latitude,longitude) VALUES($1,$2,$3,$4,$5)",
      [branch, org, "Asosiy filial", 41.3111, 69.2797],
    );
    await tx.query(
      "INSERT INTO davomat.users(id,org_id,branch_id,login,password_hash,first_name,last_name,position,role,must_change_password) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,false)",
      [
        user,
        org,
        branch,
        "00000001",
        encoded,
        "Admin",
        "Markaz",
        "Tashkilot egasi",
        "owner",
      ],
    );
  });
  await writeFile(
    credentials,
    "LOCAL DEVELOPMENT ONLY\nLogin: 00000001\nPassword: " +
      password +
      "\n\nOpen http://127.0.0.1:5173\nThis file is ignored by Git. Do not deploy or share it.\n",
    { mode: 0o600 },
  );
  console.log(
    "Lokal baza va admin tayyor. Kirish ma’lumotlari: " +
      credentials +
      "\nKeyingi qadam: npm run dev",
  );
}
try {
  await setup();
} catch (error) {
  console.error("Lokal sozlash xatosi: " + (error as Error).message);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
