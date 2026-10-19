import Decimal from "decimal.js";
export function minutesFor(
  start: string,
  end: string,
  plannedStart: string,
  plannedEnd: string,
  breaks: { start: string; end: string | null }[],
) {
  const a = Math.max(Date.parse(start), Date.parse(plannedStart));
  const b = Math.min(Date.parse(end), Date.parse(plannedEnd));
  if (b <= a) return 0;
  const spans = breaks
    .map((x) => [
      Math.max(a, Date.parse(x.start)),
      Math.min(b, Date.parse(x.end || end)),
    ])
    .filter((x) => x[1]! > x[0]!)
    .sort((x, y) => x[0]! - y[0]!);
  let pause = 0,
    last = a;
  for (const [s, e] of spans) {
    pause += Math.max(0, e! - Math.max(last, s!));
    last = Math.max(last, e!);
  }
  return Math.floor(Math.max(0, b - a - pause) / 60000);
}
export function amountFor(minutes: number, rate: string | number) {
  return new Decimal(rate).mul(minutes).div(60).toFixed(6);
}
// Subtract cumulative whole minutes so fractional minutes crossing an accounting
// boundary are carried into the later period instead of being lost twice.
export function minutesInWindow(
  start: string,
  end: string,
  plannedStart: string,
  plannedEnd: string,
  breaks: { start: string; end: string | null }[],
  windowStart: string,
  windowEnd: string,
) {
  const until = (boundary: string) =>
    minutesFor(
      start,
      end,
      plannedStart,
      new Date(
        Math.min(Date.parse(plannedEnd), Date.parse(boundary)),
      ).toISOString(),
      breaks,
    );
  return Math.max(0, until(windowEnd) - until(windowStart));
}
export function distanceM(a: number, b: number, c: number, d: number) {
  const r = (n: number) => (n * Math.PI) / 180;
  const h =
    Math.sin(r(c - a) / 2) ** 2 +
    Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function monthWindow(month: string) {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(y!, m! - 1, 1, -5)).toISOString(),
    end: new Date(Date.UTC(y!, m!, 1, -5)).toISOString(),
  };
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^\s*[=+@-]|^[\t\r\n]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
