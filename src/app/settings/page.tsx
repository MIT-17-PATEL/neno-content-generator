import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-studio-800/60 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Workspace & Brand Settings
          </h1>
          <p className="text-sm text-studio-400 mt-1">
            Configure brand voice, style guidelines, preferred and prohibited terminology
          </p>
        </div>
        <Badge variant="outline">Phase 1</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand Voice & Guidelines</CardTitle>
          <CardDescription>
            Defines the audience, tone, industry rules, and brand vocabulary injected into writer and strategist agents.
          </CardDescription>
        </CardHeader>
        <div className="border border-dashed border-studio-800 rounded-lg p-12 text-center">
          <p className="text-sm font-medium text-studio-300">
            Brand Settings Management
          </p>
          <p className="text-xs text-studio-500 mt-1">
            Brand settings forms and workspace persistence will be fully active in Phase 1.
          </p>
        </div>
      </Card>
    </div>
  );
}
