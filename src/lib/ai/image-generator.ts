import { ImageAspectRatio, ImageStylePreset } from "@/types";
import { VisualConceptEngine, ArticleContext, VisualConcept } from "./visual-concept-engine";

export interface GenerateImageOptions extends ArticleContext {
  topic: string;
  category?: string;
  summary?: string;
  keyConcepts?: string[];
  industry?: string;
  articleType?: "blog" | "case-study" | "research" | "technical-guide";
  style?: ImageStylePreset;
  aspectRatio?: ImageAspectRatio;
  customPrompt?: string;
  brandName?: string;
  previousStyles?: ImageStylePreset[];
}

export interface GeneratedImageResult {
  title: string;
  prompt: string;
  altText: string;
  publicUrl: string;
  storageKey: string;
  aspectRatio: ImageAspectRatio;
  style: ImageStylePreset;
  visualConcept?: string;
  colorPalette?: string;
  domainKey?: string;
}

interface CuratedEditorialPhoto {
  keywords: string[];
  url: string;
  title: string;
  category: string;
}

const CURATED_EDITORIAL_PHOTOS: CuratedEditorialPhoto[] = [
  // 1. Art, Cartoons, Illustration & Creative
  {
    keywords: ["cartoon", "drawing", "sketch", "comic", "signature", "artist", "illustration", "new yorker", "creative", "paint", "canvas"],
    url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Digital Art & Illustration",
    category: "Art & Design",
  },
  {
    keywords: ["art", "design", "graphic", "ui", "ux", "visual", "typography", "poster", "brand"],
    url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Creative Visual Design",
    category: "Design",
  },

  // 2. AI, ChatGPT, OpenAI, Anthropic, LLMs & Foundation Models
  {
    keywords: ["chatgpt", "openai", "gpt", "llm", "prompt", "conversational", "generative ai", "copilot", "chat"],
    url: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Generative AI & LLM Systems",
    category: "Artificial Intelligence",
  },
  {
    keywords: ["anthropic", "claude", "qwen", "deepseek", "foundation model", "large language model", "neural network", "transformer"],
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Deep Learning & Neural Architectures",
    category: "AI Research",
  },
  {
    keywords: ["agent", "agentic", "multi-agent", "autonomous", "swarm", "orchestration", "workflow automation"],
    url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Autonomous Agentic Systems",
    category: "Agentic AI",
  },
  {
    keywords: ["rag", "retrieval", "vector", "embedding", "semantic search", "knowledge base"],
    url: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Vector Search & Retrieval Architecture",
    category: "Search & Retrieval",
  },

  // 3. Cybersecurity, Breaches, Zero-Trust & Privacy
  {
    keywords: ["breach", "leak", "hacker", "compromise", "vulnerability", "denmark", "exposed", "incident", "ransomware"],
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Cybersecurity & Incident Telemetry",
    category: "Cybersecurity",
  },
  {
    keywords: ["security", "zero trust", "encryption", "auth", "identity", "firewall", "enclave", "soc2", "iam", "compliance", "guardrail"],
    url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Zero Trust & Cryptographic Security",
    category: "Security",
  },

  // 4. Databases, SQL, Apache Iceberg & Storage Engines
  {
    keywords: ["sql", "database", "postgres", "iceberg", "lakehouse", "warehouse", "query", "acid", "table", "schema", "storage engine", "backup"],
    url: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Database Engineering & Storage Systems",
    category: "Databases",
  },
  {
    keywords: ["data pipeline", "etl", "spark", "kafka", "streaming", "analytics", "ingestion", "telemetry", "big data"],
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Data Streaming & Lakehouse Pipelines",
    category: "Data Engineering",
  },

  // 5. Gaming, Graphics, Doom & Retro Computing
  {
    keywords: ["doom", "game", "gaming", "retro", "graphics", "opengl", "vulkan", "shader", "rendering", "pixel", "arcade"],
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Retro Computing & Gaming Engines",
    category: "Gaming & Graphics",
  },

  // 6. Apple, macOS, iOS, Mobile & Silicon Hardware
  {
    keywords: ["apple", "macos", "ios", "iphone", "macbook", "m3", "m4", "silicon", "hardware", "device", "mobile", "gadget", "chip"],
    url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Modern Hardware & Apple Ecosystem",
    category: "Hardware",
  },

  // 7. Frontend, Microfrontends & Web Architecture
  {
    keywords: ["microfrontend", "micro-frontend", "frontend", "react", "nextjs", "web", "browser", "javascript", "typescript", "ui component", "visual basic"],
    url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Modern Web Architecture & Frontend",
    category: "Frontend Engineering",
  },

  // 8. Cloud, Infrastructure, Kubernetes & DevOps
  {
    keywords: ["cloud", "aws", "kubernetes", "k8s", "docker", "serverless", "devops", "microservice", "infrastructure", "ssh", "tunnel"],
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Cloud Infrastructure & Global Networks",
    category: "Cloud Engineering",
  },

  // 9. High Performance, Low Latency, Kernel & eBPF
  {
    keywords: ["ebpf", "kernel", "low latency", "p99", "performance", "quantization", "inference", "tensor", "optimization"],
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "High-Performance Systems & Micro-Architecture",
    category: "Systems Performance",
  },

  // 10. Automotive, F1 & Smart Mobility
  {
    keywords: ["f1", "racing", "driver", "vehicle", "automotive", "car", "telemetry", "powerless", "battery", "speed", "formula 1"],
    url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "High Performance Telemetry & Racing",
    category: "Automotive & Mobility",
  },

  // 11. Manufacturing, Industrial, Logistics & Supply Chain
  {
    keywords: ["manufacturing", "factory", "industrial", "robotics", "iot", "supply chain", "logistics", "warehouse", "operations"],
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Industrial & Manufacturing Systems",
    category: "Industrial Engineering",
  },

  // 12. FinTech, Banking & Cross-Border Payments
  {
    keywords: ["fintech", "banking", "finance", "payment", "ledger", "transaction", "crypto", "trading", "wallet", "cross-border"],
    url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "FinTech & Real-Time Financial Systems",
    category: "Financial Technology",
  },

  // 13. Audio, Speech & Real-Time Streaming
  {
    keywords: ["audio", "sound", "streaming", "microphone", "voice", "speech", "acoustic"],
    url: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Streaming Audio & Speech Intelligence",
    category: "Audio Engineering",
  },

  // 14. Smart Hardware, Clocks & Gadgets
  {
    keywords: ["clock", "gadget", "fan", "ceiling fan", "device", "electronics", "diy", "maker", "hardware"],
    url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Hardware Engineering & Embedded Devices",
    category: "Embedded & IoT",
  },

  // 15. Default Modern Tech Editorial
  {
    keywords: ["technology", "code", "programming", "software", "developer", "engineering"],
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&h=675&q=85",
    title: "Software Engineering & Technology",
    category: "Software Engineering",
  },
];

export class ImageGenerator {
  /**
   * Matches the article's topic, title, and category to the best high-res editorial photo.
   */
  public static matchTopicPhoto(topic: string, category?: string): CuratedEditorialPhoto {
    const text = `${topic} ${category || ""}`.toLowerCase();
    let bestMatch = CURATED_EDITORIAL_PHOTOS[CURATED_EDITORIAL_PHOTOS.length - 1];
    let maxScore = 0;

    for (const item of CURATED_EDITORIAL_PHOTOS) {
      let score = 0;
      for (const kw of item.keywords) {
        if (text.includes(kw)) {
          score += kw.length * 2; // weight longer specific matches higher
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestMatch = item;
      }
    }

    return bestMatch;
  }

  /**
   * Builds the semantic editorial visual concept and diffusion prompt.
   */
  static async buildPrompt(options: GenerateImageOptions): Promise<{
    prompt: string;
    altText: string;
    concept: VisualConcept;
  }> {
    const context: ArticleContext = {
      title: options.topic,
      category: options.category,
      summary: options.summary,
      keyConcepts: options.keyConcepts,
      industry: options.industry,
      articleType: options.articleType || "blog",
      customPrompt: options.customPrompt,
      brandName: options.brandName,
      stylePreference: options.style || "editorial_photo",
      aspectRatio: options.aspectRatio || "16:9",
    };

    const concept = await VisualConceptEngine.deriveConcept(context);
    const { prompt, altText } = VisualConceptEngine.buildEditorialPrompt(context, concept);

    return { prompt, altText, concept };
  }

  /**
   * Generate an authentic, high-quality, topic-matched featured image.
   */
  static async generate(options: GenerateImageOptions): Promise<GeneratedImageResult> {
    const aspectRatio = options.aspectRatio || "16:9";
    const { prompt, altText, concept } = await this.buildPrompt(options);
    const style = concept.stylePreset || options.style || "editorial_photo";

    // 1. Check for OpenAI DALL-E 3 (if key provided)
    const openAiKey = process.env.OPENAI_API_KEY || (process.env.AI_PROVIDER_API_KEY?.startsWith("sk-") ? process.env.AI_PROVIDER_API_KEY : undefined);
    if (openAiKey && openAiKey.startsWith("sk-")) {
      try {
        const sizeMap: Record<ImageAspectRatio, "1792x1024" | "1024x1024" | "1024x1792"> = {
          "16:9": "1792x1024",
          "1:1": "1024x1024",
          "4:3": "1792x1024",
          "9:16": "1024x1792",
        };

        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: prompt.slice(0, 3900),
            n: 1,
            size: sizeMap[aspectRatio] || "1792x1024",
            quality: "standard",
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          const imageUrl = resJson.data?.[0]?.url;
          if (imageUrl) {
            return {
              title: `${options.topic} — Featured Visual`,
              prompt,
              altText,
              publicUrl: imageUrl,
              storageKey: `generated/${Date.now()}_dalle.png`,
              aspectRatio,
              style,
              visualConcept: concept.visualConcept,
              colorPalette: concept.colorPalette,
              domainKey: concept.domainKey,
            };
          }
        }
      } catch (err) {
        console.warn("DALL-E 3 call fallback:", err);
      }
    }

    // 2. High-Resolution Topic-Matched Editorial Photography
    const matchedPhoto = this.matchTopicPhoto(options.topic, options.category);
    try {
      const res = await fetch(matchedPhoto.url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 5000) {
          const base64Data = buffer.toString("base64");
          const publicUrl = `data:image/jpeg;base64,${base64Data}`;
          const cleanName = options.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 35);
          const storageKey = `uploads/media/hero_${cleanName}.jpg`;

          // Cache locally
          try {
            const fs = await import("fs");
            const path = await import("path");
            const uploadDir = path.join(process.cwd(), "public", "uploads", "media");
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            fs.writeFileSync(path.join(uploadDir, `hero_${cleanName}.jpg`), buffer);
          } catch {}

          return {
            title: `${options.topic} — ${matchedPhoto.title}`,
            prompt: `Authentic editorial photography representing ${options.topic}`,
            altText: `${options.topic} featured editorial photography`,
            publicUrl,
            storageKey,
            aspectRatio,
            style: "editorial_photo",
            visualConcept: matchedPhoto.title,
            colorPalette: "Natural Editorial",
            domainKey: matchedPhoto.category,
          };
        }
      }
    } catch (photoErr) {
      console.warn("Editorial photo fetch fallback to dynamic banner:", photoErr);
    }

    // 3. Fallback: Sleek Minimalist Editorial Typography Banner (Clean Stripe/Linear Style)
    const { publicUrl, storageKey } = this.generateMinimalistEditorialBanner(options.topic, options.category, aspectRatio);
    return {
      title: `${options.topic} — Featured Banner`,
      prompt,
      altText,
      publicUrl,
      storageKey,
      aspectRatio,
      style: "minimalist_vector",
      visualConcept: matchedPhoto.title,
      colorPalette: "Deep Slate & Amber",
      domainKey: matchedPhoto.category,
    };
  }

  private static generateMinimalistEditorialBanner(
    topic: string,
    category: string | undefined,
    aspectRatio: ImageAspectRatio
  ): { publicUrl: string; storageKey: string } {
    const dimensions: Record<ImageAspectRatio, { w: number; h: number }> = {
      "16:9": { w: 1200, h: 675 },
      "1:1": { w: 800, h: 800 },
      "4:3": { w: 1200, h: 900 },
      "9:16": { w: 675, h: 1200 },
    };
    const { w, h } = dimensions[aspectRatio] || { w: 1200, h: 675 };

    const escapeXml = (unsafe: string) =>
      unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case "<": return "&lt;";
          case ">": return "&gt;";
          case "&": return "&amp;";
          case "'": return "&apos;";
          case '"': return "&quot;";
          default: return c;
        }
      });

    const safeTitle = escapeXml(topic);
    const safeCategory = escapeXml((category || "RESEARCH").toUpperCase());

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <linearGradient id="bannerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070b14" />
      <stop offset="60%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff6b35" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <filter id="bannerGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="80" />
    </filter>
  </defs>

  <rect width="${w}" height="${h}" fill="url(#bannerBg)" />
  <circle cx="${w * 0.8}" cy="${h * 0.3}" r="${w * 0.35}" fill="#0284c7" opacity="0.18" filter="url(#bannerGlow)" />
  <circle cx="${w * 0.2}" cy="${h * 0.7}" r="${w * 0.30}" fill="#ff6b35" opacity="0.15" filter="url(#bannerGlow)" />

  <g transform="translate(60, ${h / 2 - 30})">
    <rect x="0" y="-40" width="${Math.max(140, safeCategory.length * 8 + 30)}" height="26" rx="13" fill="#1e293b" stroke="#334155" stroke-width="1" />
    <text x="14" y="-23" fill="#ff6b35" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="700" letter-spacing="1.5">${safeCategory}</text>
    <text x="0" y="20" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="700" letter-spacing="-0.5">${safeTitle.slice(0, 50)}</text>
    ${safeTitle.length > 50 ? `<text x="0" y="58" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="700" letter-spacing="-0.5">${safeTitle.slice(50, 100)}</text>` : ""}
  </g>
</svg>
    `.trim();

    const base64Data = Buffer.from(svg, "utf8").toString("base64");
    const cleanName = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 35);
    return {
      publicUrl: `data:image/svg+xml;base64,${base64Data}`,
      storageKey: `uploads/media/banner_${cleanName}.svg`,
    };
  }
}
