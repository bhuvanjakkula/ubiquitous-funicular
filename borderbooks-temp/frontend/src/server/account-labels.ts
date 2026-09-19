export const DEFAULT_ACCOUNT_LABELS = {
  bank: "Bank",
  ar: "AR",
  bankFee: "Bank fee",
  shortRemainder: "Short",
  unapplied: "Unapplied overpayment",
  unallocated: "Unallocated",
  fxGainLoss: "FX gain-loss",
} as const;

export type AccountLabels = { [Key in keyof typeof DEFAULT_ACCOUNT_LABELS]: string };

export function resolveAccountLabels(value: unknown): AccountLabels {
  const supplied = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(DEFAULT_ACCOUNT_LABELS).map(([key, fallback]) => [key, typeof supplied[key] === "string" && supplied[key].trim() ? supplied[key].trim() : fallback])) as AccountLabels;
}
