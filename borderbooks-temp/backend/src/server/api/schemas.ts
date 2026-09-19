import { z } from "zod";

export const matchSettingsSchema = z.object({
  dateWindowDaysBefore: z.number().int().nonnegative().optional(),
  dateWindowDaysAfter: z.number().int().nonnegative().optional(),
  minAutoConfidence: z.number().int().min(0).max(100).optional(),
}).strict();

export const createRunSchema = z.object({
  invoiceUploadId: z.string().min(1),
  paymentUploadId: z.string().min(1),
  settings: matchSettingsSchema.optional().default({}),
}).strict();

export const emptyBodySchema = z.object({}).strict();
export const manualLinkSchema = z.object({ invoiceId: z.string().min(1), txnId: z.string().min(1) }).strict();
