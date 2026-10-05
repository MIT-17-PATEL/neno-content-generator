import { runBlogGenerationPipeline } from "../src/lib/ai/blog-generator";
import { ExportFormatter } from "../src/lib/export/export-formatter";

async function testPipeline() {
  console.log("=== Testing Blog Generation Pipeline ===");

  const generated = await runBlogGenerationPipeline({
    workspaceId: "ws_default_neno",
    userId: "usr_default_mit",
    topic: "Event-Driven Microfrontends: Real-World Latency Benchmarks and Strategic ROI",
    audience: "CTOs and Principal Architects",
    tone: "Authoritative, technical, natural human editorial",
    desiredLength: "medium",
    category: "AI Architecture & Cloud Engineering",
    researchPreference: true,
    autoGenerateImage: true,
    imageStyle: "dark_tech",
  });

  console.log("Generated Title:", generated.result.title);
  console.log("Generated Image URL:", generated.result.featuredImage?.url);
  console.log("Reading Time:", generated.result.readingTime);

  const articleMarkdown = generated.result.article;
  const hasRawImageSyntax = articleMarkdown.includes("![") || articleMarkdown.includes("data:image");
  console.log("Has raw image in markdown article:", hasRawImageSyntax);

  // Test ExportFormatter clean markdown
  const cleanMarkdown = ExportFormatter.formatCleanArticleMarkdown(articleMarkdown, generated.result.title);
  console.log("Clean markdown length:", cleanMarkdown.length);

  // Test ExportFormatter HTML renderer
  const renderedHtml = ExportFormatter.markdownToHtmlBody(cleanMarkdown);
  console.log("Rendered HTML length:", renderedHtml.length);
  console.log("Contains <h2>:", renderedHtml.includes("<h2"));
  console.log("Contains raw data:image in text:", renderedHtml.includes("data:image/svg+xml;utf8"));
  console.log("Contains raw ![ markdown:", renderedHtml.includes("!["));

  if (!hasRawImageSyntax && !renderedHtml.includes("data:image/svg+xml;utf8") && !renderedHtml.includes("![")) {
    console.log("SUCCESS: Content rendering is completely clean with 0 leaked image syntax!");
  } else {
    console.error("FAIL: Leaked image syntax found!");
  }
}

testPipeline().catch(console.error);
