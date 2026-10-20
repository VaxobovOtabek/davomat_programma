import Decimal from "decimal.js";
export function minutesFor(
  start: string | Date,
  end: string | Date,
  plannedStart: string | Date,
  plannedEnd: string | Date,
  breaks: { start: string; end: string | null }[] = [],
) {
  const parse = (d: any) => {
    if (!d) return NaN;
    if (d instanceof Date) return d.getTime();
    const t = Date.parse(String(d));
    return isNaN(t) ? NaN : t;
  };
  const a = Math.max(parse(start), parse(plannedStart));
  const b = Math.min(parse(end), parse(plannedEnd));
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  const safeBreaks = Array.isArray(breaks) ? breaks : [];
  const spans = safeBreaks
    .map((x) => [
      Math.max(a, parse(x.start)),
      Math.min(b, parse(x.end || end)),
    ])
    .filter((x) => !isNaN(x[0]!) && !isNaN(x[1]!) && x[1]! > x[0]!)
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
  if (!minutes || isNaN(minutes) || minutes <= 0) return "0.000000";
  const r = Number(rate || 0);
  if (isNaN(r) || r <= 0) return "0.000000";
  return new Decimal(rate).mul(minutes).div(60).toFixed(6);
}
// Subtract cumulative whole minutes so fractional minutes crossing an accounting
// boundary are carried into the later period instead of being lost twice.
export function minutesInWindow(
  start: string | Date,
  end: string | Date,
  plannedStart: string | Date,
  plannedEnd: string | Date,
  breaks: { start: string; end: string | null }[] = [],
  windowStart: string | Date,
  windowEnd: string | Date,
) {
  const parse = (d: any) => {
    if (!d) return NaN;
    if (d instanceof Date) return d.getTime();
    return Date.parse(String(d));
  };
  const pEnd = parse(plannedEnd);
  const until = (boundary: string | Date) => {
    const b = parse(boundary);
    const minEnd = Math.min(pEnd, b);
    return minutesFor(
      start,
      end,
      plannedStart,
      new Date(minEnd).toISOString(),
      breaks,
    );
  };
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
