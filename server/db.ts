import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { mkdir } from "node:fs/promises";
import { config } from "./config.js";
export interface DB {
  query<T = Record<string, any>>(sql: string, params?: any[]): Promise<T[]>;
}
let init:
  | Promise<{
      query: DB["query"];
      transaction: <T>(fn: (tx: DB) => Promise<T>) => Promise<T>;
      close: () => Promise<void>;
    }>
  | undefined;
export function database() {
  return (init ??= (async () => {
    try {
      if (config.databaseUrl) {
        const client = postgres(config.databaseUrl, {
          prepare: false,
          max: 2,
          idle_timeout: 120,
          connect_timeout: 10,
        });
        const wrap = (c: any): DB => ({
          query: async (sql, params = []) =>
            Array.from(await c.unsafe(sql, params)) as any,
        });
        const db = {
          ...wrap(client),
          close: async () => {
            await client.end({ timeout: 5 });
          },
          transaction: async <T>(fn: (tx: DB) => Promise<T>) =>
            (await client.begin(async (tx: any) => fn(wrap(tx)))) as T,
        };
        db.query(
          "UPDATE davomat.users SET must_change_password=false WHERE must_change_password=true",
        ).catch(() => {});
        return db;
      }
      await mkdir(config.dataDir, { recursive: true });
      const pg = new PGlite(config.dataDir + "/postgres");
      await pg.waitReady;
      const wrap = (c: any): DB => ({
        query: async (sql, params = []) => (await c.query(sql, params)).rows,
      });
      const db = {
        ...wrap(pg),
        close: () => pg.close(),
        transaction: <T>(fn: (tx: DB) => Promise<T>) =>
          pg.transaction((tx) => fn(wrap(tx))),
      };
      db.query(
        "UPDATE davomat.users SET must_change_password=false WHERE must_change_password=true",
      ).catch(() => {});
      return db;
    } catch (err) {
      init = undefined;
      throw err;
    }
  })());
}
export async function query<T = Record<string, any>>(
  sql: string,
  params: any[] = [],
) {
  return (await database()).query<T>(sql, params);
}
export async function transaction<T>(fn: (tx: DB) => Promise<T>) {
  return (await database()).transaction(fn);
}
export async function closeDatabase() {
  if (init) {
    const current = init;
    init = undefined;
    await (await current).close();
  }
}
