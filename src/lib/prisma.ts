import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://localhost/placeholder";

  // Pass pool config to adapter - it will manage the pool internally
  const adapter = new PrismaPg({
    connectionString,
    max: 10, // Limit connections for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Prevent hanging on bad connections
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
