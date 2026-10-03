import { AgentContext, ImageAgentOutput, WriterAgentOutput } from "./types";
import { callAiStructured, isAiConfigured } from "@/lib/ai/ai-client";

export class ImageAgent {
  static async execute(
    topic: string,
    category: string,
    writerOutput: WriterAgentOutput,
    context: AgentContext
  ): Promise<ImageAgentOutput> {
    if (isAiConfigured()) {
      try {
        const res = await callAiStructured<ImageAgentOutput>({
          systemPrompt: `You are the Image Generation & Visual Direction Agent.
Create a visual brief, text-to-image prompt, and accessibility alt text for a featured hero image.
Return JSON:
{
  "imageBrief": "Art director concept brief",
  "generationPrompt": "Detailed diffusion prompt",
  "altText": "Descriptive accessibility text"
}`,
          userPrompt: `Create a featured visual brief for: "${topic}".`,
        });

        if (res?.generationPrompt && res?.imageBrief) {
          return res;
        }
      } catch (err) {
        console.warn("Image Agent fallback notice:", err);
      }
    }

    // Heuristic Visual Output
    return {
      imageBrief: `A high-end 3D isometric architectural illustration visualizing ${topic}. Features luminous glowing data channels connecting modular nodes on dark slate glass foundations.`,
      generationPrompt: `High-end minimalist 3D isometric render of ${topic}, glowing emerald and indigo data conduits, frosted dark glass geometric pedestals, volumetric cyber lighting, octane render, 8k resolution, cinematic studio lighting.`,
      altText: `Isometric digital 3D visualization representing ${topic} with luminous data conduits on dark slate surfaces`,
    };
  }
}
