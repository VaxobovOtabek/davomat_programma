import app from "./app.js";
import { query, closeDatabase } from "./db.js";
const port = Number(process.env.PORT || 3001);
try {
  await query("SELECT id FROM davomat.users LIMIT 1");
  const server = app.listen(port, "127.0.0.1", () =>
    console.log("Davomat API tayyor: http://127.0.0.1:" + port),
  );
  server.on("error", async (error: NodeJS.ErrnoException) => {
    console.error(
      error.code === "EADDRINUSE"
        ? "API porti band. Oldingi serverni Ctrl+C bilan to‘xtating."
        : error.message,
    );
    await closeDatabase();
    process.exit(1);
  });
  let closing = false;
  const stop = () => {
    if (closing) return;
    closing = true;
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
} catch (error) {
  console.error(
    "API ishga tushmadi: " +
      (error as Error).message +
      "\nAvval npm run setup:local buyrug‘ini bajaring.",
  );
  await closeDatabase();
  process.exit(1);
}
