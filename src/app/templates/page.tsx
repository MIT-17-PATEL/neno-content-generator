import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TemplatesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-studio-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Prompt Templates & Workflows
          </h1>
          <p className="text-sm text-studio-400 mt-1">
            Agent prompt versions and generation pipelines
          </p>
        </div>
        <Badge variant="outline">Templates</Badge>
      </div>

      <Card>
        <div className="border border-dashed border-studio-800 rounded-lg p-16 text-center">
          <p className="text-sm font-medium text-studio-300">
            Prompt & Engine Configuration
          </p>
          <p className="text-xs text-studio-500 mt-1">
            Prompt templates versioning and custom workflows.
          </p>
        </div>
      </Card>
    </div>
  );
}
