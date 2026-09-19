import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  console.log("\n=== Uploads with parse errors ===");
  const uploads = await db.fileUpload.findMany({
    select: { id: true, kind: true, filename: true, workspaceId: true, parseErrors: true },
    orderBy: { createdAt: "desc" },
  });
  for (const u of uploads) {
    const errs = Array.isArray(u.parseErrors) ? u.parseErrors : [];
    console.log(`  ${u.id} | ${u.kind} | ${u.filename} | errors=${errs.length}`);
    if (errs.length) console.log("   ", JSON.stringify(errs.slice(0, 3)));
  }

  console.log("\n=== Invoice count:", await db.invoice.count());
  console.log("=== BankTxn count:", await db.bankTxn.count());

  await db.$disconnect();
}

main().catch(console.error);
