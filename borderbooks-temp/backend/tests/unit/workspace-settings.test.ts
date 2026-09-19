import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ update: vi.fn(), requireApiContext: vi.fn() }));
vi.mock("@/server/api/context", async () => { const actual = await vi.importActual<typeof import("@/server/api/context")>("@/server/api/context"); return { ...actual, requireApiContext: mocks.requireApiContext }; });
import { GET, PATCH } from "@/app/api/workspace/settings/route";

describe("workspace account-label settings API", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireApiContext.mockResolvedValue({ db: { workspace: { update: mocks.update } }, user: { id: "user-1" }, workspace: { id: "workspace-1", accountLabels: null }, membership: { id: "membership-1" } }); });
  it("returns defaults and saves labels only to the authenticated workspace", async () => {
    let response = await GET(new Request("http://localhost/api/workspace/settings"));
    expect((await response.json()).accountLabels.bank).toBe("Bank");
    response = await PATCH(new Request("http://localhost/api/workspace/settings", { method: "PATCH", body: JSON.stringify({ bank: "Operating cash" }) }));
    expect(response.status).toBe(200);
    expect((await response.json()).accountLabels.bank).toBe("Operating cash");
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "workspace-1" }, data: { accountLabels: expect.objectContaining({ bank: "Operating cash", ar: "AR" }) } });
  });
});
