import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // For migrations, use DIRECT_URL (port 5432, direct connection)
    // Fallback to old Neon env vars for backwards compatibility
    url:
      process.env["DIRECT_URL"] ??
      process.env["NEON_DATABASE_URL_UNPOOLED"] ??
      process.env["DATABASE_URL"] ??
      "postgresql://localhost/placeholder",
  },
});
