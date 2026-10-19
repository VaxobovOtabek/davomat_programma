import type { IncomingMessage, ServerResponse } from "node:http";

let appPromise: Promise<any> | null = null;
let initError: any = null;

function getApp() {
  if (initError) throw initError;
  if (!appPromise) {
    appPromise = import("../server/app.js")
      .then((m) => m.default)
      .catch((err) => {
        initError = err;
        throw err;
      });
  }
  return appPromise;
}

// Pre-warm on serverless container start
getApp().catch(() => {});

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Function Error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: "Server sozlamalarida xatolik: " + (err?.message || String(err)),
        missingEnv: {
          DATABASE_URL: !process.env.DATABASE_URL,
          SUPABASE_URL: !(
            process.env.SUPABASE_URL ||
            process.env.VITE_SUPABASE_URL ||
            process.env.NEXT_PUBLIC_SUPABASE_URL
          ),
          SUPABASE_SECRET_KEY: !(
            process.env.SUPABASE_SECRET_KEY ||
            process.env.SUPABASE_SERVICE_ROLE_KEY
          ),
          APP_ORIGIN: !process.env.APP_ORIGIN,
        },
      }),
    );
  }
}
