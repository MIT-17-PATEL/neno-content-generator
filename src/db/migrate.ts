import fs from "fs";
import path from "path";
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
