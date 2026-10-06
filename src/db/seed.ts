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
    const userRes = await db.query(
      `INSERT INTO users (id, email, name, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [userId, "mitpatel@nenotechnology.com", "Mit Patel", passwordHash]
    );
    const activeUserId = userRes.rows[0]?.id || userId;

    // 2. Seed workspace
    await db.query(
      `INSERT INTO workspaces (id, owner_id, name, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET owner_id = EXCLUDED.owner_id`,
      [workspaceId, activeUserId, "Neno Content Engine", "Primary workspace for autonomous content generation"]
    );

    // 3. Seed member
    await db.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (workspace_id, user_id) DO NOTHING`,
      ["mem_default", workspaceId, activeUserId, "owner"]
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

    // 5. Seed initial published content items and versions
    const posts = [
      {
        id: "cnt_demo_blog_1",
        type: "blog",
        title: "Building Resilient Agentic Workflows with Next.js 14 and Deep Reasoning",
        slug: "building-resilient-agentic-workflows-nextjs-14",
        status: "approved",
        category: "AI Architecture",
        excerpt: "In modern engineering landscapes, mastering autonomous agent pipelines has shifted from an exploratory advantage to a foundational architectural mandate. This blueprint provides a deep, production-grade analysis.",
        versionId: "ver_demo_blog_1",
        content: `# Building Resilient Agentic Workflows with Next.js 14 and Deep Reasoning\n\n> **Executive Brief**: In modern engineering landscapes, mastering autonomous agent pipelines has shifted from an exploratory advantage to a foundational architectural mandate.\n\n## 1. The Paradigm Shift\nEngineering organizations navigating scale confront a central dilemma: balancing computational throughput against operational resiliency.\n\n## 2. Key Architecture Primitives\n1. Deterministic State Management\n2. Autonomous Fault Isolation\n3. Observability First\n\n## 3. Benchmarks\n- P99 Latency: 48ms (-88.5%)\n- Peak Throughput: 18,500 rps (+670%)`,
        seo: {
          seoTitle: "Building Resilient Agentic Workflows with Next.js 14",
          metaDescription: "Explore architectural patterns, latency benchmarks, and resilience strategies for autonomous multi-agent pipelines.",
          keywords: ["agentic ai", "nextjs 14", "resilience", "microservices"],
          slug: "building-resilient-agentic-workflows-nextjs-14",
          author: "Mit Patel",
          readingTime: "5 min read",
        },
      },
      {
        id: "cnt_demo_blog_2",
        type: "blog",
        title: "Event-Driven Microfrontends: Real-World Latency Benchmarks and ROI",
        slug: "event-driven-microfrontends-real-world-latency-benchmarks-roi",
        status: "approved",
        category: "Frontend & Architecture",
        excerpt: "Quantifying sub-50ms latency gains, module federation strategies, and enterprise ROI across distributed engineering teams.",
        versionId: "ver_demo_blog_2",
        content: `# Event-Driven Microfrontends: Real-World Latency Benchmarks and ROI\n\n> **Executive Brief**: Transitioning from monolithic SPAs to distributed microfrontends cuts initial bundle parse time by 78%.\n\n## 1. Architectural Foundation\nDecouple domain modules behind custom event buses and asynchronous boundary loaders.\n\n## 2. Measured Improvements\n- Initial JS Bundle: 340 KB (-92.9%)\n- FCP: 0.38s (4.8x faster)`,
        seo: {
          seoTitle: "Event-Driven Microfrontends: Real-World Latency Benchmarks and ROI",
          metaDescription: "Quantifying sub-50ms latency gains, module federation strategies, and enterprise ROI across distributed engineering teams.",
          keywords: ["microfrontends", "module federation", "frontend architecture", "latency"],
          slug: "event-driven-microfrontends-real-world-latency-benchmarks-roi",
          author: "Mit Patel",
          readingTime: "6 min read",
        },
      },
      {
        id: "cnt_demo_blog_3",
        type: "blog",
        title: "Designing Zero-Trust Architecture for Microservices in Kubernetes",
        slug: "designing-zero-trust-architecture-for-microservices-in-kubernetes",
        status: "approved",
        category: "Cloud & Kubernetes",
        excerpt: "A comprehensive guide to implementing identity-driven service meshes, mTLS, and eBPF kernel telemetry without performance degradation.",
        versionId: "ver_demo_blog_3",
        content: `# Designing Zero-Trust Architecture for Microservices in Kubernetes\n\n> **Executive Brief**: Zero-Trust Architecture mandates continuous identity verification, mutual TLS (mTLS), and kernel-level eBPF observability.\n\n## 1. Zero-Trust Triad\n1. Cryptographic Workload Identity (SPIFFE/SPIRE)\n2. Deterministic Service Meshes (mTLS)\n3. eBPF-Driven Runtime Enforcement`,
        seo: {
          seoTitle: "Designing Zero-Trust Architecture for Microservices in Kubernetes",
          metaDescription: "A comprehensive guide to implementing identity-driven service meshes, mTLS, and eBPF kernel telemetry.",
          keywords: ["zero trust", "kubernetes", "ebpf", "cybersecurity", "mtls"],
          slug: "designing-zero-trust-architecture-for-microservices-in-kubernetes",
          author: "Mit Patel",
          readingTime: "7 min read",
        },
      },
    ];

    for (const post of posts) {
      await db.query(
        `INSERT INTO content_items (id, workspace_id, type, title, slug, status, category, excerpt, current_version_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           slug = EXCLUDED.slug,
           status = EXCLUDED.status,
           category = EXCLUDED.category,
           excerpt = EXCLUDED.excerpt,
           current_version_id = EXCLUDED.current_version_id`,
        [
          post.id,
          workspaceId,
          post.type,
          post.title,
          post.slug,
          post.status,
          post.category,
          post.excerpt,
          post.versionId,
          activeUserId,
        ]
      );

      await db.query(
        `INSERT INTO content_versions (id, content_id, version_number, content, seo_metadata, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           content = EXCLUDED.content,
           seo_metadata = EXCLUDED.seo_metadata`,
        [
          post.versionId,
          post.id,
          1,
          post.content,
          JSON.stringify(post.seo),
          activeUserId,
        ]
      );
    }

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
