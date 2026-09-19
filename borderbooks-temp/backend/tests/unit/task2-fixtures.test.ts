import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const fixture = (name: string) => readFileSync(join(process.cwd(), "tests", "fixtures", name));
const sha = (name: string) => createHash("sha256").update(fixture(name)).digest("hex").toUpperCase();

describe("Task 2 locked fixtures", () => {
  it("matches the byte-level fixture hashes", () => {
    expect(sha("invoices.csv")).toBe("18C1157CD99A0F5671AE50E4C7B0AB1EC4E99A30CC42E2B40EC5A4D9CBDB9440");
    expect(sha("payouts.csv")).toBe("1A9A5F155A1931FC377662C78E9CBF72E90EDDED80CAB90EFE0BDC65109A08CC");
    expect(sha("expected_match.json")).toBe("00A9300E6A6EB058CACDC2DCCFC17A73E970947E2EBC5C149B8B634563394B85");
  });
  it("parses the golden JSON with its locked counts", () => {
    const golden = JSON.parse(fixture("expected_match.json").toString("utf8"));
    expect(golden.links).toHaveLength(7);
    expect(golden.unmatchedInvoices).toHaveLength(5);
    expect(golden.unallocated_in).toHaveLength(6);
    expect(golden.unallocated_out).toEqual(["TXN-11", "TXN-13"]);
    expect(golden.suggestions).toHaveLength(2);
  });
  it("documents all fifteen payout outcomes", () => {
    const readme = fixture("README.md").toString("utf8");
    for (let index = 1; index <= 15; index++) expect(readme).toContain(`TXN-${String(index).padStart(2, "0")}`);
  });
  it("routes the seed through Task 3 parsers only", () => {
    const seed = readFileSync(join(process.cwd(), "prisma", "seed.ts"), "utf8");
    expect(seed).toContain("parseInvoices(invoiceFile");
    expect(seed).toContain("parseBankOrPayout(payoutFile");
    expect(seed).not.toContain("1000000n");
  });
});
