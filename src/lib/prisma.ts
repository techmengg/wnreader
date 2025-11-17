import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Connection pool settings for better performance
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
if (
  process.env.NODE_ENV === "production" &&
  typeof globalThis.process !== "undefined" &&
  typeof globalThis.process.on === "function"
) {
  globalThis.process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}
