import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Force re-create if reviews relation is not yet initialized on client
if (globalForPrisma.prisma && !(globalForPrisma.prisma as any).courseReview) {
  globalForPrisma.prisma = undefined;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
