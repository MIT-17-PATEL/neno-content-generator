import { ImageAspectRatio, ImageStylePreset } from "@/types";

export class SvgArtGenerator {
  static generate(params: {
    svgType: string;
    style: ImageStylePreset;
    aspectRatio: ImageAspectRatio;
    colorPalette?: string;
  }): string {
    const dimensions: Record<ImageAspectRatio, { w: number; h: number }> = {
      "16:9": { w: 1200, h: 675 },
      "1:1": { w: 800, h: 800 },
      "4:3": { w: 1200, h: 900 },
      "9:16": { w: 675, h: 1200 },
    };

    const { w, h } = dimensions[params.aspectRatio] || { w: 1200, h: 780 };
    const cx = w / 2;
    const cy = h / 2;

    const baseGradients = `
      <defs>
        <!-- Background Gradient -->
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#070b14" />
          <stop offset="50%" stop-color="#0f172a" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>

        <!-- Brand Orange / Amber Gradient -->
        <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff6b35" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#fbbf24" />
        </linearGradient>

        <!-- Cyan / Cobalt Gradient -->
        <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06b6d4" />
          <stop offset="50%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#6366f1" />
        </linearGradient>

        <!-- Emerald / Teal Gradient -->
        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>

        <!-- Glass Panel Gradients -->
        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95" />
        </linearGradient>
        <linearGradient id="glassLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#1e293b" stop-opacity="0.8" />
        </linearGradient>

        <!-- Subtle Glow Filters -->
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="35" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="ambientLight" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="80" />
        </filter>
        <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    `;

    // Precision Grid Background
    const gridCols = 16;
    const gridRows = 10;
    const gridLines = `
      <g stroke="#ffffff" stroke-opacity="0.04" stroke-width="1">
        ${Array.from({ length: gridCols })
          .map((_, i) => `<line x1="${(w / gridCols) * (i + 1)}" y1="0" x2="${(w / gridCols) * (i + 1)}" y2="${h}" />`)
          .join("")}
        ${Array.from({ length: gridRows })
          .map((_, i) => `<line x1="0" y1="${(h / gridRows) * (i + 1)}" x2="${w}" y2="${(h / gridRows) * (i + 1)}" />`)
          .join("")}
      </g>
    `;

    // Select domain scene
    let domainScene = "";
    switch (params.svgType) {
      case "microfrontends":
        domainScene = this.renderMicrofrontends(cx, cy);
        break;
      case "ai_agents":
        domainScene = this.renderAiAgents(cx, cy);
        break;
      case "rag_vector":
        domainScene = this.renderRagVector(cx, cy);
        break;
      case "cybersecurity":
        domainScene = this.renderCybersecurity(cx, cy);
        break;
      case "cloud_infrastructure":
      case "microservices":
        domainScene = this.renderCloudMicroservices(cx, cy);
        break;
      case "data_engineering":
        domainScene = this.renderDataEngineering(cx, cy);
        break;
      case "ml_governance":
        domainScene = this.renderMlGovernance(cx, cy);
        break;
      case "fintech":
        domainScene = this.renderFintech(cx, cy);
        break;
      case "computer_vision":
        domainScene = this.renderComputerVision(cx, cy);
        break;
      case "generic_architecture":
      default:
        domainScene = this.renderGenericArchitecture(cx, cy);
        break;
    }

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${baseGradients}

  <!-- Canvas Background -->
  <rect width="${w}" height="${h}" fill="url(#bgGrad)" />

  <!-- Ambient Light Orbs -->
  <circle cx="${cx * 1.4}" cy="${cy * 0.6}" r="${Math.min(w, h) * 0.4}" fill="#0284c7" opacity="0.12" filter="url(#ambientLight)" />
  <circle cx="${cx * 0.6}" cy="${cy * 1.3}" r="${Math.min(w, h) * 0.35}" fill="#ff6b35" opacity="0.09" filter="url(#ambientLight)" />
  <circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.25}" fill="#6366f1" opacity="0.10" filter="url(#ambientLight)" />

  <!-- Engineering Grid -->
  ${gridLines}

  <!-- Domain Scene Composition -->
  ${domainScene}
</svg>
    `.trim();
  }

  /**
   * Microfrontends: Modular application viewports connected via an event bus lattice.
   */
  private static renderMicrofrontends(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Central Event Bus Core -->
      <circle r="90" fill="none" stroke="url(#orangeGrad)" stroke-width="2" stroke-dasharray="6 4" opacity="0.7" />
      <circle r="70" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
      <circle r="45" fill="none" stroke="url(#cyanGrad)" stroke-width="2" />
      <circle r="12" fill="url(#orangeGrad)" filter="url(#nodeGlow)" />
      
      <!-- Event conduits radiating outwards -->
      <path d="M-60,-40 C-140,-120 -180,-80 -260,-90" fill="none" stroke="url(#orangeGrad)" stroke-width="2" stroke-dasharray="4 4" opacity="0.8" />
      <path d="M60,-40 C140,-120 180,-80 260,-90" fill="none" stroke="url(#cyanGrad)" stroke-width="2" opacity="0.8" />
      <path d="M-60,40 C-140,120 -180,90 -240,110" fill="none" stroke="url(#cyanGrad)" stroke-width="2" opacity="0.8" />
      <path d="M60,40 C140,120 180,90 240,110" fill="none" stroke="url(#orangeGrad)" stroke-width="2" stroke-dasharray="4 4" opacity="0.8" />

      <!-- Modular Viewport Panel 1 (Top Left) -->
      <g transform="translate(-320, -160)">
        <rect width="180" height="110" rx="8" fill="url(#glassGrad)" stroke="#475569" stroke-width="1.5" />
        <rect x="12" y="14" width="60" height="8" rx="4" fill="#64748b" opacity="0.6" />
        <rect x="12" y="32" width="156" height="50" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1" />
        <circle cx="155" cy="18" r="4" fill="#ff6b35" filter="url(#nodeGlow)" />
      </g>

      <!-- Modular Viewport Panel 2 (Top Right) -->
      <g transform="translate(140, -160)">
        <rect width="180" height="110" rx="8" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="1.5" />
        <rect x="12" y="14" width="75" height="8" rx="4" fill="#38bdf8" opacity="0.8" />
        <rect x="12" y="32" width="156" height="50" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1" />
        <circle cx="155" cy="18" r="4" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>

      <!-- Modular Viewport Panel 3 (Bottom Left) -->
      <g transform="translate(-320, 60)">
        <rect width="180" height="110" rx="8" fill="url(#glassGrad)" stroke="#475569" stroke-width="1.5" />
        <rect x="12" y="14" width="50" height="8" rx="4" fill="#64748b" opacity="0.6" />
        <rect x="12" y="32" width="156" height="50" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1" />
        <circle cx="155" cy="18" r="4" fill="#10b981" filter="url(#nodeGlow)" />
      </g>

      <!-- Modular Viewport Panel 4 (Bottom Right) -->
      <g transform="translate(140, 60)">
        <rect width="180" height="110" rx="8" fill="url(#glassGrad)" stroke="#475569" stroke-width="1.5" />
        <rect x="12" y="14" width="65" height="8" rx="4" fill="#f59e0b" opacity="0.7" />
        <rect x="12" y="32" width="156" height="50" rx="6" fill="#1e293b" stroke="#334155" stroke-width="1" />
        <circle cx="155" cy="18" r="4" fill="#ff6b35" filter="url(#nodeGlow)" />
      </g>
    </g>
    `;
  }

  /**
   * AI Agents: Directed task pipeline and multi-agent orchestration hubs.
   */
  private static renderAiAgents(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Directed Workflow Pipeline Conduits -->
      <path d="M-360,0 L-180,0 L0,-70 L180,-70 L360,0" fill="none" stroke="url(#cyanGrad)" stroke-width="2.5" />
      <path d="M-180,0 L0,70 L180,70 L360,0" fill="none" stroke="url(#orangeGrad)" stroke-width="2.5" stroke-dasharray="8 6" />
      <path d="M0,-70 L0,70" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="4 4" />

      <!-- Agent Node 1: Ingestion / Planner -->
      <g transform="translate(-360, 0)">
        <circle r="44" fill="url(#glassGrad)" stroke="#475569" stroke-width="2" />
        <polygon points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11" fill="#1e293b" stroke="url(#cyanGrad)" stroke-width="1.5" />
        <circle r="6" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>

      <!-- Agent Node 2: Orchestration Core -->
      <g transform="translate(-180, 0)">
        <rect x="-40" y="-40" width="80" height="80" rx="12" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2" />
        <circle r="22" fill="#0f172a" stroke="#475569" stroke-width="1.5" />
        <circle r="8" fill="#ff6b35" filter="url(#nodeGlow)" />
      </g>

      <!-- Agent Node 3: Specialized Worker A -->
      <g transform="translate(0, -70)">
        <polygon points="0,-36 31,-18 31,18 0,36 -31,18 -31,-18" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" />
        <circle r="14" fill="#0f172a" />
        <circle r="6" fill="#06b6d4" filter="url(#nodeGlow)" />
      </g>

      <!-- Agent Node 4: Specialized Worker B -->
      <g transform="translate(0, 70)">
        <polygon points="0,-36 31,-18 31,18 0,36 -31,18 -31,-18" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2" />
        <circle r="14" fill="#0f172a" />
        <circle r="6" fill="#f59e0b" filter="url(#nodeGlow)" />
      </g>

      <!-- Agent Node 5: Verification & Synthesis Hub -->
      <g transform="translate(180, 0)">
        <rect x="-45" y="-45" width="90" height="90" rx="16" fill="url(#glassGrad)" stroke="#64748b" stroke-width="2" />
        <circle r="26" fill="#0f172a" stroke="url(#cyanGrad)" stroke-width="1.5" />
        <circle r="10" fill="url(#orangeGrad)" filter="url(#nodeGlow)" />
      </g>

      <!-- Agent Node 6: Output / Execution Target -->
      <g transform="translate(360, 0)">
        <circle r="44" fill="url(#glassGrad)" stroke="#10b981" stroke-width="2" />
        <circle r="22" fill="#0f172a" stroke="#10b981" stroke-width="1.5" />
        <circle r="7" fill="#10b981" filter="url(#nodeGlow)" />
      </g>
    </g>
    `;
  }

  /**
   * RAG & Vector Search: Stratified document matrices & high-dimensional vector embeddings.
   */
  private static renderRagVector(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Document Layer Stack on Left -->
      <g transform="translate(-320, -100)">
        <rect x="0" y="0" width="130" height="60" rx="6" fill="url(#glassGrad)" stroke="#475569" stroke-width="1.5" opacity="0.6" />
        <rect x="20" y="30" width="130" height="60" rx="6" fill="url(#glassGrad)" stroke="#64748b" stroke-width="1.5" opacity="0.8" />
        <rect x="40" y="60" width="130" height="60" rx="6" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2" />
        <line x1="55" y1="80" x2="140" y2="80" stroke="#94a3b8" stroke-width="2" />
        <line x1="55" y1="95" x2="120" y2="95" stroke="#64748b" stroke-width="2" />
      </g>

      <!-- Vector Embedding Transform Matrix -->
      <g transform="translate(-100, 0)">
        <path d="M-100, -20 L-20, -20 L40, 0" fill="none" stroke="url(#orangeGrad)" stroke-width="2" />
        <path d="M-100, 20 L-20, 20 L40, 0" fill="none" stroke="url(#cyanGrad)" stroke-width="2" />
        
        <!-- Embedding Cube Cluster -->
        <g transform="translate(0, 0)">
          <circle r="75" fill="none" stroke="#334155" stroke-dasharray="4 4" />
          <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" />
          <circle cx="15" cy="-8" r="4" fill="#38bdf8" filter="url(#nodeGlow)" />
          <circle cx="-12" cy="14" r="4" fill="#ff6b35" filter="url(#nodeGlow)" />
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
        </g>
      </g>

      <!-- Retrieval Pipeline Conduits -->
      <path d="M-25,0 C60,-80 140,-60 220,-40" fill="none" stroke="url(#cyanGrad)" stroke-width="2.5" />
      <path d="M-25,0 C60,80 140,60 220,40" fill="none" stroke="url(#orangeGrad)" stroke-width="2.5" stroke-dasharray="6 4" />

      <!-- Neural Inference Engine Core (Right) -->
      <g transform="translate(260, 0)">
        <rect x="-60" y="-70" width="120" height="140" rx="16" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" />
        <circle r="36" fill="#0f172a" stroke="url(#orangeGrad)" stroke-width="2" />
        <circle r="14" fill="url(#cyanGrad)" filter="url(#nodeGlow)" />
        <circle r="6" fill="#ffffff" />
      </g>
    </g>
    `;
  }

  /**
   * Cybersecurity & Zero Trust: Concentric defense boundary rings & cryptographic enclaves.
   */
  private static renderCybersecurity(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Outer Defensive Perimeter Ring -->
      <circle r="180" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="12 8" opacity="0.6" />
      <circle r="150" fill="none" stroke="url(#cyanGrad)" stroke-width="2" stroke-dasharray="6 6" opacity="0.8" />
      
      <!-- Middle Zero-Trust Verification Perimeter -->
      <polygon points="0,-120 104,-60 104,60 0,120 -104,60 -104,-60" fill="none" stroke="url(#orangeGrad)" stroke-width="2" opacity="0.9" />
      <circle r="90" fill="url(#glassGrad)" stroke="#475569" stroke-width="1.5" />
      
      <!-- Inner Cryptographic Vault Enclave -->
      <polygon points="0,-60 52,-30 52,30 0,60 -52,30 -52,-30" fill="#0f172a" stroke="url(#cyanGrad)" stroke-width="2.5" />
      <circle r="20" fill="url(#orangeGrad)" filter="url(#nodeGlow)" />
      <circle r="8" fill="#ffffff" />

      <!-- Perimeter Satellite Policy Nodes -->
      <g transform="translate(-150, 0)">
        <circle r="12" fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="1.5" />
        <circle r="4" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>
      <g transform="translate(150, 0)">
        <circle r="12" fill="url(#glassGrad)" stroke="#ff6b35" stroke-width="1.5" />
        <circle r="4" fill="#ff6b35" filter="url(#nodeGlow)" />
      </g>
      <g transform="translate(0, -150)">
        <circle r="12" fill="url(#glassGrad)" stroke="#10b981" stroke-width="1.5" />
        <circle r="4" fill="#10b981" filter="url(#nodeGlow)" />
      </g>
      <g transform="translate(0, 150)">
        <circle r="12" fill="url(#glassGrad)" stroke="#f59e0b" stroke-width="1.5" />
        <circle r="4" fill="#f59e0b" filter="url(#nodeGlow)" />
      </g>
    </g>
    `;
  }

  /**
   * Cloud & Microservices: Tiered isometric cluster topology with service mesh lines.
   */
  private static renderCloudMicroservices(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Mesh Interconnect Channels -->
      <path d="M-220,-80 L0,-140 L220,-80 L0,-20 Z" fill="none" stroke="url(#cyanGrad)" stroke-width="1.5" opacity="0.7" />
      <path d="M-220,40 L0,-20 L220,40 L0,100 Z" fill="none" stroke="url(#orangeGrad)" stroke-width="1.5" opacity="0.7" />

      <!-- Pod Cluster 1 (Left Tier) -->
      <g transform="translate(-220, -20)">
        <polygon points="0,-50 60,-20 60,40 0,70 -60,40 -60,-20" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" />
        <circle cx="0" cy="10" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
        <circle cx="0" cy="10" r="5" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>

      <!-- Central Gateway Tier -->
      <g transform="translate(0, -60)">
        <polygon points="0,-65 80,-25 80,45 0,85 -80,45 -80,-25" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2.5" />
        <circle cx="0" cy="10" r="22" fill="#0f172a" stroke="url(#orangeGrad)" stroke-width="1.5" />
        <circle cx="0" cy="10" r="8" fill="#ff6b35" filter="url(#nodeGlow)" />
      </g>

      <!-- Pod Cluster 2 (Right Tier) -->
      <g transform="translate(220, -20)">
        <polygon points="0,-50 60,-20 60,40 0,70 -60,40 -60,-20" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" />
        <circle cx="0" cy="10" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
        <circle cx="0" cy="10" r="5" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>

      <!-- Base Infrastructure Platform -->
      <g transform="translate(0, 80)">
        <polygon points="0,-40 180,20 0,80 -180,20" fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="6 4" />
      </g>
    </g>
    `;
  }

  /**
   * Data Engineering: Multi-stage ETL transformation pipeline and lakehouse repository.
   */
  private static renderDataEngineering(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Pipeline Stream Conduits -->
      <path d="M-380,-40 C-260,-40 -220,0 -120,0" fill="none" stroke="#38bdf8" stroke-width="3" />
      <path d="M-380,40 C-260,40 -220,0 -120,0" fill="none" stroke="#ff6b35" stroke-width="3" />
      <path d="M-120,0 L120,0" fill="none" stroke="url(#cyanGrad)" stroke-width="4" />
      <path d="M120,0 C220,0 260,-50 360,-50" fill="none" stroke="url(#emeraldGrad)" stroke-width="3" />
      <path d="M120,0 C220,0 260,50 360,50" fill="none" stroke="url(#orangeGrad)" stroke-width="3" />

      <!-- Stage 1: Ingestion Nodes -->
      <g transform="translate(-360, -40)">
        <circle r="26" fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="2" />
        <circle r="7" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>
      <g transform="translate(-360, 40)">
        <circle r="26" fill="url(#glassGrad)" stroke="#ff6b35" stroke-width="2" />
        <circle r="7" fill="#ff6b35" filter="url(#nodeGlow)" />
      </g>

      <!-- Stage 2: Transformation Engine -->
      <g transform="translate(0, 0)">
        <rect x="-65" y="-65" width="130" height="130" rx="20" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2" />
        <circle r="36" fill="#0f172a" stroke="url(#cyanGrad)" stroke-width="2" />
        <polygon points="0,-16 14,-8 14,8 0,16 -14,8 -14,-8" fill="url(#orangeGrad)" filter="url(#nodeGlow)" />
      </g>

      <!-- Stage 3: Analytical Lakehouse Cylinders (Right) -->
      <g transform="translate(360, -50)">
        <rect x="-35" y="-30" width="70" height="60" rx="8" fill="url(#glassGrad)" stroke="#10b981" stroke-width="2" />
        <ellipse cx="0" cy="-30" rx="35" ry="10" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
        <circle cx="0" cy="5" r="6" fill="#10b981" filter="url(#nodeGlow)" />
      </g>
      <g transform="translate(360, 50)">
        <rect x="-35" y="-30" width="70" height="60" rx="8" fill="url(#glassGrad)" stroke="#f59e0b" stroke-width="2" />
        <ellipse cx="0" cy="-30" rx="35" ry="10" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5" />
        <circle cx="0" cy="5" r="6" fill="#f59e0b" filter="url(#nodeGlow)" />
      </g>
    </g>
    `;
  }

  /**
   * ML Governance & Evaluation: Model validation gates & policy audit lenses.
   */
  private static renderMlGovernance(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Governance Policy Rail -->
      <line x1="-380" y1="0" x2="380" y2="0" stroke="#475569" stroke-width="2" stroke-dasharray="8 6" />
      <path d="M-360,0 L-140,0 L0,0 L140,0 L360,0" fill="none" stroke="url(#orangeGrad)" stroke-width="2.5" />

      <!-- Step 1: Model Ingestion -->
      <g transform="translate(-280, 0)">
        <circle r="36" fill="url(#glassGrad)" stroke="#64748b" stroke-width="2" />
        <circle r="12" fill="#0f172a" stroke="#94a3b8" stroke-width="1" />
        <circle r="4" fill="#94a3b8" />
      </g>

      <!-- Step 2: Evaluation Matrix -->
      <g transform="translate(-100, 0)">
        <rect x="-45" y="-45" width="90" height="90" rx="14" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="2" />
        <circle r="20" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5" />
        <circle r="6" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>

      <!-- Step 3: Central Compliance & Risk Policy Gate -->
      <g transform="translate(100, 0)">
        <polygon points="0,-55 48,-28 48,28 0,55 -48,28 -48,-28" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2.5" />
        <circle r="22" fill="#0f172a" stroke="url(#orangeGrad)" stroke-width="1.5" />
        <circle r="8" fill="#ff6b35" filter="url(#nodeGlow)" />
      </g>

      <!-- Step 4: Approved Audit Registry Node -->
      <g transform="translate(280, 0)">
        <circle r="36" fill="url(#glassGrad)" stroke="#10b981" stroke-width="2" />
        <circle r="16" fill="#0f172a" stroke="#10b981" stroke-width="1.5" />
        <circle r="6" fill="#10b981" filter="url(#nodeGlow)" />
      </g>
    </g>
    `;
  }

  /**
   * Computer Vision: Spatial perception lattice & geometric boundary telemetry.
   */
  private static renderComputerVision(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Perspective Perception Coordinate Lattice -->
      <path d="M-300,-140 L300,-140 L200,140 L-200,140 Z" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="8 6" />
      <line x1="-300" y1="-140" x2="200" y2="140" stroke="#1e293b" stroke-width="1" />
      <line x1="300" y1="-140" x2="-200" y2="140" stroke="#1e293b" stroke-width="1" />

      <!-- Bounding Target Enclave 1 -->
      <g transform="translate(-120, -30)">
        <rect x="-60" y="-45" width="120" height="90" fill="none" stroke="url(#cyanGrad)" stroke-width="2" stroke-dasharray="6 4" />
        <path d="M-60,-30 L-60,-45 L-45,-45" fill="none" stroke="#38bdf8" stroke-width="3" />
        <path d="M60,-30 L60,-45 L45,-45" fill="none" stroke="#38bdf8" stroke-width="3" />
        <path d="M-60,30 L-60,45 L-45,45" fill="none" stroke="#38bdf8" stroke-width="3" />
        <path d="M60,30 L60,45 L45,45" fill="none" stroke="#38bdf8" stroke-width="3" />
        <circle cx="0" cy="0" r="5" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>

      <!-- Bounding Target Enclave 2 (Main Focus) -->
      <g transform="translate(100, 20)">
        <rect x="-70" y="-55" width="140" height="110" fill="none" stroke="url(#orangeGrad)" stroke-width="2.5" />
        <path d="M-70,-35 L-70,-55 L-50,-55" fill="none" stroke="#ff6b35" stroke-width="3.5" />
        <path d="M70,-35 L70,-55 L50,-55" fill="none" stroke="#ff6b35" stroke-width="3.5" />
        <path d="M-70,35 L-70,55 L-50,55" fill="none" stroke="#ff6b35" stroke-width="3.5" />
        <path d="M70,35 L70,55 L50,55" fill="none" stroke="#ff6b35" stroke-width="3.5" />
        <circle cx="0" cy="0" r="8" fill="#ff6b35" filter="url(#nodeGlow)" />
        <circle cx="0" cy="0" r="3" fill="#ffffff" />
      </g>
    </g>
    `;
  }

  /**
   * Fintech & Low Latency: High-speed cryptographic financial routing topology.
   */
  private static renderFintech(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- High Speed Consensus Grid -->
      <circle r="160" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="10 6" />
      <polygon points="0,-140 121,-70 121,70 0,140 -121,70 -121,-70" fill="none" stroke="url(#emeraldGrad)" stroke-width="2" opacity="0.8" />
      
      <!-- Central Cryptographic Ledger Core -->
      <circle r="75" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2" />
      <polygon points="0,-35 30,-18 30,18 0,35 -30,18 -30,-18" fill="#0f172a" stroke="url(#emeraldGrad)" stroke-width="2" />
      <circle r="10" fill="#f59e0b" filter="url(#nodeGlow)" />
      <circle r="4" fill="#ffffff" />

      <!-- Transaction Routing Nodes -->
      <g transform="translate(-121, -70)">
        <circle r="18" fill="url(#glassGrad)" stroke="#10b981" stroke-width="2" />
        <circle r="5" fill="#10b981" filter="url(#nodeGlow)" />
      </g>
      <g transform="translate(121, -70)">
        <circle r="18" fill="url(#glassGrad)" stroke="#ff6b35" stroke-width="2" />
        <circle r="5" fill="#ff6b35" filter="url(#nodeGlow)" />
      </g>
      <g transform="translate(-121, 70)">
        <circle r="18" fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="2" />
        <circle r="5" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>
      <g transform="translate(121, 70)">
        <circle r="18" fill="url(#glassGrad)" stroke="#10b981" stroke-width="2" />
        <circle r="5" fill="#10b981" filter="url(#nodeGlow)" />
      </g>
    </g>
    `;
  }

  /**
   * Generic High-End Architecture (Default).
   */
  private static renderGenericArchitecture(cx: number, cy: number): string {
    return `
    <g transform="translate(${cx}, ${cy})">
      <!-- Orbiting Rings -->
      <circle r="160" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.6" />
      <circle r="120" fill="none" stroke="url(#cyanGrad)" stroke-width="1.5" opacity="0.7" />
      
      <!-- Isometric Enterprise Cube Hub -->
      <polygon points="0,-75 65,-38 65,38 0,75 -65,38 -65,-38" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="2.5" />
      <polygon points="0,-75 65,-38 0,0 -65,-38" fill="#1e293b" opacity="0.8" />
      <polygon points="0,0 65,-38 65,38 0,75" fill="#0f172a" opacity="0.9" />
      <polygon points="0,0 -65,-38 -65,38 0,75" fill="#0b0f19" opacity="0.9" />
      
      <!-- Center Energy Pulse -->
      <circle r="16" fill="url(#orangeGrad)" filter="url(#nodeGlow)" />
      <circle r="6" fill="#ffffff" />

      <!-- Perimeter Satellite Nodes -->
      <g transform="translate(-120, -50)">
        <circle r="16" fill="url(#glassGrad)" stroke="url(#cyanGrad)" stroke-width="1.5" />
        <circle r="5" fill="#38bdf8" filter="url(#nodeGlow)" />
      </g>
      <g transform="translate(120, 50)">
        <circle r="16" fill="url(#glassGrad)" stroke="url(#orangeGrad)" stroke-width="1.5" />
        <circle r="5" fill="#ff6b35" filter="url(#nodeGlow)" />
      </g>
    </g>
    `;
  }
}
