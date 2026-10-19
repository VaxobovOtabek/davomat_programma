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
    if (config.databaseUrl) {
      const client = postgres(config.databaseUrl, {
        prepare: false,
        max: 3,
        idle_timeout: 20,
        connect_timeout: 15,
      });
      const wrap = (c: any): DB => ({
        query: async (sql, params = []) =>
          Array.from(await c.unsafe(sql, params)) as any,
      });
      return {
        ...wrap(client),
        close: async () => {
          await client.end({ timeout: 5 });
        },
        transaction: async <T>(fn: (tx: DB) => Promise<T>) =>
          (await client.begin(async (tx: any) => fn(wrap(tx)))) as T,
      };
    }
    await mkdir(config.dataDir, { recursive: true });
    const pg = new PGlite(config.dataDir + "/postgres");
    await pg.waitReady;
    const wrap = (c: any): DB => ({
      query: async (sql, params = []) => (await c.query(sql, params)).rows,
    });
    return {
      ...wrap(pg),
      close: () => pg.close(),
      transaction: <T>(fn: (tx: DB) => Promise<T>) =>
        pg.transaction((tx) => fn(wrap(tx))),
    };
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
