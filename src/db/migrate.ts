import fs from "fs";
import path from "path";

// Load .env.local if DATABASE_URL is not present
if (!process.env.DATABASE_URL) {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

import { db } from "./client";

export async function runMigrations() {
  console.log("Starting PostgreSQL schema migrations for AI Content Studio...");

  if (!db.isConfigured) {
    console.log("No live PostgreSQL connection found in DATABASE_URL. Migration script ready for live database provisioning.");
    return;
  }

  const migrationFile = path.join(process.cwd(), "src/db/migrations/001_initial_schema.sql");
  const sql = fs.readFileSync(migrationFile, "utf-8");

  try {
    await db.query(sql);
    console.log("✅ Database migrations completed successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err);
    throw err;
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
