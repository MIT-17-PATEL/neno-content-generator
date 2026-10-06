import { ImageAspectRatio, ImageStylePreset } from "@/types";

export interface SvgGenerateOptions {
  topic: string;
  category?: string;
  summary?: string;
  keyConcepts?: string[];
  svgType: string;
  style: ImageStylePreset;
  aspectRatio: ImageAspectRatio;
  colorPalette?: string;
  visualConcept?: string;
}

export class SvgArtGenerator {
  static generate(options: SvgGenerateOptions): string {
    const dimensions: Record<ImageAspectRatio, { w: number; h: number }> = {
      "16:9": { w: 1200, h: 675 },
      "1:1": { w: 800, h: 800 },
      "4:3": { w: 1200, h: 900 },
      "9:16": { w: 675, h: 1200 },
    };

    const { w, h } = dimensions[options.aspectRatio] || { w: 1200, h: 675 };
    const cx = w / 2;
    const cy = h / 2 + 20;

    const topic = options.topic || "Enterprise Technical Architecture";
    const category = (options.category || "AI & Software Architecture").toUpperCase();
    const concepts = (options.keyConcepts && options.keyConcepts.length > 0)
      ? options.keyConcepts
      : this.deriveConceptsFromTopic(topic);

    // Escape text for SVG
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

    const safeTitle = escapeXml(topic.length > 45 ? topic.slice(0, 42) + "..." : topic);
    const safeCategory = escapeXml(category);

    const baseGradients = `
      <defs>
        <!-- Background Gradient -->
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#050811" />
          <stop offset="45%" stop-color="#0a101f" />
          <stop offset="100%" stop-color="#02040a" />
        </linearGradient>

        <!-- Brand Orange / Amber Gradient -->
        <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b35" />
          <stop offset="60%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#fbbf24" />
        </linearGradient>

        <!-- Cyan / Electric Indigo Gradient -->
        <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06b6d4" />
          <stop offset="50%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>

        <!-- Emerald / Mint Gradient -->
        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>

        <!-- Violet / Purple Gradient -->
        <linearGradient id="violetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b5cf6" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>

        <!-- Glass Panel Gradients -->
        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" stop-opacity="0.90" />
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95" />
        </linearGradient>

        <linearGradient id="glassPill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#1e293b" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#334155" stop-opacity="0.5" />
        </linearGradient>

        <!-- Glow Filters -->
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="30" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="ambientLight" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="70" />
        </filter>
        <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.5" />
        </filter>
      </defs>
    `;

    // Engineering Grid Background
    const gridCols = 16;
    const gridRows = 9;
    const gridLines = `
      <g stroke="#ffffff" stroke-opacity="0.035" stroke-width="1">
        ${Array.from({ length: gridCols })
          .map((_, i) => `<line x1="${(w / gridCols) * (i + 1)}" y1="0" x2="${(w / gridCols) * (i + 1)}" y2="${h}" />`)
          .join("")}
        ${Array.from({ length: gridRows })
          .map((_, i) => `<line x1="0" y1="${(h / gridRows) * (i + 1)}" x2="${w}" y2="${(h / gridRows) * (i + 1)}" />`)
          .join("")}
      </g>
    `;

    // Render topic-specific domain scene
    const domainScene = this.renderTopicScene(options.svgType, cx, cy, concepts, escapeXml);

    // Top HUD Bar: Category Pill & Status
    const topHud = `
      <!-- Top HUD Bar -->
      <g transform="translate(48, 48)">
        <!-- Category Badge -->
        <rect x="0" y="0" width="${Math.max(160, safeCategory.length * 9 + 40)}" height="32" rx="16" fill="url(#glassPill)" stroke="url(#orangeGrad)" stroke-width="1.2" />
        <circle cx="16" cy="16" r="4" fill="#ff6b35" filter="url(#nodeGlow)" />
        <text x="30" y="21" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" letter-spacing="1.5">${safeCategory}</text>
      </g>

      <!-- Top Right Status HUD -->
      <g transform="translate(${w - 240}, 48)">
        <rect x="0" y="0" width="192" height="32" rx="16" fill="url(#glassPill)" stroke="#334155" stroke-width="1" />
        <circle cx="18" cy="16" r="3.5" fill="#10b981" filter="url(#nodeGlow)" />
        <text x="30" y="21" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" letter-spacing="1">SYSTEM ARCHITECTURE</text>
      </g>
    `;

    // Bottom HUD Bar: Topic Title & Telemetry Pill
    const bottomHud = `
      <!-- Bottom HUD Card -->
      <g transform="translate(48, ${h - 100})">
        <rect x="0" y="0" width="${w - 96}" height="64" rx="12" fill="url(#glassGrad)" stroke="#334155" stroke-width="1.2" filter="url(#cardShadow)" />
        
        <!-- Left Title Pill -->
        <g transform="translate(24, 24)">
          <text x="0" y="6" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="700" letter-spacing="-0.3">${safeTitle}</text>
          <text x="0" y="24" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500">Neno Technical Research &amp; Production Architecture</text>
        </g>

        <!-- Right Telemetry Badges -->
        <g transform="translate(${w - 380}, 18)">
          <rect x="0" y="0" width="110" height="28" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1" />
          <text x="12" y="18" fill="#38bdf8" font-family="monospace" font-size="11" font-weight="600">P99: &lt;1.8ms</text>

          <rect x="120" y="0" width="130" height="28" rx="6" fill="#0f172a" stroke="url(#orangeGrad)" stroke-width="1" />
          <text x="132" y="18" fill="#fbbf24" font-family="monospace" font-size="11" font-weight="600">STATE: VERIFIED</text>
        </g>
      </g>
    `;

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${baseGradients}

  <!-- Canvas Background -->
  <rect width="${w}" height="${h}" fill="url(#bgGrad)" />

  <!-- Atmospheric Luminous Glows -->
  <circle cx="${cx * 1.5}" cy="${cy * 0.7}" r="${Math.min(w, h) * 0.45}" fill="#0284c7" opacity="0.14" filter="url(#ambientLight)" />
  <circle cx="${cx * 0.5}" cy="${cy * 1.2}" r="${Math.min(w, h) * 0.40}" fill="#ff6b35" opacity="0.12" filter="url(#ambientLight)" />
  <circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.30}" fill="#6366f1" opacity="0.10" filter="url(#ambientLight)" />

  <!-- Engineering Grid -->
  ${gridLines}

  <!-- Domain Scene Composition -->
  ${domainScene}

  <!-- Header HUD -->
  ${topHud}

  <!-- Footer HUD -->
  ${bottomHud}
</svg>
    `.trim();
  }

  private static deriveConceptsFromTopic(topic: string): string[] {
    const words = topic.split(/[\s,:-]+/).filter((w) => w.length > 3);
    if (words.length >= 4) {
      return [
        `${words[0]} Engine`,
        `${words[1] || "Core"} Pipeline`,
        `${words[2] || "State"} Hub`,
        `${words[3] || "Consensus"} Layer`,
      ];
    }
    return ["Ingestion Pipeline", "State Coordination", "Neural Index", "Execution Gateway"];
  }

  private static renderTopicScene(
    svgType: string,
    cx: number,
    cy: number,
    concepts: string[],
    escapeXml: (s: string) => string
  ): string {
    const c1 = escapeXml(concepts[0] || "Ingestion Layer");
    const c2 = escapeXml(concepts[1] || "Core Orchestration");
    const c3 = escapeXml(concepts[2] || "Neural Processing");
    const c4 = escapeXml(concepts[3] || "Output & Analytics");

    switch (svgType) {
      case "ai_agents":
        return this.renderAiAgentsScene(cx, cy, c1, c2, c3, c4);
      case "rag_vector":
        return this.renderRagVectorScene(cx, cy, c1, c2, c3, c4);
      case "cybersecurity":
        return this.renderCybersecurityScene(cx, cy, c1, c2, c3, c4);
      case "data_engineering":
        return this.renderDataEngineeringScene(cx, cy, c1, c2, c3, c4);
      case "microfrontends":
      case "microservices":
      case "cloud_infrastructure":
        return this.renderDistributedScene(cx, cy, c1, c2, c3, c4);
      default:
        return this.renderArchitecturalPipelineScene(cx, cy, c1, c2, c3, c4);
    }
  }

  private static renderAiAgentsScene(
    cx: number,
    cy: number,
    c1: string,
    c2: string,
    c3: string,
    c4: string
  ): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Neural Conduits -->
      <path d="M-360,0 L-180,-50 L0,0 L180,-50 L360,0" fill="none" stroke="url(#cyanGrad)" stroke-width="2.5" />
      <path d="M-180,-50 L-180,50 L0,0 L180,50 L180,-50" fill="none" stroke="url(#orangeGrad)" stroke-width="2" stroke-dasharray="6 4" />
      <path d="M-360,0 L-180,50 L0,0 L180,50 L360,0" fill="none" stroke="url(#violetGrad)" stroke-width="2" opacity="0.7" />

      <!-- Center Orchestrator Hub -->
      <g transform="translate(0, 0)">
        <circle r="70" fill="none" stroke="url(#orangeGrad)" stroke-width="2" stroke-dasharray="8 4" />
        <rect x="-55" y="-55" width="110" height="110" rx="20" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2.5" filter="url(#cardShadow)" />
        <circle r="24" fill="#0f172a" stroke="url(#cyanGrad)" stroke-width="2" />
        <circle r="8" fill="#ff6b35" filter="url(#nodeGlow)" />
        <text x="0" y="75" text-anchor="middle" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">${c2}</text>
      </g>

      <!-- Worker Agent 1 (Left) -->
      <g transform="translate(-270, 0)">
        <rect x="-65" y="-45" width="130" height="90" rx="14" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" filter="url(#cardShadow)" />
        <polygon points="0,-18 16,-9 16,9 0,18 -16,9 -16,-9" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
        <circle r="5" fill="#38bdf8" filter="url(#nodeGlow)" />
        <text x="0" y="32" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c1}</text>
      </g>

      <!-- Worker Agent 2 (Top Right) -->
      <g transform="translate(180, -75)">
        <rect x="-60" y="-38" width="120" height="76" rx="12" fill="url(#glassGrad)" stroke="#64748b" stroke-width="1.8" filter="url(#cardShadow)" />
        <circle r="14" fill="#0f172a" stroke="#10b981" stroke-width="1.5" />
        <circle r="5" fill="#10b981" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c3}</text>
      </g>

      <!-- Worker Agent 3 (Bottom Right) -->
      <g transform="translate(280, 45)">
        <rect x="-65" y="-40" width="130" height="80" rx="12" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="1.8" filter="url(#cardShadow)" />
        <circle r="14" fill="#0f172a" stroke="url(#orangeGrad)" stroke-width="1.5" />
        <circle r="5" fill="#ff6b35" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c4}</text>
      </g>
    </g>
    `;
  }

  private static renderRagVectorScene(
    cx: number,
    cy: number,
    c1: string,
    c2: string,
    c3: string,
    c4: string
  ): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Knowledge Embedding Lattice -->
      <path d="M-340,-60 L-160,0 L80,-60 L300,0" fill="none" stroke="url(#cyanGrad)" stroke-width="2.5" />
      <path d="M-340,60 L-160,0 L80,60 L300,0" fill="none" stroke="url(#orangeGrad)" stroke-width="2" stroke-dasharray="6 4" />

      <!-- Document Shard 1 -->
      <g transform="translate(-280, -50)">
        <rect x="-60" y="-45" width="120" height="90" rx="12" fill="url(#glassGrad)" stroke="#475569" stroke-width="1.5" filter="url(#cardShadow)" />
        <rect x="-40" y="-20" width="80" height="6" rx="3" fill="#64748b" />
        <rect x="-40" y="-6" width="60" height="6" rx="3" fill="#38bdf8" />
        <text x="0" y="25" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c1}</text>
      </g>

      <!-- Vector Space Matrix Hub -->
      <g transform="translate(-80, 0)">
        <circle r="65" fill="none" stroke="url(#cyanGrad)" stroke-width="2" stroke-dasharray="8 4" />
        <rect x="-55" y="-55" width="110" height="110" rx="18" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2.5" filter="url(#cardShadow)" />
        <circle r="22" fill="#0f172a" stroke="url(#cyanGrad)" stroke-width="1.5" />
        <circle r="8" fill="#38bdf8" filter="url(#nodeGlow)" />
        <text x="0" y="75" text-anchor="middle" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">${c2}</text>
      </g>

      <!-- Semantic Index Shard -->
      <g transform="translate(140, -45)">
        <rect x="-60" y="-40" width="120" height="80" rx="12" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2" filter="url(#cardShadow)" />
        <circle r="14" fill="#0f172a" stroke="url(#orangeGrad)" stroke-width="1.5" />
        <circle r="5" fill="#ff6b35" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c3}</text>
      </g>

      <!-- Final Synthesis Shard -->
      <g transform="translate(300, 20)">
        <rect x="-60" y="-40" width="120" height="80" rx="12" fill="url(#glassGrad)" stroke="#10b981" stroke-width="1.8" filter="url(#cardShadow)" />
        <circle r="14" fill="#0f172a" stroke="#10b981" stroke-width="1.5" />
        <circle r="5" fill="#10b981" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c4}</text>
      </g>
    </g>
    `;
  }

  private static renderCybersecurityScene(
    cx: number,
    cy: number,
    c1: string,
    c2: string,
    c3: string,
    c4: string
  ): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Nested Concentric Defense Perimeters -->
      <circle r="180" fill="none" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="10 8" />
      <circle r="130" fill="none" stroke="url(#cyanGrad)" stroke-width="2" stroke-dasharray="8 6" opacity="0.8" />
      <circle r="80" fill="none" stroke="url(#orangeGrad)" stroke-width="2.5" />

      <!-- Central Cryptographic Enclave -->
      <g transform="translate(0, 0)">
        <polygon points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="3" filter="url(#cardShadow)" />
        <circle r="22" fill="#0f172a" stroke="#ff6b35" stroke-width="2" />
        <circle r="8" fill="#ff6b35" filter="url(#nodeGlow)" />
        <text x="0" y="82" text-anchor="middle" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">${c2}</text>
      </g>

      <!-- Satellite Policy Gate 1 (Left) -->
      <g transform="translate(-260, -40)">
        <rect x="-65" y="-40" width="130" height="80" rx="12" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="1.8" filter="url(#cardShadow)" />
        <circle r="12" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
        <circle r="4" fill="#38bdf8" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c1}</text>
      </g>

      <!-- Satellite Policy Gate 2 (Right) -->
      <g transform="translate(260, 40)">
        <rect x="-65" y="-40" width="130" height="80" rx="12" fill="url(#glassGrad)" stroke="#10b981" stroke-width="1.8" filter="url(#cardShadow)" />
        <circle r="12" fill="#0f172a" stroke="#10b981" stroke-width="1.5" />
        <circle r="4" fill="#10b981" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c4}</text>
      </g>
    </g>
    `;
  }

  private static renderDataEngineeringScene(
    cx: number,
    cy: number,
    c1: string,
    c2: string,
    c3: string,
    c4: string
  ): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Continuous Stream Conduits -->
      <path d="M-360,-40 C-220,-80 -180,60 0,0 C180,-60 220,80 360,20" fill="none" stroke="url(#cyanGrad)" stroke-width="3" />
      <path d="M-360,40 C-220,80 -180,-60 0,0 C180,60 220,-80 360,-20" fill="none" stroke="url(#orangeGrad)" stroke-width="2" stroke-dasharray="6 4" />

      <!-- Ingestion Lakehouse Node -->
      <g transform="translate(-270, 0)">
        <rect x="-65" y="-45" width="130" height="90" rx="14" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" filter="url(#cardShadow)" />
        <circle r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
        <circle r="5" fill="#38bdf8" filter="url(#nodeGlow)" />
        <text x="0" y="30" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c1}</text>
      </g>

      <!-- Processing Engine Core -->
      <g transform="translate(0, 0)">
        <rect x="-60" y="-60" width="120" height="120" rx="20" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2.5" filter="url(#cardShadow)" />
        <circle r="24" fill="#0f172a" stroke="#f59e0b" stroke-width="2" />
        <circle r="8" fill="#ff6b35" filter="url(#nodeGlow)" />
        <text x="0" y="80" text-anchor="middle" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">${c2}</text>
      </g>

      <!-- Analytical Shard Target -->
      <g transform="translate(270, 0)">
        <rect x="-65" y="-45" width="130" height="90" rx="14" fill="url(#glassGrad)" stroke="#10b981" stroke-width="2" filter="url(#cardShadow)" />
        <circle r="14" fill="#0f172a" stroke="#10b981" stroke-width="1.5" />
        <circle r="5" fill="#10b981" filter="url(#nodeGlow)" />
        <text x="0" y="30" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c4}</text>
      </g>
    </g>
    `;
  }

  private static renderDistributedScene(
    cx: number,
    cy: number,
    c1: string,
    c2: string,
    c3: string,
    c4: string
  ): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Mesh Network Topology Conduits -->
      <line x1="-240" y1="-70" x2="0" y2="0" stroke="url(#cyanGrad)" stroke-width="2.5" />
      <line x1="240" y1="-70" x2="0" y2="0" stroke="url(#orangeGrad)" stroke-width="2.5" />
      <line x1="-240" y1="70" x2="0" y2="0" stroke="url(#cyanGrad)" stroke-width="2" stroke-dasharray="6 4" />
      <line x1="240" y1="70" x2="0" y2="0" stroke="url(#orangeGrad)" stroke-width="2" stroke-dasharray="6 4" />

      <!-- Center API Gateway Hub -->
      <g transform="translate(0, 0)">
        <circle r="65" fill="none" stroke="url(#orangeGrad)" stroke-width="2" stroke-dasharray="8 4" />
        <rect x="-55" y="-55" width="110" height="110" rx="18" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2.5" filter="url(#cardShadow)" />
        <circle r="22" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
        <circle r="8" fill="#ff6b35" filter="url(#nodeGlow)" />
        <text x="0" y="75" text-anchor="middle" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">${c2}</text>
      </g>

      <!-- Microservice Pod 1 (Top Left) -->
      <g transform="translate(-250, -75)">
        <rect x="-65" y="-40" width="130" height="80" rx="12" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" filter="url(#cardShadow)" />
        <circle r="12" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
        <circle r="4" fill="#38bdf8" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c1}</text>
      </g>

      <!-- Microservice Pod 2 (Top Right) -->
      <g transform="translate(250, -75)">
        <rect x="-65" y="-40" width="130" height="80" rx="12" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2" filter="url(#cardShadow)" />
        <circle r="12" fill="#0f172a" stroke="#ff6b35" stroke-width="1.5" />
        <circle r="4" fill="#ff6b35" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c3}</text>
      </g>

      <!-- Microservice Pod 3 (Bottom Left) -->
      <g transform="translate(-250, 75)">
        <rect x="-65" y="-40" width="130" height="80" rx="12" fill="url(#glassGrad)" stroke="#475569" stroke-width="1.8" filter="url(#cardShadow)" />
        <circle r="12" fill="#0f172a" stroke="#94a3b8" stroke-width="1.5" />
        <circle r="4" fill="#94a3b8" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c4}</text>
      </g>

      <!-- Microservice Pod 4 (Bottom Right) -->
      <g transform="translate(250, 75)">
        <rect x="-65" y="-40" width="130" height="80" rx="12" fill="url(#glassGrad)" stroke="#10b981" stroke-width="1.8" filter="url(#cardShadow)" />
        <circle r="12" fill="#0f172a" stroke="#10b981" stroke-width="1.5" />
        <circle r="4" fill="#10b981" filter="url(#nodeGlow)" />
        <text x="0" y="26" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">Health: OK</text>
      </g>
    </g>
    `;
  }

  private static renderArchitecturalPipelineScene(
    cx: number,
    cy: number,
    c1: string,
    c2: string,
    c3: string,
    c4: string
  ): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Main Directed Pipeline Conduits -->
      <line x1="-380" y1="0" x2="380" y2="0" stroke="url(#cyanGrad)" stroke-width="3" />
      <line x1="-380" y1="0" x2="380" y2="0" stroke="url(#orangeGrad)" stroke-width="1.5" stroke-dasharray="10 8" />

      <!-- Stage 1 -->
      <g transform="translate(-280, 0)">
        <rect x="-65" y="-45" width="130" height="90" rx="14" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" filter="url(#cardShadow)" />
        <polygon points="0,-16 14,-8 14,8 0,16 -14,8 -14,-8" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
        <circle r="4" fill="#38bdf8" filter="url(#nodeGlow)" />
        <text x="0" y="32" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c1}</text>
      </g>

      <!-- Stage 2: Central Core -->
      <g transform="translate(0, 0)">
        <rect x="-65" y="-65" width="130" height="130" rx="20" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2.5" filter="url(#cardShadow)" />
        <circle r="26" fill="#0f172a" stroke="url(#cyanGrad)" stroke-width="2" />
        <circle r="9" fill="#ff6b35" filter="url(#nodeGlow)" />
        <text x="0" y="85" text-anchor="middle" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="12" font-weight="700">${c2}</text>
      </g>

      <!-- Stage 3 -->
      <g transform="translate(280, 0)">
        <rect x="-65" y="-45" width="130" height="90" rx="14" fill="url(#glassGrad)" stroke="#10b981" stroke-width="2" filter="url(#cardShadow)" />
        <circle r="14" fill="#0f172a" stroke="#10b981" stroke-width="1.5" />
        <circle r="5" fill="#10b981" filter="url(#nodeGlow)" />
        <text x="0" y="32" text-anchor="middle" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="11" font-weight="600">${c3}</text>
      </g>
    </g>
    `;
  }
}
