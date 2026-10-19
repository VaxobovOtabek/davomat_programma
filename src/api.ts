import { ref } from "vue";
export const notice = ref("");
let timer: ReturnType<typeof setTimeout>;
export function toast(text: string) {
  notice.value = text;
  clearTimeout(timer);
  timer = setTimeout(() => (notice.value = ""), 5000);
}
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ message: "Server bilan aloqa uzildi." }));
    throw new Error(
      body.message +
        (body.fields?.length
          ? " " + body.fields.map((f: any) => f.field).join(", ")
          : ""),
    );
  }
  return response.json();
}
export const post = <T = any>(path: string, body: unknown = {}, key?: string) =>
  api<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: key ? { "Idempotency-Key": key } : {},
  });
export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
export const timeLabel = (value: string) =>
  new Intl.DateTimeFormat("uz-UZ", {
    timeZone: "Asia/Tashkent",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export const money = (value: any) =>
  new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 }).format(
    Number(value || 0),
  );
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const dayRange = (day: string) => ({
  from: new Date(day + "T00:00:00+05:00").toISOString(),
  to: new Date(day + "T23:59:59+05:00").toISOString(),
});
export function initials(a: string, b: string) {
  return (a[0] || "") + (b[0] || "");
}
export async function photoData(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
