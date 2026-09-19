import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/api/storage", () => ({ saveUploadFile: vi.fn().mockResolvedValue(undefined), deleteUploadFile: vi.fn().mockResolvedValue(undefined) }));

import { persistUpload } from "@/server/api/uploads";

const fixture = (name: string) => readFileSync(join(process.cwd(), "tests", "fixtures", name));

describe("upload row persistence", () => {
  let sequence = 0;
  beforeEach(() => { sequence = 0; });

  it("does not duplicate invoice or transaction fingerprints on repeated uploads", async () => {
    const invoices = new Map<string, unknown>(), txns = new Map<string, unknown>();
    const tx = {
      invoice: { upsert: vi.fn(async ({ where, create, update }) => { const key = where.workspaceId_fingerprint.fingerprint; invoices.set(key, invoices.has(key) ? { ...invoices.get(key) as object, ...update } : create); return invoices.get(key); }) },
      bankTxn: { upsert: vi.fn(async ({ where, create, update }) => { const key = where.workspaceId_fingerprint.fingerprint; txns.set(key, txns.has(key) ? { ...txns.get(key) as object, ...update } : create); return txns.get(key); }) },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const db = {
      fileUpload: { create: vi.fn(async ({ data }) => ({ id: `upload-${++sequence}`, ...data })), delete: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn((callback) => callback(tx)),
    };
    const api = { db, user: { id: "user-a" }, workspace: { id: "workspace-a" }, membership: { id: "membership-a" } } as any;
    await persistUpload(api, "invoices", "invoices.csv", fixture("invoices.csv"));
    await persistUpload(api, "payments", "payouts.csv", fixture("payouts.csv"));
    await persistUpload(api, "invoices", "invoices.csv", fixture("invoices.csv"));
    await persistUpload(api, "payments", "payouts.csv", fixture("payouts.csv"));
    expect(invoices.size).toBe(12);
    expect(txns.size).toBe(15);
    expect(tx.invoice.upsert).toHaveBeenCalledTimes(24);
    expect(tx.bankTxn.upsert).toHaveBeenCalledTimes(30);
  });
});
