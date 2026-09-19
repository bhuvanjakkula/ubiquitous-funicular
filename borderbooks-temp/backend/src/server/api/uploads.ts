import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { parseBankOrPayout, parseInvoices } from "../parsers";
import { ApiError, type ApiContext } from "./context";
import { deleteUploadFile, saveUploadFile } from "./storage";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function persistUpload(context: ApiContext, kind: "invoices" | "payments", filename: string, bytes: Buffer) {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new ApiError(413, "FILE_TOO_LARGE", "Uploads must be 20MB or smaller");
  const invoiceParse = kind === "invoices" ? parseInvoices(bytes, filename) : undefined;
  const txnParse = kind === "payments" ? parseBankOrPayout(bytes, filename) : undefined;
  const errors = invoiceParse?.errors ?? txnParse?.errors ?? [];
  const rowCount = invoiceParse?.rows.length ?? txnParse?.rows.length ?? 0;
  const upload = await context.db.fileUpload.create({
    data: { workspaceId: context.workspace.id, kind: kind === "invoices" ? "INVOICES" : "PAYMENTS", filename, byteSize: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), parseErrors: errors as unknown as Prisma.InputJsonValue },
  });
  try {
    await context.db.$transaction(async (tx) => {
      if (invoiceParse) {
        for (const row of invoiceParse.rows) await tx.invoice.upsert({
          where: { workspaceId_fingerprint: { workspaceId: context.workspace.id, fingerprint: row.fingerprint } },
          update: { uploadId: upload.id },
          create: { workspaceId: context.workspace.id, uploadId: upload.id, invoiceNumber: row.invoiceNumber, customerName: row.customerName, currency: row.currency, amountMinor: row.amountMinor, issueDate: new Date(`${row.issueDate}T00:00:00Z`), dueDate: new Date(`${row.dueDate}T00:00:00Z`), reference: row.reference, rawJson: row.rawJson, fingerprint: row.fingerprint },
        });
      } else if (txnParse) {
        for (const row of txnParse.rows) await tx.bankTxn.upsert({
          where: { workspaceId_fingerprint: { workspaceId: context.workspace.id, fingerprint: row.fingerprint } },
          update: { uploadId: upload.id },
          create: { workspaceId: context.workspace.id, uploadId: upload.id, source: row.source, vendorId: row.vendorId, postedAt: new Date(`${row.postedAt}T00:00:00Z`), valueDate: row.valueDate ? new Date(`${row.valueDate}T00:00:00Z`) : null, currency: row.currency, amountMinor: row.amountMinor, description: row.description, counterparty: row.counterparty, reference: row.reference, endToEndId: row.endToEndId, rawJson: row.rawJson, fingerprint: row.fingerprint },
        });
      }
      await tx.auditEvent.create({ data: { workspaceId: context.workspace.id, userId: context.user.id, action: "UPLOAD", payload: { uploadId: upload.id, kind, filename, rowCount, errorCount: errors.length } } });
    });
  } catch (error) {
    await context.db.fileUpload.delete({ where: { id: upload.id } }).catch(() => undefined);
    throw error instanceof Error ? error : new Error("Upload persistence failed");
  }
  return { ...upload, rowCount };
}
