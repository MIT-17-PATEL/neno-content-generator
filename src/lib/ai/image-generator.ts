import { ImageAspectRatio, ImageStylePreset } from "@/types";
import { VisualConceptEngine, ArticleContext, VisualConcept } from "./visual-concept-engine";
import { SvgArtGenerator } from "./svg-art-generator";

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

// In-memory style rotation tracker to avoid repetitive visual treatments
let lastUsedStyle: ImageStylePreset = "dark_tech";

export class ImageGenerator {
  /**
   * Builds the semantic editorial visual concept and diffusion prompt.
   */
  static async buildPrompt(options: GenerateImageOptions): Promise<{
    prompt: string;
    altText: string;
    concept: VisualConcept;
  }> {
    // Determine varied style if not explicitly requested
    let effectiveStyle = options.style;
    if (!effectiveStyle && options.previousStyles && options.previousStyles.length > 0) {
      const styles: ImageStylePreset[] = [
        "dark_tech",
        "isometric_3d",
        "minimalist_vector",
        "architectural_blueprint",
        "editorial_photo",
      ];
      const available = styles.filter((s) => !options.previousStyles?.includes(s));
      effectiveStyle = available.length > 0 ? available[0] : "dark_tech";
    }

    const context: ArticleContext = {
      title: options.topic,
      category: options.category,
      summary: options.summary,
      keyConcepts: options.keyConcepts,
      industry: options.industry,
      articleType: options.articleType || "blog",
      customPrompt: options.customPrompt,
      brandName: options.brandName,
      stylePreference: effectiveStyle,
      aspectRatio: options.aspectRatio || "16:9",
    };

    const concept = await VisualConceptEngine.deriveConcept(context);
    const { prompt, altText } = VisualConceptEngine.buildEditorialPrompt(context, concept);

    return { prompt, altText, concept };
  }

  /**
   * Generate an editorial-quality featured image representing the true technical subject.
   */
  static async generate(options: GenerateImageOptions): Promise<GeneratedImageResult> {
    const aspectRatio = options.aspectRatio || "16:9";
    const { prompt, altText, concept } = await this.buildPrompt(options);
    const style = concept.stylePreset || options.style || "dark_tech";
    lastUsedStyle = style;

    // 1. Check for OpenAI DALL-E 3
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
        console.warn("DALL-E 3 call fallback to high-fidelity SVG generator:", err);
      }
    }

    // 2. High-Fidelity FLUX.1 AI Photorealistic & Editorial Image Generation (Topic-Matched)
    try {
      const dimensionsMap: Record<ImageAspectRatio, { width: number; height: number }> = {
        "16:9": { width: 1200, height: 675 },
        "1:1": { width: 800, height: 800 },
        "4:3": { width: 1200, height: 900 },
        "9:16": { width: 675, height: 1200 },
      };
      const { width, height } = dimensionsMap[aspectRatio] || { width: 1200, height: 675 };

      const visualFocus = concept.visualConcept || options.topic;
      const cleanPrompt = `${visualFocus}, ${VisualConceptEngine.getStyleDescription(style)}, 8k resolution, cinematic lighting, ultra-detailed editorial photography, octane render, masterpiece, professional art direction, no text, no watermark, no logos`;

      const seed = Math.floor(Math.random() * 1000000);
      const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

      const res = await fetch(fluxUrl, { signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const mime = contentType.includes("png") ? "image/png" : "image/jpeg";
        const buffer = Buffer.from(await res.arrayBuffer());

        if (buffer.length > 5000) {
          const base64Img = buffer.toString("base64");
          const publicUrl = `data:${mime};base64,${base64Img}`;
          const cleanName = options.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 35);
          const filename = `hero_${cleanName}_${Date.now().toString().slice(-6)}.jpg`;
          const storageKey = `uploads/media/${filename}`;

          try {
            const fs = await import("fs");
            const path = await import("path");
            const uploadDir = path.join(process.cwd(), "public", "uploads", "media");
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            fs.writeFileSync(path.join(uploadDir, filename), buffer);
          } catch {}

          return {
            title: `${options.topic} — Featured Visual`,
            prompt: cleanPrompt,
            altText,
            publicUrl,
            storageKey,
            aspectRatio,
            style,
            visualConcept: concept.visualConcept,
            colorPalette: concept.colorPalette,
            domainKey: concept.domainKey,
          };
        }
      }
    } catch (fluxErr) {
      console.warn("FLUX image generator fallback to SVG:", fluxErr);
    }

    // 3. Dynamic Vector Graphic Generator (Bespoke SVGs Fallback)
    const { publicUrl, storageKey } = await this.saveDynamicSvg(options, concept, aspectRatio);
    return {
      title: `${options.topic} — Featured Visual`,
      prompt,
      altText,
      publicUrl,
      storageKey,
      aspectRatio,
      style,
      visualConcept: concept.visualConcept,
      colorPalette: concept.colorPalette,
      domainKey: concept.domainKey,
    };
  }

  private static async saveDynamicSvg(
    options: GenerateImageOptions,
    concept: VisualConcept,
    aspectRatio: ImageAspectRatio
  ): Promise<{ svgString: string; publicUrl: string; storageKey: string }> {
    const svgType = VisualConceptEngine.getSvgTypeForDomain(concept.domainKey);
    const svgString = SvgArtGenerator.generate({
      topic: options.topic,
      category: options.category,
      summary: options.summary,
      keyConcepts: options.keyConcepts,
      svgType,
      style: concept.stylePreset,
      aspectRatio,
      colorPalette: concept.colorPalette,
      visualConcept: concept.visualConcept,
    });

    const cleanName = options.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 35);
    const filename = `hero_${cleanName}_${Date.now().toString().slice(-6)}.svg`;
    const storageKey = `uploads/media/${filename}`;
    const base64Svg = Buffer.from(svgString, "utf8").toString("base64");
    const publicUrl = `data:image/svg+xml;base64,${base64Svg}`;

    try {
      const fs = await import("fs");
      const path = await import("path");
      const uploadDir = path.join(process.cwd(), "public", "uploads", "media");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, svgString, "utf8");
    } catch (err) {
      console.warn("Could not write SVG to static uploads folder:", err);
    }

    return { svgString, publicUrl, storageKey };
  }
}
