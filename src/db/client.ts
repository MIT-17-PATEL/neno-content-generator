import { Pool, QueryResult, QueryResultRow } from "pg";

class DatabaseClient {
  private pool: Pool | null = null;

  constructor() {
    this.initPool();
  }

  private initPool() {
    const connectionString = process.env.DATABASE_URL;
    if (
      connectionString &&
      !connectionString.includes("localhost:5432/ai_content_studio") &&
      !connectionString.includes("your-rds-endpoint") &&
      !connectionString.includes("your_database_name") &&
      !connectionString.includes("your-db")
    ) {
      try {
        const isRemote =
          connectionString.includes("rds.amazonaws.com") ||
          connectionString.includes("sslmode=") ||
          process.env.NODE_ENV === "production" ||
          !connectionString.includes("localhost");

        // Strip sslmode from query string so pg does not override the custom ssl configuration object
        let cleanUrl = connectionString;
        if (cleanUrl.includes("sslmode=")) {
          cleanUrl = cleanUrl.replace(/([?&])sslmode=[^&]+(&|$)/, "$1").replace(/[?&]$/, "");
        }

        this.pool = new Pool({
          connectionString: cleanUrl,
          ssl: isRemote ? { rejectUnauthorized: false } : false,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });

        this.pool.on("error", (err) => {
          console.warn("PostgreSQL Pool background error:", err.message);
        });
      } catch (err) {
        console.warn("Database Pool initialization notice:", err);
        this.pool = null;
      }
    } else {
      this.pool = null;
    }
  }

  get isConfigured(): boolean {
    if (!this.pool) {
      this.initPool();
    }
    const connectionString = process.env.DATABASE_URL;
    if (
      !connectionString ||
      connectionString.includes("localhost:5432/ai_content_studio") ||
      connectionString.includes("your-rds-endpoint") ||
      connectionString.includes("your_database_name") ||
      connectionString.includes("your-db")
    ) {
      return false;
    }
    return this.pool !== null;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      this.initPool();
    }
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

export const db = new DatabaseClient();
