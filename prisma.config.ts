import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env["NEON_DATABASE_URL_UNPOOLED"] ??
      process.env["DATABASE_URL"] ??
      "postgresql://localhost/placeholder",
  },
});
