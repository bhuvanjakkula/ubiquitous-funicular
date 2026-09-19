import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteExpiredUploadBytes, fileRetentionDays } from "@/server/files/retention";

const originalRetention = process.env.FILE_RETENTION_DAYS;
afterEach(() => { if (originalRetention === undefined) delete process.env.FILE_RETENTION_DAYS; else process.env.FILE_RETENTION_DAYS = originalRetention; });

describe("upload byte retention", () => {
  it("defaults to 30 days and rejects invalid configuration", () => {
    delete process.env.FILE_RETENTION_DAYS;
    expect(fileRetentionDays()).toBe(30);
    process.env.FILE_RETENTION_DAYS = "0";
    expect(() => fileRetentionDays()).toThrow("positive integer");
  });

  it("deletes only selected upload bytes and never deletes database history", async () => {
    process.env.FILE_RETENTION_DAYS = "30";
    const findMany = vi.fn().mockResolvedValue([{ id: "upload-old", workspaceId: "workspace-1" }]);
    const remove = vi.fn().mockResolvedValue(undefined);
    const result = await deleteExpiredUploadBytes({ fileUpload: { findMany } }, remove, new Date("2026-09-01T00:00:00Z"));
    expect(findMany).toHaveBeenCalledWith({ where: { createdAt: { lt: new Date("2026-08-02T00:00:00Z") } }, select: { id: true, workspaceId: true } });
    expect(remove).toHaveBeenCalledWith("workspace-1", "upload-old");
    expect(result.deletedBytesForUploads).toBe(1);
    expect((findMany as unknown as { delete?: unknown }).delete).toBeUndefined();
  });
});
