export function isAllowedOrigin(
  origin: string | undefined,
  expected: string,
  production: boolean,
) {
  if (!origin) return false;
  if (origin === expected) return true;
  if (production) return false;
  try {
    const url = new URL(origin),
      configured = new URL(expected);
    const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
    return (
      local.has(url.hostname) &&
      local.has(configured.hostname) &&
      url.protocol === configured.protocol &&
      url.port === configured.port &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}
