import { readFile } from "node:fs/promises";
import { query } from "../server/db.js";
const sql = await readFile(
  new URL("../server/schema.sql", import.meta.url),
  "utf8",
);
for (const statement of sql
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean))
  await query(statement);
console.log("Database schema ready.");
process.exit(0);
