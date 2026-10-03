import { ImageAspectRatio, ImageStylePreset } from "@/types";

export interface GenerateImageOptions {
  topic: string;
  category?: string;
  style?: ImageStylePreset;
  aspectRatio?: ImageAspectRatio;
  customPrompt?: string;
  brandName?: string;
}

export interface GeneratedImageResult {
  title: string;
  prompt: string;
  altText: string;
  publicUrl: string;
  storageKey: string;
  aspectRatio: ImageAspectRatio;
  style: ImageStylePreset;
}

const STYLE_PROMPT_MAP: Record<ImageStylePreset, string> = {
  dark_tech:
    "Dark tech aesthetic, deep slate background (#0b0f17), luminous cyan and emerald fiber optic data streams, frosted glass geometric structures, volumetric lighting, hyper-detailed 3D render, octane render 8k, cinematic enterprise look.",
  minimalist_vector:
    "Swiss modernist editorial flat vector illustration, minimalist layout, elegant geometric abstract forms, refined monochrome palette with rich indigo accent, clean lines, premium SaaS publication style.",
  architectural_blueprint:
    "High-tech architectural schematic blueprint, precise engineering grid lines, white and cyan wireframe CAD overlay on deep navy background, technical typography labels, declassified systems diagram aesthetic.",
  editorial_photo:
    "High-end corporate editorial photography, modern tech executive environment, soft cinematic natural lighting, shallow depth of field, Hasselblad medium format photo, rich textured surfaces.",
  isometric_3d:
    "Isometric 3D cloud infrastructure diagram, floating glass platforms, glowing microchips and server modules, interconnected luminous data pipelines, soft ambient occlusion, clean modern tech 3D.",
};

export class ImageGenerator {
  static buildPrompt(options: GenerateImageOptions): { prompt: string; altText: string } {
    const stylePreset = options.style || "dark_tech";
    const styleModifier = STYLE_PROMPT_MAP[stylePreset];
    const brand = options.brandName ? `Aligned with brand "${options.brandName}". ` : "";

    const finalPrompt = options.customPrompt
      ? `${options.customPrompt}. ${styleModifier} ${brand}`.trim()
      : `Featured hero visualization representing "${options.topic}" in category "${options.category || "Technology"}". ${styleModifier} ${brand}`.trim();

    const altText = `Visual representation of ${options.topic} featuring ${stylePreset.replace("_", " ")} aesthetic.`;

    return { prompt: finalPrompt, altText };
  }

  static async generate(options: GenerateImageOptions): Promise<GeneratedImageResult> {
    const style = options.style || "dark_tech";
    const aspectRatio = options.aspectRatio || "16:9";
    const { prompt, altText } = this.buildPrompt(options);

    // If OpenAI API Key is provided (sk- prefix), call DALL-E 3
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_PROVIDER_API_KEY;
    if (apiKey && apiKey.startsWith("sk-")) {
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
            Authorization: `Bearer ${process.env.AI_PROVIDER_API_KEY}`,
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt,
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
            };
          }
        }
      } catch (err) {
        console.warn("DALL-E 3 call fallback:", err);
      }
    }

    // High-Fidelity Vector Graphic Generator fallback
    const svgUrl = this.generateDynamicSvg(options.topic, style, aspectRatio);
    return {
      title: `${options.topic} — Featured Visual`,
      prompt,
      altText,
      publicUrl: svgUrl,
      storageKey: `generated/${Date.now()}_vector.svg`,
      aspectRatio,
      style,
    };
  }

  private static generateDynamicSvg(
    topic: string,
    style: ImageStylePreset,
    aspectRatio: ImageAspectRatio
  ): string {
    const dimensions: Record<ImageAspectRatio, { w: number; h: number }> = {
      "16:9": { w: 1280, h: 720 },
      "1:1": { w: 800, h: 800 },
      "4:3": { w: 1024, h: 768 },
      "9:16": { w: 720, h: 1280 },
    };

    const { w, h } = dimensions[aspectRatio] || dimensions["16:9"];
    const sanitizedTopic = topic.replace(/[<>&"]/g, "").slice(0, 60);

    let gradientDefs = `
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16" />
        <stop offset="50%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#020617" />
      </linearGradient>
      <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#3b82f6" />
        <stop offset="50%" stop-color="#8b5cf6" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
    `;

    if (style === "architectural_blueprint") {
      gradientDefs = `
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#051923" />
          <stop offset="100%" stop-color="#003554" />
        </linearGradient>
        <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00a6fb" />
          <stop offset="100%" stop-color="#0582ca" />
        </linearGradient>
      `;
    } else if (style === "minimalist_vector") {
      gradientDefs = `
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#18181b" />
          <stop offset="100%" stop-color="#09090b" />
        </linearGradient>
        <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#ec4899" />
        </linearGradient>
      `;
    }

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    ${gradientDefs}
    <filter id="blurFilter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${w}" height="${h}" fill="url(#bgGrad)" />

  <!-- Ambient Glow -->
  <circle cx="${w * 0.75}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.35}" fill="#3b82f6" opacity="0.18" filter="url(#blurFilter)" />
  <circle cx="${w * 0.25}" cy="${h * 0.7}" r="${Math.min(w, h) * 0.3}" fill="#8b5cf6" opacity="0.15" filter="url(#blurFilter)" />

  <!-- Grid overlay -->
  <g stroke="#ffffff" stroke-opacity="0.05" stroke-width="1">
    ${Array.from({ length: 12 })
      .map((_, i) => `<line x1="${(w / 12) * (i + 1)}" y1="0" x2="${(w / 12) * (i + 1)}" y2="${h}" />`)
      .join("")}
    ${Array.from({ length: 8 })
      .map((_, i) => `<line x1="0" y1="${(h / 8) * (i + 1)}" x2="${w}" y2="${(h / 8) * (i + 1)}" />`)
      .join("")}
  </g>

  <!-- Isometric / Geometric Centerpiece -->
  <g transform="translate(${w / 2}, ${h / 2 - 20})">
    <!-- Outer Ring -->
    <circle r="160" fill="none" stroke="url(#glowGrad)" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.6" />
    <circle r="120" fill="none" stroke="#3b82f6" stroke-width="1" opacity="0.4" />
    
    <!-- Isometric Cube / Core Node -->
    <polygon points="0,-70 60,-35 60,35 0,70 -60,35 -60,-35" fill="#0f172a" stroke="url(#glowGrad)" stroke-width="2.5" opacity="0.9" />
    <polygon points="0,-70 60,-35 0,0 -60,-35" fill="#1e293b" opacity="0.8" />
    <polygon points="0,0 60,-35 60,35 0,70" fill="#0f172a" opacity="0.9" />
    <polygon points="0,0 -60,-35 -60,35 0,70" fill="#0b0f19" opacity="0.9" />
    
    <!-- Glowing Pulse Core -->
    <circle r="14" fill="url(#glowGrad)" />
    <circle r="6" fill="#ffffff" />
  </g>

  <!-- Title & Meta -->
  <text x="${w / 2}" y="${h - 80}" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" letter-spacing="-0.02em">
    ${sanitizedTopic}
  </text>
  <text x="${w / 2}" y="${h - 50}" text-anchor="middle" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500" letter-spacing="0.08em">
    AI CONTENT STUDIO • FEATURED ASSET (${style.toUpperCase().replace("_", " ")})
  </text>
</svg>
    `.trim();

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}
