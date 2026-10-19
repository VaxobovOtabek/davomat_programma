import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { query, transaction } from "../server/db.js";
const login = process.env.ADMIN_LOGIN || "00000001";
const password = process.env.ADMIN_PASSWORD || "";
if (!/^[0-9]{8}$/.test(login) || password.length < 8)
  throw new Error(
    "Set ADMIN_LOGIN (8 digits) and ADMIN_PASSWORD (at least 8 characters) in .env",
  );
if ((await query("SELECT id FROM davomat.users LIMIT 1")).length)
  throw new Error(
    "Seed only works on an empty installation. Use the admin panel.",
  );
const org = randomUUID(),
  branch = randomUUID(),
  user = randomUUID();
const digest = await hash(password, {
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
      login,
      digest,
      process.env.ADMIN_FIRST_NAME || "Admin",
      process.env.ADMIN_LAST_NAME || "Markaz",
      "Tashkilot egasi",
      "owner",
    ],
  );
});
console.log(
  "Admin created. Sign in with the credentials you configured. Set the actual branch location in Settings.",
);
process.exit(0);
