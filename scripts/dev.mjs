import "dotenv/config";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const apiPort = Number(process.env.PORT || 3001),
  webPort = 5173;
async function free(port) {
  await new Promise((resolve, reject) => {
    const s = createServer();
    s.once("error", () =>
      reject(
        new Error(
          port +
            "-port band. Oldingi npm run dev terminalida Ctrl+C bosing va qayta urinib ko‘ring.",
        ),
      ),
    );
    s.listen(port, "127.0.0.1", () => s.close(resolve));
  });
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGTERM");
  setTimeout(() => process.exit(code), 1500).unref();
}
function launch(args) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) {
      console.error("Dev jarayoni to‘xtadi. Yuqoridagi xatoni tekshiring.");
      stop(code || 1);
    }
  });
  return child;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
try {
  await free(apiPort);
  await free(webPort);
  const backend = launch(["--import", "tsx", "server/dev.ts"]);
  const deadline = Date.now() + 60000;
  let ready = false;
  while (Date.now() < deadline && !stopping && backend.exitCode === null) {
    ready = await fetch("http://127.0.0.1:" + apiPort + "/api/v1/health", {
      signal: AbortSignal.timeout(1500),
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!ready)
    throw new Error("API tayyor bo‘lmadi. Frontend ishga tushirilmadi.");
  launch([
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--strictPort",
  ]);
  console.log(
    "\nDavomat: http://127.0.0.1:5173 (localhost:5173 ham ishlaydi)\nBackend kodini o‘zgartirsangiz, Ctrl+C va npm run dev bilan qayta ishga tushiring.\n",
  );
} catch (error) {
  console.error(error.message);
  stop(1);
  process.exitCode = 1;
}
