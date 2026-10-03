import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MediaPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-studio-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Media & Asset Library
          </h1>
          <p className="text-sm text-studio-400 mt-1">
            Generated visual assets, image prompts, and S3 storage
          </p>
        </div>
        <Badge variant="outline">Phase 10</Badge>
      </div>

      <Card>
        <div className="border border-dashed border-studio-800 rounded-lg p-16 text-center">
          <p className="text-sm font-medium text-studio-300">
            Media Asset Engine
          </p>
          <p className="text-xs text-studio-500 mt-1">
            AI image generation, S3 secure upload validation, and asset metadata will be active in Phase 10.
          </p>
        </div>
      </Card>
    </div>
  );
}
