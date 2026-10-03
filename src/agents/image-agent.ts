import { AgentContext, ImageAgentOutput, WriterAgentOutput } from "./types";

export class ImageAgent {
  static async execute(
    topic: string,
    category: string,
    writerOutput: WriterAgentOutput,
    context: AgentContext
  ): Promise<ImageAgentOutput> {
    if (process.env.AI_PROVIDER_API_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.AI_PROVIDER_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are the Image Generation & Visual Direction Agent.
Create a visual brief, text-to-image prompt, and accessibility alt text for a featured hero image.
Return JSON:
{
  "imageBrief": "Art director concept brief",
  "generationPrompt": "Detailed diffusion prompt",
  "altText": "Descriptive accessibility text"
}`,
              },
              {
                role: "user",
                content: `Create a featured visual brief for: "${topic}".`,
              },
            ],
          }),
        });

        if (response.ok) {
          const res = await response.json();
          return JSON.parse(res.choices[0].message.content) as ImageAgentOutput;
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
