import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ContentLibraryPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-studio-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Content Library
          </h1>
          <p className="text-sm text-studio-400 mt-1">
            Manage drafts, reviews, approved articles, and exports
          </p>
        </div>
        <Badge variant="outline">Phase 3</Badge>
      </div>

      <Card>
        <div className="border border-dashed border-studio-800 rounded-lg p-16 text-center">
          <p className="text-sm font-medium text-studio-300">
            Content Library Workspace
          </p>
          <p className="text-xs text-studio-500 mt-1">
            Full content management, filtering, status transitions, and versioning will be active in Phase 3.
          </p>
        </div>
      </Card>
    </div>
  );
}
