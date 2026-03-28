import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL ?? "postgresql://localhost/placeholder";

  // Create a pg Pool instance first
  const pool = new Pool({
    connectionString,
    max: 10, // Limit connections for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Prevent hanging on bad connections
  });

  // Pass the pool to the PrismaPg adapter
  // Type assertion to resolve @types/pg version mismatch between pg and @prisma/adapter-pg
  const adapter = new PrismaPg(pool as never);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
