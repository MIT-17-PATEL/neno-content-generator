import { db } from "./client";
import { hashPassword } from "../lib/auth";

export async function seedDatabase() {
  console.log("Seeding database with default workspace and brand profiles...");

  if (!db.isConfigured) {
    console.log("PostgreSQL DATABASE_URL not set. In-memory data store provides default development seed automatically.");
    return;
  }

  try {
    const passwordHash = await hashPassword("password123");
    const userId = "usr_default_mit";
    const workspaceId = "ws_default_neno";

    // 1. Seed user
    await db.query(
      `INSERT INTO users (id, email, name, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [userId, "mitpatel@nenotechnology.com", "Mit Patel", passwordHash]
    );

    // 2. Seed workspace
    await db.query(
      `INSERT INTO workspaces (id, owner_id, name, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [workspaceId, userId, "Neno Content Engine", "Primary workspace for autonomous content generation"]
    );

    // 3. Seed member
    await db.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (workspace_id, user_id) DO NOTHING`,
      ["mem_default", workspaceId, userId, "owner"]
    );

    // 4. Seed brand settings
    await db.query(
      `INSERT INTO brand_settings (id, workspace_id, brand_name, industry, audience, tone, style_guidelines, preferred_terms, prohibited_terms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (workspace_id) DO NOTHING`,
      [
        "brand_default",
        workspaceId,
        "Neno Technology",
        "Enterprise AI & Cloud Engineering",
        "CTOs, VP of Engineering, Tech Founders",
        "Authoritative, insightful, modern, highly articulate",
        "Concise sentences, data-driven points, no filler phrases.",
        JSON.stringify(["autonomous", "fault-tolerant", "high-velocity", "scalable"]),
        JSON.stringify(["game-changer", "revolutionary", "synergy", "paradigm shift"]),
      ]
    );

    console.log("✅ Seed completed successfully!");
  } catch (err) {
    console.error("❌ Seed error:", err);
    throw err;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
