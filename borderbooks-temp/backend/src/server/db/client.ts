import {PrismaClient} from "@prisma/client";
const globalForPrisma=globalThis as unknown as {borderbooksPrisma?:PrismaClient};
export const db=globalForPrisma.borderbooksPrisma??new PrismaClient({
  datasources: { db: { url: "postgresql://neondb_owner:npg_9b2mDXEqKWTl@ep-tiny-moon-aejp0uz8-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" } }
});
if(process.env.NODE_ENV!=="production")globalForPrisma.borderbooksPrisma=db;
