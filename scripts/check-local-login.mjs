import { readFile } from "node:fs/promises";
const text = await readFile(".data/LOCAL_LOGIN.txt", "utf8");
const login = text.match(/^Login: (.+)$/m)?.[1].trim();
const password = text.match(/^Password: (.+)$/m)?.[1].trim();
if (!login || !password) throw new Error("LOCAL_LOGIN.txt format is invalid.");
for (const origin of ["http://127.0.0.1:5173", "http://localhost:5173"]) {
  const response = await fetch("http://127.0.0.1:5173/api/v1/auth/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ login, password }),
  });
  const result = await response
    .json()
    .catch(() => ({ message: "API unavailable" }));
  console.log(JSON.stringify({ origin, status: response.status, ...result }));
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (response.ok && cookie) {
    const me = await fetch("http://127.0.0.1:5173/api/v1/me", {
      headers: { Cookie: cookie },
    });
    console.log("Authenticated profile status:", me.status);
    await fetch("http://127.0.0.1:5173/api/v1/auth/logout", {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
  }
}
