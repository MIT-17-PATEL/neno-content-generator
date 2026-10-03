import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ResearchPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-studio-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Research & Source Repository
          </h1>
          <p className="text-sm text-studio-400 mt-1">
            Retained citations, publisher notes, and untrusted-input sanitized snippets
          </p>
        </div>
        <Badge variant="outline">Phase 6</Badge>
      </div>

      <Card>
        <div className="border border-dashed border-studio-800 rounded-lg p-16 text-center">
          <p className="text-sm font-medium text-studio-300">
            Research System
          </p>
          <p className="text-xs text-studio-500 mt-1">
            Web source retrieval, citation tracking, and prompt-injection defense layers will be active in Phase 6.
          </p>
        </div>
      </Card>
    </div>
  );
}
