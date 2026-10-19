import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin } from "../server/origin.js";
test("development accepts only explicit loopback aliases on the configured port", () => {
  const origin = "http://127.0.0.1:5173";
  assert.equal(isAllowedOrigin(origin, origin, false), true);
  assert.equal(isAllowedOrigin("http://localhost:5173", origin, false), true);
  assert.equal(isAllowedOrigin("http://[::1]:5173", origin, false), true);
  for (const candidate of [
    undefined,
    "null",
    "http://localhost:5174",
    "http://localhost.evil.test:5173",
    "https://localhost:5173",
    "http://evil.test:5173",
  ])
    assert.equal(isAllowedOrigin(candidate, origin, false), false);
});
test("production never accepts alternate origins", () => {
  assert.equal(
    isAllowedOrigin("http://localhost:5173", "http://127.0.0.1:5173", true),
    false,
  );
  assert.equal(
    isAllowedOrigin("https://davomat.example", "https://davomat.example", true),
    true,
  );
  assert.equal(
    isAllowedOrigin("https://evil.example", "https://davomat.example", true),
    false,
  );
});
