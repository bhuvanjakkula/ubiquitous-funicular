export type RetentionDatabase = {
  fileUpload: { findMany(args: { where: { createdAt: { lt: Date } }; select: { id: true; workspaceId: true } }): Promise<Array<{ id: string; workspaceId: string }>> };
};

export function fileRetentionDays(value = process.env.FILE_RETENTION_DAYS) {
  if (value === undefined || value === "") return 30;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1) throw new Error("FILE_RETENTION_DAYS must be a positive integer");
  return days;
}

export async function deleteExpiredUploadBytes(database: RetentionDatabase, remove: (workspaceId: string, uploadId: string) => Promise<void>, now = new Date()) {
  const cutoff = new Date(now.getTime() - fileRetentionDays() * 86_400_000);
  const uploads = await database.fileUpload.findMany({ where: { createdAt: { lt: cutoff } }, select: { id: true, workspaceId: true } });
  await Promise.all(uploads.map((upload) => remove(upload.workspaceId, upload.id)));
  return { cutoff, deletedBytesForUploads: uploads.length };
}
