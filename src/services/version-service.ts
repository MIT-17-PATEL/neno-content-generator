import crypto from "crypto";
import { DbContentVersion } from "@/db/schema";
import { db } from "@/db/client";

const globalForVersions = global as unknown as {
  memoryVersions?: Map<string, DbContentVersion[]>;
};
const memoryVersions: Map<string, DbContentVersion[]> =
  globalForVersions.memoryVersions || new Map<string, DbContentVersion[]>();
if (process.env.NODE_ENV !== "production") {
  globalForVersions.memoryVersions = memoryVersions;
}

if (memoryVersions.size === 0) {
  memoryVersions.set("cnt_demo_blog_1", [
    {
      id: "ver_demo_blog_1",
      content_id: "cnt_demo_blog_1",
      version_number: 1,
      content: `# Building Resilient Agentic Workflows with Next.js 14 and Deep Reasoning

> **Executive Brief**: In modern engineering landscapes, mastering autonomous agent pipelines has shifted from an exploratory advantage to a foundational architectural mandate. This blueprint provides a deep, production-grade analysis.

---

## 1. The Paradigm Shift: Core Challenges and Motivation

Engineering organizations navigating high-velocity scale continually confront a central dilemma: how to balance computational throughput against operational resiliency. Traditional approaches to AI content orchestration introduced severe bottlenecks:

- **Unbounded Latency Spikes**: Cascading timeouts caused by tightly coupled downstream dependencies.
- **State Inconsistencies**: Weakly coordinated distributed data boundaries resulting in non-deterministic failure states.
- **Operational Overhead**: Excessive manual intervention required to re-balance workloads under uneven traffic spikes.

\`\`\`
┌──────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│ Ingress Traffic  │ ────► │ Decoupled Processing │ ────► │ Verified State  │
│ Telemetry Guard  │       │ Circuit Breakers     │       │ Storage Tier    │
└──────────────────┘       └──────────────────────┘       └─────────────────┘
\`\`\`

---

## 2. Architectural Blueprint & Key Primitives

Designing a resilient solution requires combining proven design patterns with strict operational discipline.

1. **Deterministic State Management**: Enforce immutable event logs and idempotency keys.
2. **Autonomous Fault Isolation**: Isolate volatile worker processes behind robust circuit-breaking layers.
3. **Observability First**: Embed structured tracing headers and distributed spans into every payload.

---

## 3. Benchmarks, Tradeoffs, and Failure Modes

| Metric Dimension | Baseline Architecture | Modern Resilient Pipeline | Variance Impact |
| :--- | :--- | :--- | :--- |
| **P99 Response Latency** | 420ms | 48ms | **-88.5% Latency** |
| **Peak Throughput (Req/s)** | 2,400 rps | 18,500 rps | **+670% Capacity** |
| **Failure Recovery Time (MTTR)** | 14.2 minutes | < 1.8 seconds | **Autonomous Restoration** |
| **Infrastructure Unit Cost** | $1.42 / 1k ops | $0.28 / 1k ops | **-80% Spend** |

---

## Summary & Next Actions

Adopting these architectural patterns enables teams to operate at maximum velocity without sacrificing reliability.`,
      seo_metadata: {
        seoTitle: "Building Resilient Agentic Workflows with Next.js 14",
        metaDescription: "Explore architectural patterns, latency benchmarks, and resilience strategies for autonomous multi-agent pipelines.",
        keywords: ["agentic ai", "nextjs 14", "resilience", "microservices"],
        slug: "building-resilient-agentic-workflows-nextjs-14",
      },
      created_by: "usr_default_mit",
      created_at: new Date(),
    },
  ]);
}

export class VersionService {
  static async listByContent(contentId: string): Promise<DbContentVersion[]> {
    if (db.isConfigured) {
      const res = await db.query<DbContentVersion>(
        "SELECT * FROM content_versions WHERE content_id = $1 ORDER BY version_number DESC",
        [contentId]
      );
      return res.rows;
    }

    return (memoryVersions.get(contentId) || []).sort(
      (a, b) => b.version_number - a.version_number
    );
  }

  static async getLatest(contentId: string): Promise<DbContentVersion | null> {
    const versions = await this.listByContent(contentId);
    return versions[0] || null;
  }

  static async createVersion(data: {
    contentId: string;
    content: string;
    seoMetadata?: Record<string, unknown>;
    generationRunId?: string;
    createdBy?: string;
  }): Promise<DbContentVersion> {
    const existing = await this.listByContent(data.contentId);
    const nextVersionNumber = existing.length > 0 ? existing[0].version_number + 1 : 1;
    const id = `ver_${crypto.randomUUID().slice(0, 8)}`;

    const newVersion: DbContentVersion = {
      id,
      content_id: data.contentId,
      version_number: nextVersionNumber,
      content: data.content,
      seo_metadata: data.seoMetadata || {},
      generation_run_id: data.generationRunId,
      created_by: data.createdBy || "system",
      created_at: new Date(),
    };

    if (db.isConfigured) {
      const query = `
        INSERT INTO content_versions (id, content_id, version_number, content, seo_metadata, generation_run_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const res = await db.query<DbContentVersion>(query, [
        newVersion.id,
        newVersion.content_id,
        newVersion.version_number,
        newVersion.content,
        JSON.stringify(newVersion.seo_metadata),
        newVersion.generation_run_id,
        newVersion.created_by,
      ]);

      // Update current_version_id on content_items
      await db.query(
        "UPDATE content_items SET current_version_id = $1, updated_at = NOW() WHERE id = $2",
        [id, data.contentId]
      );

      return res.rows[0];
    }

    const currentList = memoryVersions.get(data.contentId) || [];
    currentList.unshift(newVersion);
    memoryVersions.set(data.contentId, currentList);
    return newVersion;
  }
}
