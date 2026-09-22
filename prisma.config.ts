// Prisma 7: konfigurasi CLI (migrate/push/seed) — URL tidak lagi di schema.prisma
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node --env-file=.env prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
