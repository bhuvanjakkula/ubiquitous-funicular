import { db } from "@/server/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.$executeRawUnsafe(`ALTER TABLE "MatchLink" ADD COLUMN IF NOT EXISTS "fxRate" DECIMAL(65,30);`);
    await db.$executeRawUnsafe(`ALTER TABLE "MatchLink" ADD COLUMN IF NOT EXISTS "fxSource" TEXT;`);
    
    // Also mark the migration as applied in the prisma migrations table if it exists
    await db.$executeRawUnsafe(`
      INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (
        gen_random_uuid()::text,
        'manual-migration',
        now(),
        '20260904100000_add_fx_rate',
        null,
        null,
        now(),
        1
      ) ON CONFLICT DO NOTHING;
    `).catch(() => {});

    return NextResponse.json({ success: true, message: "Database schema successfully updated!" });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
