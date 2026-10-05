import { ImageAspectRatio, ImageStylePreset } from "@/types";
import { callAiStructured, isAiConfigured } from "./ai-client";

export interface ArticleContext {
  title?: string;
  topic?: string;
  category?: string;
  summary?: string;
  keyConcepts?: string[];
  industry?: string;
  articleType?: "blog" | "case-study" | "research" | "technical-guide";
  customPrompt?: string;
  brandName?: string;
  stylePreference?: ImageStylePreset;
  aspectRatio?: ImageAspectRatio;
}

export interface VisualConcept {
  domainKey: string;
  visualConcept: string;
  stylePreset: ImageStylePreset;
  composition: string;
  colorPalette: string;
  mood: string;
  negativePrompt: string;
}

interface DomainRule {
  keywords: string[];
  visualConcept: string;
  stylePreset: ImageStylePreset;
  composition: string;
  colorPalette: string;
  mood: string;
  svgType:
    | "microfrontends"
    | "ai_agents"
    | "rag_vector"
    | "cybersecurity"
    | "cloud_infrastructure"
    | "microservices"
    | "data_engineering"
    | "ml_governance"
    | "computer_vision"
    | "fintech"
    | "generic_architecture";
}

const DOMAIN_RULES: Record<string, DomainRule> = {
  microfrontends: {
    keywords: [
      "microfrontend",
      "micro-frontend",
      "micro frontend",
      "frontend architecture",
      "module federation",
      "event-driven",
      "latency benchmark",
    ],
    visualConcept:
      "A modular enterprise interface represented as several independent frontend panels connected through an event-driven network, with subtle latency and performance pathways measured between the modules.",
    stylePreset: "isometric_3d",
    composition: "Central event bus matrix with distributed modular application viewports arrayed in clean architectural hierarchy, balanced negative space.",
    colorPalette: "Deep navy (#0b132b), warm orange (#ff6b35) event pulses, slate gray (#334155), and crisp white highlights.",
    mood: "Technical, precise, modular, high-performance enterprise.",
    svgType: "microfrontends",
  },
  ai_agents: {
    keywords: [
      "agentic",
      "ai agent",
      "autonomous agent",
      "agent orchestration",
      "multi-agent",
      "workflow automation",
      "swarm",
    ],
    visualConcept:
      "Autonomous software agent nodes collaborating across a multi-stage workflow pipeline, with directed task execution conduits, tool integration hubs, and state coordination gates.",
    stylePreset: "dark_tech",
    composition: "Structured directed workflow graph with active specialized agent nodes and flowing data conduits, clear central execution focal point.",
    colorPalette: "Dark obsidian (#0a0f1d), luminous amber/orange (#f59e0b) execution paths, cobalt blue, and silver metallic nodes.",
    mood: "Autonomous, collaborative, strategic, enterprise intelligence.",
    svgType: "ai_agents",
  },
  rag_vector: {
    keywords: [
      "rag",
      "retrieval-augmented",
      "vector search",
      "knowledge retrieval",
      "vector database",
      "embeddings",
      "semantic search",
      "context window",
    ],
    visualConcept:
      "Stratified enterprise knowledge document shards embedding into a multi-dimensional vector index, with precision semantic retrieval streams flowing directly into an inference engine.",
    stylePreset: "minimalist_vector",
    composition: "Multi-layered knowledge matrix on the left streaming through an embedding lattice into a streamlined context pipeline on the right.",
    colorPalette: "Deep slate (#0f172a), indigo (#6366f1), vibrant cyan (#06b6d4), and warm orange (#ea580c) query focal lines.",
    mood: "Intellectual, high-accuracy, structured knowledge architecture.",
    svgType: "rag_vector",
  },
  cybersecurity: {
    keywords: [
      "security",
      "cybersecurity",
      "zero trust",
      "threat detection",
      "encryption",
      "soc2",
      "iso 27001",
      "vulnerability",
      "iam",
      "identity",
    ],
    visualConcept:
      "Multi-tiered enterprise zero-trust security perimeter with cryptographically verified boundary layers, active policy enforcement nodes, and telemetry monitoring streams.",
    stylePreset: "architectural_blueprint",
    composition: "Concentric nested defense perimeters with geometric cryptographic verification channels, strong central secure enclave focal point.",
    colorPalette: "Dark navy blueprint (#051923), cyan wireframes (#00a6fb), cobalt, and controlled warm orange alert telemetry accents.",
    mood: "Impermeable, rigorous, cryptographic, enterprise-grade protection.",
    svgType: "cybersecurity",
  },
  cloud_infrastructure: {
    keywords: [
      "cloud",
      "aws",
      "azure",
      "gcp",
      "kubernetes",
      "k8s",
      "serverless",
      "docker",
      "containers",
      "infrastructure",
      "devops",
    ],
    visualConcept:
      "Distributed enterprise cloud topology showing containerized service pods, API gateways, load balancing conduits, and multi-region data replication channels.",
    stylePreset: "isometric_3d",
    composition: "Tiered isometric cloud platforms with interconnected fiber pipelines and high-availability cluster nodes.",
    colorPalette: "Deep charcoal (#111827), sky blue (#0284c7), electric indigo (#4f46e5), and warm orange (#f97316) routing paths.",
    mood: "Scalable, resilient, distributed, high-availability.",
    svgType: "cloud_infrastructure",
  },
  microservices: {
    keywords: [
      "microservice",
      "service mesh",
      "api gateway",
      "graphql",
      "grpc",
      "distributed systems",
      "event bus",
      "kafka",
    ],
    visualConcept:
      "Decoupled enterprise microservices communicating across a resilient service mesh, showing circuit breakers, request tracing, and synchronized contract pipelines.",
    stylePreset: "isometric_3d",
    composition: "Decentralized cluster of geometric service modules interconnected by glowing message pipelines with clear routing hierarchy.",
    colorPalette: "Obsidian glass (#090d16), cyan telemetry lines (#06b6d4), emerald healthy status nodes (#10b981), and orange transaction pulses.",
    mood: "Decoupled, high-throughput, modern enterprise backend.",
    svgType: "microservices",
  },
  data_engineering: {
    keywords: [
      "data pipeline",
      "etl",
      "elt",
      "data warehouse",
      "lakehouse",
      "streaming data",
      "spark",
      "snowflake",
      "databricks",
      "analytics",
    ],
    visualConcept:
      "High-throughput enterprise data engineering pipeline showing raw ingestion streams transforming through multi-stage validation filters into an analytical data lakehouse.",
    stylePreset: "editorial_photo",
    composition: "Continuous left-to-right stream transition from dense multi-source inputs to refined, structured geometric data repositories.",
    colorPalette: "Deep navy (#030712), teal (#0d9488), cobalt blue (#2563eb), with orange (#f97316) stream highlights.",
    mood: "Fluid, high-velocity, rigorous transformation and governance.",
    svgType: "data_engineering",
  },
  ml_governance: {
    keywords: [
      "governance",
      "compliance",
      "regulated",
      "model audit",
      "model monitoring",
      "llm evaluation",
      "alignment",
      "ai policy",
      "risk management",
    ],
    visualConcept:
      "Enterprise AI model governance architecture showing several AI model nodes passing through a structured compliance and policy layer, with auditability checkpoints and risk controls.",
    stylePreset: "dark_tech",
    composition: "Linear pipeline passing through rigorous policy validation thresholds and inspection lenses with verified status telemetry.",
    colorPalette: "Slate charcoal (#0f172a), platinum silver, deep navy, with precision orange (#ff6b35) policy boundary accents.",
    mood: "Authoritative, verifiable, compliant, enterprise risk-managed.",
    svgType: "ml_governance",
  },
  computer_vision: {
    keywords: [
      "computer vision",
      "object detection",
      "image segmentation",
      "yolo",
      "visual recognition",
      "camera perception",
      "video analytics",
    ],
    visualConcept:
      "High-precision computational vision perception showing spatial coordinate lattices, feature extraction matrices, and bounding telemetry boundaries over a structured architectural environment.",
    stylePreset: "architectural_blueprint",
    composition: "Perspective architectural grid with spatial telemetry layers and non-invasive bounding coordinate overlays.",
    colorPalette: "Deep Prussian blue (#021b2b), neon cyan coordinate lines (#22d3ee), and controlled orange target highlights.",
    mood: "Analytical, perceptual, spatial intelligence.",
    svgType: "computer_vision",
  },
  fintech: {
    keywords: [
      "fintech",
      "banking",
      "payment",
      "ledger",
      "fraud detection",
      "transaction",
      "defi",
      "treasury",
    ],
    visualConcept:
      "Ultra-low-latency financial transaction network with cryptographic validation, real-time risk evaluation nodes, and synchronized global settlement pipelines.",
    stylePreset: "minimalist_vector",
    composition: "Geometric financial routing topology with high-speed consensus channels and isolated security enclaves.",
    colorPalette: "Rich dark emerald (#022c22), deep navy (#0b132b), burnished gold/orange (#f59e0b), and crisp white.",
    mood: "Institutional, rapid, secure, cryptographic integrity.",
    svgType: "fintech",
  },
};

export class VisualConceptEngine {
  /**
   * Derive a domain-specific, editorial-grade visual concept from full article context.
   */
  static async deriveConcept(context: ArticleContext): Promise<VisualConcept> {
    const articleTitle = context.title || context.topic || "Enterprise Technical Architecture";
    const titleLower = articleTitle.toLowerCase();
    const summaryLower = (context.summary || "").toLowerCase();
    const categoryLower = (context.category || "").toLowerCase();
    const industryLower = (context.industry || "").toLowerCase();
    const conceptsLower = (context.keyConcepts || []).join(" ").toLowerCase();

    const combinedText = `${titleLower} ${summaryLower} ${categoryLower} ${industryLower} ${conceptsLower}`;

    // 1. Try AI-powered synthesis if key is available
    if (isAiConfigured()) {
      try {
        const aiConcept = await this.synthesizeWithAi(context);
        if (aiConcept && aiConcept.visualConcept && aiConcept.visualConcept.length > 20) {
          return aiConcept;
        }
      } catch (err) {
        console.warn("AI visual concept synthesis fallback to rule engine:", err);
      }
    }

    // 2. Deterministic Semantic Domain Matching
    for (const [key, rule] of Object.entries(DOMAIN_RULES)) {
      if (rule.keywords.some((kw) => combinedText.includes(kw))) {
        return {
          domainKey: key,
          visualConcept: rule.visualConcept,
          stylePreset: context.stylePreference || rule.stylePreset,
          composition: rule.composition,
          colorPalette: rule.colorPalette,
          mood: rule.mood,
          negativePrompt: this.getUniversalNegativePrompt(),
        };
      }
    }

    // Default enterprise architecture concept
    return {
      domainKey: "generic_architecture",
      visualConcept: `A sophisticated enterprise technology architecture representing ${articleTitle}, showing interconnected system components, resilient data channels, and clear architectural hierarchy.`,
      stylePreset: context.stylePreference || "dark_tech",
      composition: "Central technical core with modular structural sub-components, balanced negative space, and professional editorial framing.",
      colorPalette: "Deep slate background (#0b0f17), rich navy, controlled warm orange (#ff6b35) conduits, and clean neutral gray.",
      mood: "Technical, precise, modern, enterprise.",
      negativePrompt: this.getUniversalNegativePrompt(),
    };
  }

  /**
   * Use LLM to synthesize a tailored visual concept from rich article context.
   */
  private static async synthesizeWithAi(context: ArticleContext): Promise<VisualConcept | null> {
    const articleTitle = context.title || context.topic || "Enterprise Technical Architecture";
    const systemPrompt = `You are an elite Creative Director & Editorial Art Director for high-end technology publications (like Stripe Press, MIT Technology Review, Wired, and The Information).
Your task is to analyze an article's technical subject matter and design a sophisticated, editorial visual concept for its featured hero image.

CRITICAL RULES:
1. UNDERSTAND THE TOPIC DEEPLY: Do not illustrate the title literally with cheap AI art tropes. (e.g. For "Event-Driven Microfrontends", DO NOT create a glowing brain or random robots. Create modular frontend application panels communicating through an event message bus).
2. NO TEXT / NO LABELS: The visual concept must NOT include letters, titles, words, logos, or UI labels.
3. BAN GENERIC CLICHES: Ban humanoid robots, robot heads, glowing brains, floating padlocks, random circuit lines, hoodies, and neon cyberpunk clutter.
4. ELEGANT EDITORIAL STYLE: Use realistic materials, architectural visualization, 3D editorial illustration, or conceptual engineering product aesthetics.
5. RESTRAINED PALETTE: Deep slate/navy with purposeful accents (warm orange #ff6b35, cobalt, cyan, or emerald).

Return a JSON object matching this schema:
{
  "domainKey": "string (e.g. microfrontends, ai_agents, rag, cybersecurity, cloud, microservices, data_eng, ml_governance, fintech)",
  "visualConcept": "2-3 sentences describing the exact physical/spatial/architectural scene to render",
  "stylePreset": "dark_tech" | "isometric_3d" | "minimalist_vector" | "architectural_blueprint" | "editorial_photo",
  "composition": "Focal point, spatial layout, depth, and negative space details",
  "colorPalette": "Specific harmonious color palette description",
  "mood": "Tone and atmosphere (e.g. Technical, precise, modern, enterprise)"
}`;

    const userPrompt = `ARTICLE INFORMATION:
Title: ${articleTitle}
Category: ${context.category || "Enterprise AI & Architecture"}
Summary: ${context.summary || "Deep-dive technical exploration of architecture, tradeoffs, and production implementation."}
Key Concepts: ${(context.keyConcepts || []).join(", ") || "Enterprise systems, latency benchmarks, scalability"}
Industry: ${context.industry || "Technology"}
Article Type: ${context.articleType || "blog"}
User Custom Notes: ${context.customPrompt || "None"}

Create a sophisticated visual direction for this article's featured image.`;

    const res = await callAiStructured<{
      domainKey: string;
      visualConcept: string;
      stylePreset: ImageStylePreset;
      composition: string;
      colorPalette: string;
      mood: string;
    }>({
      systemPrompt,
      userPrompt,
    });

    if (res && res.visualConcept) {
      return {
        domainKey: res.domainKey || "custom_ai_synthesized",
        visualConcept: res.visualConcept,
        stylePreset: context.stylePreference || res.stylePreset || "dark_tech",
        composition: res.composition || "Central focal point with balanced editorial negative space.",
        colorPalette: res.colorPalette || "Deep slate, dark navy, with restrained warm orange and cyan accents.",
        mood: res.mood || "Technical, precise, modern, enterprise.",
        negativePrompt: this.getUniversalNegativePrompt(),
      };
    }

    return null;
  }

  /**
   * Builds the comprehensive editorial diffusion prompt according to user specifications.
   */
  static buildEditorialPrompt(context: ArticleContext, concept: VisualConcept): { prompt: string; altText: string } {
    const title = context.title || context.topic || "Enterprise Technical Architecture";
    const summary = context.summary || `Technical deep-dive on ${title} covering architectural patterns and production benchmarks.`;
    const keyConcepts = (context.keyConcepts && context.keyConcepts.length > 0)
      ? context.keyConcepts.join(", ")
      : context.category || "Enterprise Software Architecture";

    const customOverride = context.customPrompt?.trim()
      ? `\nCUSTOM USER GUIDANCE:\n${context.customPrompt.trim()}\n`
      : "";

    const prompt = `Create a premium editorial featured image for a technical article.

ARTICLE:
${title}

CONTEXT:
${summary}

KEY CONCEPTS:
${keyConcepts}
${customOverride}
VISUAL DIRECTION:
${concept.visualConcept}

Create a sophisticated visual representation of the actual technical concept discussed in the article.
The image should communicate the subject through composition, objects, architecture, relationships, and visual metaphor.

Style:
${this.getStyleDescription(concept.stylePreset)} with realistic materials, refined lighting, strong composition, subtle depth, and professional art direction.

Color palette:
${concept.colorPalette}

Composition:
${concept.composition} Clear focal point, strong hierarchy, balanced negative space, professional editorial framing.

Mood:
${concept.mood}

CRITICAL RESTRICTIONS:
No text, no typography, no letters, no words, no numbers, no fake code.
No logos, no watermarks, no company names, no brands.
No generic humanoid robots, no robot heads, no glowing AI brains.
No generic padlocks floating in space, no hooded hacker figures.
No generic circuit boards, no random floating particles, no cyberpunk neon clutter.
No stock photo clichés.

Aspect ratio: approximately 3:2 (1200x780 landscape). Safe central visual zone. Resolution: 1200x780 or higher.`
      .trim();

    const altText = `Editorial technical visual representing ${title}: ${concept.visualConcept.slice(0, 120)}...`;

    return { prompt, altText };
  }

  static getUniversalNegativePrompt(): string {
    return [
      "text",
      "typography",
      "letters",
      "words",
      "watermark",
      "logo",
      "signature",
      "fake ui",
      "humanoid robot",
      "robot head",
      "glowing ai brain",
      "generic circuit board",
      "floating padlock",
      "hacker in hoodie",
      "cyberpunk",
      "excessive neon",
      "random floating particles",
      "cheap 3d render",
      "distorted proportions",
      "blurry",
      "low quality",
    ].join(", ");
  }

  static getStyleDescription(style: ImageStylePreset): string {
    switch (style) {
      case "isometric_3d":
        return "Clean isometric 3D architectural visualization, floating matte and frosted glass modular platforms, soft ambient occlusion, precision lighting";
      case "architectural_blueprint":
        return "High-tech technical schematic blueprint, crisp engineering CAD grid lines, geometric wireframes on deep navy canvas, refined technical drawing aesthetic";
      case "minimalist_vector":
        return "Swiss modernist editorial flat vector illustration, elegant abstract geometric architecture, refined monochrome with purposeful color accents";
      case "editorial_photo":
        return "Cinematic technology editorial photography, realistic industrial materials, soft natural studio lighting, shallow depth of field, Hasselblad medium format quality";
      case "dark_tech":
      default:
        return "Premium dark-tech 3D editorial rendering, deep slate background, refined materials, volumetric soft illumination, high-end enterprise SaaS visual standard";
    }
  }

  /**
   * Determine the best SVG generator template for a given domain key.
   */
  static getSvgTypeForDomain(domainKey: string): DomainRule["svgType"] {
    const rule = DOMAIN_RULES[domainKey];
    return rule ? rule.svgType : "generic_architecture";
  }
}
