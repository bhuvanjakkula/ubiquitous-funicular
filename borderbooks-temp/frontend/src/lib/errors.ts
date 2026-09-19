export function asError(value: unknown, fallback = "Unexpected client error"): Error {
  if (value instanceof Error) return value;
  if (typeof value === "string" && value.trim()) return new Error(value);
  if (value && typeof value === "object" && "message" in value && typeof value.message === "string" && value.message.trim()) return new Error(value.message);
  if (typeof Event !== "undefined" && value instanceof Event) return new Error(`${fallback} (${value.type || "event"})`);
  return new Error(fallback);
}
