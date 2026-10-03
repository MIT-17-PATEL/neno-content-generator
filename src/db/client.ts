import { Pool, QueryResult, QueryResultRow } from "pg";

class DatabaseClient {
  private pool: Pool | null = null;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString && !connectionString.includes("localhost:5432/ai_content_studio")) {
      try {
        this.pool = new Pool({
          connectionString,
          ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
      } catch (err) {
        console.warn("Database Pool initialization notice:", err);
      }
    }
  }

  get isConfigured(): boolean {
    return this.pool !== null;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error("DATABASE_URL is not connected. Configure DATABASE_URL in .env.local to run live PostgreSQL queries.");
    }
    return this.pool.query<T>(text, params);
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Global singleton for Next.js hot-reloading
const globalForDb = global as unknown as { dbClient?: DatabaseClient };
export const db = globalForDb.dbClient || new DatabaseClient();
if (process.env.NODE_ENV !== "production") globalForDb.dbClient = db;
