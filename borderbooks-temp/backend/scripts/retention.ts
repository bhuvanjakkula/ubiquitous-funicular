import { db } from "../src/server/db/client";
import { deleteExpiredUploadBytes } from "../src/server/files/retention";
import { deleteUploadFile } from "../src/server/api/storage";

try {
  const result = await deleteExpiredUploadBytes(db, deleteUploadFile);
  console.log(`Deleted local bytes for ${result.deletedBytesForUploads} upload(s) created before ${result.cutoff.toISOString()}. Database history was retained.`);
} finally {
  await db.$disconnect();
}
