import "dotenv/config";
export const config = {
  production: process.env.NODE_ENV === "production" || !!process.env.VERCEL,
  origin: (process.env.APP_ORIGIN || "http://127.0.0.1:5173").replace(/\/+$/, ""),
  dataDir: process.env.DATA_DIR || ".data",
  databaseUrl: process.env.DATABASE_URL,
  storageUrl: process.env.SUPABASE_URL,
  storageKey: process.env.SUPABASE_SECRET_KEY,
  bucket: process.env.SUPABASE_STORAGE_BUCKET || "davomat-private",
};
if (
  config.production &&
  (!config.databaseUrl ||
    !config.storageUrl ||
    !config.storageKey ||
    !process.env.APP_ORIGIN)
) {
  const missing = [
    !config.databaseUrl && "DATABASE_URL",
    !config.storageUrl && "SUPABASE_URL",
    !config.storageKey && "SUPABASE_SECRET_KEY",
    !process.env.APP_ORIGIN && "APP_ORIGIN",
  ]
    .filter(Boolean)
    .join(", ");
  throw new Error(`Production requires: ${missing}`);
}

