import { callAiStructured, isAiConfigured } from "@/lib/ai/ai-client";
import { db } from "@/db/client";

export interface TrendingTopicsRequest {
  category?: string;
  count?: number;
  industry?: string;
  focusArea?: string;
  workspaceId?: string;
}

export interface TrendingTopicItem {
  title: string;
  category: string;
  tagline?: string;
}

export interface TrendingTopicsResponse {
  success: boolean;
  topics: string[];
  items?: TrendingTopicItem[];
  source: "live_internet_trending" | "live_ai_synthesis" | "dynamic_knowledge_pool";
  category: string;
}

// Dynamic knowledge bank of 60+ cutting-edge technical topics across domains
const DYNAMIC_TECH_DOMAINS: Record<string, string[]> = {
  "Enterprise AI & Cloud Engineering": [
    "Agentic Workflows vs. Static DAGs: Building Resilient Multi-Agent Production Systems",
    "Deterministic Guardrails & Telemetry for Production Enterprise LLMs",
    "Autonomous Model Governance & Continuous Compliance in Regulated AI",
    "Forward Deployed Engineering: Architecting Custom AI Solutions Inside Enterprise Teams",
    "LLM Context Caching & KV Cache Compression: Real-World Latency Benchmarks",
    "Graph RAG vs. Dense Vector Retrieval: Architectural Tradeoffs for Enterprise Knowledge Bases",
    "Low-Latency Streaming Audio Pipelines for Real-Time Conversational AI",
    "Fine-Tuning vs. Few-Shot RAG: Quantifying Accuracy, Cost, and Drift Over Time",
    "Self-Healing LLM Pipelines: Automated Error Recovery and Tool Fallbacks in Production",
    "Multi-Modal Document Understanding: Extracting Structured Data from Complex Enterprise PDFs",
  ],
  "Enterprise AI & Architecture": [
    "Agentic Workflows vs. Static DAGs: Building Resilient Multi-Agent Production Systems",
    "Deterministic Guardrails & Telemetry for Production Enterprise LLMs",
    "Autonomous Model Governance & Continuous Compliance in Regulated AI",
    "Forward Deployed Engineering: Architecting Custom AI Solutions Inside Enterprise Teams",
    "LLM Context Caching & KV Cache Compression: Real-World Latency Benchmarks",
    "Graph RAG vs. Dense Vector Retrieval: Architectural Tradeoffs for Enterprise Knowledge Bases",
    "Low-Latency Streaming Audio Pipelines for Real-Time Conversational AI",
    "Fine-Tuning vs. Few-Shot RAG: Quantifying Accuracy, Cost, and Drift Over Time",
    "Self-Healing LLM Pipelines: Automated Error Recovery and Tool Fallbacks in Production",
    "Multi-Modal Document Understanding: Extracting Structured Data from Complex Enterprise PDFs",
  ],
  "Cloud & Kubernetes Engineering": [
    "Designing Zero-Trust Architecture for Microservices in Kubernetes",
    "Hybrid Cloud FinOps: Optimizing GPU Compute Allocation and Cloud Spend",
    "eBPF-Driven Observability: Kernel-Level Telemetry for High-Throughput Kubernetes Clusters",
    "Multi-Region Active-Active Deployments with CockroachDB and Global Service Meshes",
    "Serverless vs. Provisioned Containers: Cost and Cold-Start Analysis at 50,000 RPS",
    "GitOps at Scale: Managing 1,000+ Microservice Deployments with ArgoCD and Helm",
    "Zero-Downtime Database Schema Migrations in Continuous Delivery Pipelines",
    "Platform Engineering: Designing Developer Self-Service Portals with Backstage",
  ],
  "Cybersecurity & Zero Trust": [
    "Zero-Trust Architecture for Multi-Tenant Kubernetes Clusters",
    "Post-Quantum Cryptography: Preparing Enterprise Key Infrastructure for NIST Standards",
    "Automated Threat Modeling in CI/CD: Detecting Vulnerabilities Before Production",
    "Passkey Authentication & WebAuthn: Deprecating Passwords in Modern Enterprise SaaS",
    "Runtime Application Self-Protection (RASP) in Cloud-Native Microservices",
    "Zero-Knowledge Proofs for Privacy-Preserving Enterprise Identity Verification",
    "Supply Chain Security: Signing and Verifying Container Artifacts with Sigstore and Cosign",
  ],
  "Frontend & Microfrontends": [
    "Event-Driven Microfrontends: Real-World Latency Benchmarks and Strategic ROI",
    "Module Federation in Webpack and Vite: Shared Dependencies and Version Drift Strategies",
    "Server-Driven UI (SDUI): Rendering Native Experiences from Dynamic Backend Payloads",
    "Web Workers and OffscreenCanvas: Offloading Compute-Intensive Calculations in Web Apps",
    "Streaming SSR and Selective Hydration: Optimizing Core Web Vitals for Heavy SPAs",
    "Resumable Frameworks vs. Rehydration: The Architecture Behind Ultra-Fast First Input Delay",
    "Microfrontend State Management: Bridging Custom Events, Shared Stores, and Web Components",
  ],
  "Data Engineering & Distributed Systems": [
    "Real-Time Vector Search & Semantic Caching: Slashing LLM Latency by 80%",
    "Apache Iceberg vs. Delta Lake: Choosing an Open Table Format for Lakehouse Architecture",
    "Event Sourcing and CQRS at Scale: Lessons from Processing 10 Billion Events Daily",
    "Kafka Streams vs. Apache Flink: Architectural Comparison for Sub-Second Analytics",
    "Columnar Storage and Vectorized Execution: Why Modern OLAP Engines Are 100x Faster",
    "Data Mesh Implementation: Decentralizing Data Governance Across Enterprise Domains",
    "Change Data Capture (CDC) with Debezium: Building Real-Time Replication Pipelines",
  ],
  "Fintech & High-Frequency Systems": [
    "Autonomous Multi-Agent Orchestration Patterns in High-Throughput Fintech",
    "Ultra-Low Latency Order Matching Engines: C++ Memory Layout and Lock-Free Queues",
    "Real-Time Fraud Detection with Graph Neural Networks and Feature Stores",
    "ISO 20022 Migration: Modernizing Financial Messaging Pipelines with Distributed Microservices",
    "Idempotency and Distributed Transactions in Financial Settlement Systems",
    "Event-Driven Core Banking: Transitioning from Legacy Mainframes to Cloud Ledger Systems",
  ],
};

let rotationOffset = 0;

export class TrendingTopicsService {
  /**
   * Fetch or synthesize trending technical topics based on live internet tech feeds and category,
   * automatically filtering out any topics already used or present in the content library.
   */
  static async getTrendingTopics(params: TrendingTopicsRequest = {}): Promise<TrendingTopicsResponse> {
    const count = Math.max(1, Math.min(10, params.count || 5));
    const targetCategory = params.category || "Enterprise AI & Cloud Engineering";

    // 0. Query existing library titles to strictly avoid repeating used topics
    const existingTopics = await this.getExistingLibraryTopics(params.workspaceId);

    // 1. Fetch live headlines from Hacker News and Dev.to in real-time
    const liveInternetHeadlines = await this.fetchLiveInternetTechHeadlines();

    // 2. If AI is configured, try synthesizing fresh topics
    if (isAiConfigured()) {
      try {
        const aiTopics = await this.synthesizeTrendingWithAi(
          targetCategory,
          count + 5, // fetch extra so we have enough after filtering
          params.industry,
          liveInternetHeadlines
        );
        if (aiTopics && aiTopics.length > 0) {
          const freshAiTopics = aiTopics.filter((t) => !this.isDuplicateTopic(t, existingTopics));
          if (freshAiTopics.length >= count) {
            return {
              success: true,
              topics: this.shuffleArray(freshAiTopics).slice(0, count),
              source: liveInternetHeadlines.length > 0 ? "live_internet_trending" : "live_ai_synthesis",
              category: targetCategory,
            };
          }
        }
      } catch (err) {
        console.warn("Live AI trending topics synthesis fallback:", err);
      }
    }

    // 3. Process, deduplicate and rotate live internet headlines
    if (liveInternetHeadlines.length > 0) {
      const cleaned = liveInternetHeadlines
        .map((h) => this.cleanHeadline(h))
        .filter((h) => h.length > 18 && !this.isMetaPost(h) && !this.isDuplicateTopic(h, existingTopics));

      if (cleaned.length >= count) {
        const currentOffset = rotationOffset % Math.max(1, cleaned.length - count);
        rotationOffset = (rotationOffset + count) % cleaned.length;

        const rotatedBatch = cleaned.slice(currentOffset, currentOffset + count);
        if (rotatedBatch.length >= count) {
          return {
            success: true,
            topics: rotatedBatch,
            source: "live_internet_trending",
            category: targetCategory,
          };
        }

        const shuffled = this.shuffleArray(cleaned).slice(0, count);
        return {
          success: true,
          topics: shuffled,
          source: "live_internet_trending",
          category: targetCategory,
        };
      }
    }

    // 4. Dynamic Rotating Knowledge Pool (Filtered against existing library topics)
    const categoryPool = DYNAMIC_TECH_DOMAINS[targetCategory] || this.getAllTopicsFlat();
    const freshCategoryPool = categoryPool.filter((t) => !this.isDuplicateTopic(t, existingTopics));
    const fallbackPool = freshCategoryPool.length >= count ? freshCategoryPool : categoryPool;
    const shuffled = this.shuffleArray([...fallbackPool]);
    const selected = shuffled.slice(0, count);

    return {
      success: true,
      topics: selected,
      source: "dynamic_knowledge_pool",
      category: targetCategory,
    };
  }

  /**
   * Retrieve all existing article titles & slugs from the database to prevent duplicate topic suggestions.
   */
  private static async getExistingLibraryTopics(workspaceId?: string): Promise<Set<string>> {
    const existing = new Set<string>();
    try {
      if (db.isConfigured) {
        const query = workspaceId
          ? "SELECT title, slug FROM content_items WHERE workspace_id = $1 AND deleted_at IS NULL"
          : "SELECT title, slug FROM content_items WHERE deleted_at IS NULL";
        const params = workspaceId ? [workspaceId] : [];
        const res = await db.query<{ title: string; slug: string }>(query, params);
        for (const row of res.rows) {
          if (row.title) existing.add(this.normalizeTopic(row.title));
          if (row.slug) existing.add(this.normalizeTopic(row.slug));
        }
      }
    } catch (err) {
      console.warn("Could not query existing content items for deduplication:", err);
    }
    return existing;
  }

  private static normalizeTopic(t: string): string {
    return t.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  private static isDuplicateTopic(candidate: string, existingNormalized: Set<string>): boolean {
    if (existingNormalized.size === 0) return false;
    const norm = this.normalizeTopic(candidate);
    if (existingNormalized.has(norm)) return true;

    // Substring or prefix overlap check
    for (const ex of existingNormalized) {
      if (ex.length > 15 && norm.length > 15) {
        if (norm.includes(ex) || ex.includes(norm)) return true;
        // Check 80% prefix match
        const prefixLen = Math.min(ex.length, norm.length);
        if (prefixLen > 20 && ex.slice(0, 20) === norm.slice(0, 20)) return true;
      }
    }
    return false;
  }

  private static cleanHeadline(title: string): string {
    return title
      .replace(/^Show HN:\s*/i, "")
      .replace(/^Ask HN:\s*/i, "")
      .replace(/^Tell HN:\s*/i, "")
      .replace(/\s*\[pdf\]\s*$/i, "")
      .replace(/\s*\[video\]\s*$/i, "")
      .replace(/\s*\(\d{4}\)\s*$/i, "")
      .trim();
  }

  private static isMetaPost(title: string): string | boolean {
    const lower = title.toLowerCase();
    return (
      lower.startsWith("what was your") ||
      lower.startsWith("who is hiring") ||
      lower.startsWith("who wants to be hired") ||
      lower.startsWith("ask hn") ||
      lower.includes("what are you working on")
    );
  }

  /**
   * Query public real-time tech feeds from the internet (Hacker News Front, Top Stories, Dev.to).
   */
  private static async fetchLiveInternetTechHeadlines(): Promise<string[]> {
    const headlines: string[] = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      // Hacker News Front Page
      const hnFrontPromise = fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=30", {
        signal: controller.signal,
        headers: { "User-Agent": "AIContentStudio/2.0" },
      })
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data.hits) ? data.hits.map((h: { title?: string }) => h.title || "").filter((t: string) => t.length > 15) : [];
        })
        .catch(() => []);

      // Hacker News Top Engineering Stories
      const hnTopPromise = fetch("https://hn.algolia.com/api/v1/search?tags=story&numericFilters=points>50&hitsPerPage=30", {
        signal: controller.signal,
        headers: { "User-Agent": "AIContentStudio/2.0" },
      })
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data.hits) ? data.hits.map((h: { title?: string }) => h.title || "").filter((t: string) => t.length > 15) : [];
        })
        .catch(() => []);

      // Dev.to Top Technical Articles
      const devPromise = fetch("https://dev.to/api/articles?per_page=25&top=7", {
        signal: controller.signal,
        headers: { "User-Agent": "AIContentStudio/2.0" },
      })
        .then(async (res) => {
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data.map((a: { title?: string }) => a.title || "").filter((t: string) => t.length > 15) : [];
        })
        .catch(() => []);

      const [hnFront, hnTop, devTitles] = await Promise.all([hnFrontPromise, hnTopPromise, devPromise]);
      clearTimeout(timeout);

      // Combine and eliminate duplicates
      const unique = Array.from(new Set([...hnFront, ...hnTop, ...devTitles]));
      headlines.push(...unique);
    } catch {
      // Graceful ignore
    }

    return headlines;
  }

  /**
   * Use live AI to transform live internet signals into high-impact, non-repetitive enterprise topics.
   */
  private static async synthesizeTrendingWithAi(
    category: string,
    count: number,
    industry?: string,
    liveInternetSignals: string[] = []
  ): Promise<string[] | null> {
    const timestamp = new Date().toISOString();
    const liveSignalsText =
      liveInternetSignals.length > 0
        ? `REAL-TIME LIVE TECH DISCUSSIONS RIGHT NOW:\n${liveInternetSignals.slice(0, 15).map((s) => `- ${s}`).join("\n")}`
        : "Latest industry developments in distributed systems, modern AI models, cloud security, and web architectures.";

    const systemPrompt = `You are a Chief Technology Editor & Silicon Valley Tech Radar Analyst specializing in cutting-edge enterprise software engineering, AI breakthroughs, cloud infrastructure, and modern systems architecture.
Your task is to generate ${count} FRESH, HIGH-IMPACT, REAL-WORLD TRENDING technical blog post topics.

${liveSignalsText}

RULES FOR TOPIC CREATION:
1. GROUNDED IN TODAY'S TECH WORLD: Reflect genuine current tech engineering conversations, new breakthroughs, and architectural shifts.
2. FOCUS ON REAL-WORLD TECHNICAL SUBSTANCE: Use real architectural terms, frameworks, paradigms, metrics, and benchmarks (e.g. eBPF, Model Context Caching, Post-Quantum Cryptography, Event-Driven Microfrontends, Graph RAG, Apache Iceberg, Zero-Trust, Server-Driven UI).
3. SOUND LIKE A PRINCIPAL ENGINEER: Avoid shallow beginner clickbait ("Top 5 tips", "What is AI"). Focus on architectural tradeoffs, latency benchmarks, scalability patterns, and enterprise ROI.
4. FRESHNESS & VARIETY: Generate completely original, contemporary topics reflecting today's cutting-edge developments in technology.
5. NO NUMBERING OR BULLETS IN STRINGS: Return clean title strings.

Return JSON in this format:
{
  "topics": [
    "Topic Title 1",
    "Topic Title 2",
    ...
  ]
}`;

    const userPrompt = `Generate ${count} brand-new, trending technical article topics.
Category: ${category}
${industry ? `Industry Focus: ${industry}` : ""}
Reference Timestamp: ${timestamp}
Generate diverse, cutting-edge topics that engineers, architects, and tech leaders want to read today.`;

    const res = await callAiStructured<{ topics: string[] }>({
      systemPrompt,
      userPrompt,
    });

    if (res && Array.isArray(res.topics) && res.topics.length > 0) {
      return res.topics.filter((t) => typeof t === "string" && t.trim().length > 10);
    }

    return null;
  }

  private static getAllTopicsFlat(): string[] {
    const flat: string[] = [];
    for (const list of Object.values(DYNAMIC_TECH_DOMAINS)) {
      flat.push(...list);
    }
    return flat;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
