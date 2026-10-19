import { test } from "node:test";
import assert from "node:assert/strict";
import {
  minutesFor,
  amountFor,
  distanceM,
  monthWindow,
  csvCell,
  minutesInWindow,
} from "../server/domain.js";
test("month boundary carries fractional minutes into later period", () => {
  const a = "2026-10-31T18:59:30Z",
    b = "2026-10-31T19:01:10Z";
  const oct = monthWindow("2026-10"),
    nov = monthWindow("2026-11");
  assert.equal(minutesInWindow(a, b, a, b, [], oct.start, oct.end), 0);
  assert.equal(minutesInWindow(a, b, a, b, [], nov.start, nov.end), 1);
  assert.equal(csvCell("\t=1+1"), '"\'\t=1+1"');
  assert.equal(csvCell("  =1+1"), '"\'  =1+1"');
});
test("39 full minutes, planned interval and break", () => {
  assert.equal(
    minutesFor(
      "2026-10-19T09:03:20Z",
      "2026-10-19T09:46:10Z",
      "2026-10-19T09:00:00Z",
      "2026-10-19T09:45:00Z",
      [{ start: "2026-10-19T09:20:00Z", end: "2026-10-19T09:22:00Z" }],
    ),
    39,
  );
  assert.equal(amountFor(39, "60000"), "39000.000000");
});
test("overlapping breaks are only subtracted once", () => {
  assert.equal(
    minutesFor(
      "2026-10-19T09:00:00Z",
      "2026-10-19T10:00:00Z",
      "2026-10-19T09:00:00Z",
      "2026-10-19T10:00:00Z",
      [
        { start: "2026-10-19T09:10:00Z", end: "2026-10-19T09:20:00Z" },
        { start: "2026-10-19T09:15:00Z", end: "2026-10-19T09:25:00Z" },
      ],
    ),
    45,
  );
});
test("no overtime without approval; no negative time", () => {
  assert.equal(
    minutesFor(
      "2026-10-19T08:00:00Z",
      "2026-10-19T11:00:00Z",
      "2026-10-19T09:00:00Z",
      "2026-10-19T10:00:00Z",
      [],
    ),
    60,
  );
  assert.equal(
    minutesFor(
      "2026-10-19T11:00:00Z",
      "2026-10-19T12:00:00Z",
      "2026-10-19T09:00:00Z",
      "2026-10-19T10:00:00Z",
      [],
    ),
    0,
  );
});
test("Tashkent month boundary and safe export", () => {
  assert.deepEqual(monthWindow("2026-10"), {
    start: "2026-09-30T19:00:00.000Z",
    end: "2026-10-31T19:00:00.000Z",
  });
  assert.equal(csvCell("=1+2"), '"\'=1+2"');
  assert.equal(csvCell('A"B'), '"A""B"');
  assert.equal(distanceM(41, 69, 41, 69), 0);
});
