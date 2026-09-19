import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) { super(message); }
  }
  const db: Record<string, any> = {};
  return {
    ApiError,
    db,
    requireApiContext: vi.fn(),
    createMatchRun: vi.fn(),
    loadExportData: vi.fn(),
    workpaperXlsx: vi.fn(),
    journalCsv: vi.fn(),
    auditExport: vi.fn(),
  };
});

vi.mock("@/server/api/context", () => ({ ApiError: mocks.ApiError, requireApiContext: mocks.requireApiContext }));
vi.mock("@/server/api/match-runs", () => ({ createMatchRun: mocks.createMatchRun }));
vi.mock("@/server/api/exports", () => ({ loadExportData: mocks.loadExportData, workpaperXlsx: mocks.workpaperXlsx, journalCsv: mocks.journalCsv, auditExport: mocks.auditExport }));

import { GET as getUploads } from "@/app/api/uploads/route";
import { POST as postRun } from "@/app/api/match-runs/route";
import { GET as getRun } from "@/app/api/match-runs/[id]/route";
import { POST as acceptLink } from "@/app/api/match-runs/[id]/links/[linkId]/accept/route";
import { POST as manualLink } from "@/app/api/match-runs/[id]/manual-link/route";
import { GET as getInvoices } from "@/app/api/invoices/route";
import { GET as exportXlsx } from "@/app/api/match-runs/[id]/export.xlsx/route";
import { POST as checkout } from "@/app/api/billing/checkout/route";
import { POST as createWorkspace } from "@/app/api/workspaces/route";

const request = (url: string, init?: RequestInit) => new Request(url, init);
const params = <T extends object>(value: T) => ({ params: Promise.resolve(value) });

describe("workspace-scoped API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mocks.db).forEach((key) => delete mocks.db[key]);
    mocks.requireApiContext.mockResolvedValue({
      db: mocks.db,
      user: { id: "user-test", clerkId: "clerk-test" },
      workspace: { id: "workspace-test", plan: "STUDIO" },
      membership: { id: "membership-test" },
    });
  });

  it("lists uploads only from the authenticated workspace", async () => {
    mocks.db.fileUpload = { findMany: vi.fn().mockResolvedValue([{ id: "upload-1" }]) };
    const response = await getUploads(request("http://localhost/api/uploads"));
    expect(response.status).toBe(200);
    expect(mocks.db.fileUpload.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { workspaceId: "workspace-test" } }));
    expect(await response.json()).toEqual({ uploads: [{ id: "upload-1" }] });
  });

  it("rejects an unauthenticated checkout request", async () => {
    mocks.requireApiContext.mockRejectedValueOnce(new mocks.ApiError(401, "UNAUTHENTICATED", "Sign in required"));
    const response = await checkout(request("http://localhost/api/billing/checkout", { method: "POST", body: JSON.stringify({ plan: "COMMERCE" }) }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("returns 403 when a Studio user tries to create a second workspace", async () => {
    const response = await createWorkspace(request("http://localhost/api/workspaces", { method: "POST", body: JSON.stringify({ name: "Second workspace" }) }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "WORKSPACE_LIMIT" });
  });

  it("validates run bodies and returns PLAN_LIMIT as 402", async () => {
    let response = await postRun(request("http://localhost/api/match-runs", { method: "POST", body: "{}" }));
    expect(response.status).toBe(400);
    mocks.createMatchRun.mockRejectedValueOnce(new mocks.ApiError(402, "PLAN_LIMIT", "Plan allows 2000 rows per run"));
    response = await postRun(request("http://localhost/api/match-runs", {
      method: "POST",
      body: JSON.stringify({ invoiceUploadId: "inv", paymentUploadId: "pay" }),
    }));
    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({ code: "PLAN_LIMIT" });
  });

  it("returns a client error for malformed JSON", async () => {
    const response = await postRun(request("http://localhost/api/match-runs", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_JSON" });
  });

  it("creates and serializes a run response", async () => {
    mocks.createMatchRun.mockResolvedValue({ id: "run-1", links: [{ expectedMinor: 1000n }] });
    const response = await postRun(request("http://localhost/api/match-runs", {
      method: "POST",
      body: JSON.stringify({ invoiceUploadId: "inv", paymentUploadId: "pay", settings: { dateWindowDaysAfter: 120 } }),
    }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ links: [{ expectedMinor: "1000" }] });
  });

  it("loads a match run with a workspace predicate", async () => {
    mocks.db.matchRun = { findFirst: vi.fn().mockResolvedValue({ id: "run-1", invoiceUploadId: "inv-upload", paymentUploadId: "pay-upload", links: [] }) };
    mocks.db.fileUpload = { findMany: vi.fn().mockResolvedValue([]) };
    mocks.db.invoice = { findMany: vi.fn().mockResolvedValue([]) };
    mocks.db.bankTxn = { findMany: vi.fn().mockResolvedValue([]) };
    const response = await getRun(request("http://localhost/api/match-runs/run-1"), params({ id: "run-1" }));
    expect(response.status).toBe(200);
    expect(mocks.db.matchRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "run-1", workspaceId: "workspace-test" } }));
  });

  it("does not expose another workspace's run", async () => {
    mocks.db.matchRun = { findFirst: vi.fn().mockResolvedValue(null) };
    const response = await getRun(request("http://localhost/api/match-runs/run-b"), params({ id: "run-b" }));
    expect(response.status).toBe(404);
    expect(mocks.db.matchRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "run-b", workspaceId: "workspace-test" } }));
  });

  it("accepts a scoped link and writes the audit event transactionally", async () => {
    mocks.db.matchLink = { findFirst: vi.fn().mockResolvedValue({ id: "link-1" }) };
    const tx = {
      matchLink: { update: vi.fn().mockResolvedValue({ id: "link-1", status: "ACCEPTED" }) },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.db.$transaction = vi.fn((callback) => callback(tx));
    const response = await acceptLink(request("http://localhost", { method: "POST" }), params({ id: "run-1", linkId: "link-1" }));
    expect(response.status).toBe(200);
    expect(mocks.db.matchLink.findFirst).toHaveBeenCalledWith({ where: { id: "link-1", runId: "run-1", run: { workspaceId: "workspace-test" } } });
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "ACCEPT" }) }));
  });

  it("creates a manual accepted link and audit event", async () => {
    mocks.db.matchRun = { findFirst: vi.fn().mockResolvedValue({ id: "run-1" }) };
    mocks.db.invoice = { findFirst: vi.fn().mockResolvedValue({ id: "invoice-1", amountMinor: 1000n }) };
    mocks.db.bankTxn = { findFirst: vi.fn().mockResolvedValue({ id: "txn-1", amountMinor: 990n }) };
    mocks.db.matchLink = { findFirst: vi.fn().mockResolvedValue(null) };
    const tx = {
      matchLink: { create: vi.fn().mockResolvedValue({ id: "manual-1", expectedMinor: 1000n }) },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    mocks.db.$transaction = vi.fn((callback) => callback(tx));
    const response = await manualLink(request("http://localhost", { method: "POST", body: JSON.stringify({ invoiceId: "invoice-1", txnId: "txn-1" }) }), params({ id: "run-1" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: "manual-1", expectedMinor: "1000" });
    expect(tx.matchLink.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ACCEPTED", method: "MANUAL" }) }));
    expect(tx.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "MANUAL" }) }));
  });

  it("searches invoices inside the workspace and serializes minor units", async () => {
    mocks.db.invoice = { findMany: vi.fn().mockResolvedValue([{ id: "invoice-1", amountMinor: 123n }]) };
    const response = await getInvoices(request("http://localhost/api/invoices?q=acme"));
    expect(await response.json()).toEqual({ invoices: [{ id: "invoice-1", amountMinor: "123" }] });
    expect(mocks.db.invoice.findMany.mock.calls[0][0].where.workspaceId).toBe("workspace-test");
  });

  it("returns and audits a scoped workbook export", async () => {
    mocks.loadExportData.mockResolvedValue({ runId: "run-1" });
    mocks.workpaperXlsx.mockResolvedValue(Buffer.from("workbook"));
    const response = await exportXlsx(request("http://localhost"), params({ id: "run-1" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("spreadsheetml");
    expect(mocks.loadExportData).toHaveBeenCalledWith(expect.objectContaining({ workspace: { id: "workspace-test", plan: "STUDIO" } }), "run-1");
    expect(mocks.auditExport).toHaveBeenCalledWith(expect.anything(), "run-1", "xlsx");
  });

  it("returns 404 when exporting another workspace's run", async () => {
    mocks.loadExportData.mockRejectedValueOnce(new mocks.ApiError(404, "MATCH_RUN_NOT_FOUND", "Match run not found"));
    const response = await exportXlsx(request("http://localhost"), params({ id: "run-b" }));
    expect(response.status).toBe(404);
  });
});
