import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { ContentService } from "@/services/content-service";
import { VersionService } from "@/services/version-service";
import { ResearchService } from "@/services/research-service";
import { z } from "zod";

const patchContentSchema = z.object({
  workspaceId: z.string().min(1),
  status: z.enum(["draft", "generating", "in_review", "approved", "exported"]).optional(),
  title: z.string().min(1).optional(),
  category: z.string().optional(),
  excerpt: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 }
    );
  }

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const item = await ContentService.getById(workspaceId, params.id);
  if (!item) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  const currentVersion = await VersionService.getLatest(params.id);
  const versions = await VersionService.listByContent(params.id);
  const sources = await ResearchService.listByContent(params.id);

  return NextResponse.json({
    item,
    currentVersion,
    versions,
    sources,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const parsed = patchContentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const wsAuth = await requireWorkspaceAccess(req, parsed.data.workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    if (parsed.data.status) {
      const updated = await ContentService.updateStatus(
        parsed.data.workspaceId,
        params.id,
        parsed.data.status
      );
      if (!updated) {
        return NextResponse.json({ error: "Content item not found" }, { status: 404 });
      }
      return NextResponse.json({ item: updated });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Patch content error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query parameter is required" },
      { status: 400 }
    );
  }

  const auth = await requireWorkspaceAccess(req, workspaceId);
  if ("error" in auth) return auth.error;

  const item = await ContentService.getById(workspaceId, params.id);
  if (!item) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  // 1. Synchronize Deletion with Neno Tech Website (DELETE /api/admin/blogs/[id])
  const websiteBaseUrl = (
    process.env.NENO_WEBSITE_URL ||
    process.env.NENO_WEBSITE_API_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "").replace(/\/api\/admin\/blogs$/, "").replace(/\/api\/blogs$/, "");

  const adminEmail = process.env.NENO_WEBSITE_ADMIN_EMAIL || "admin@neno.tech";
  const adminPassword = process.env.NENO_WEBSITE_ADMIN_PASSWORD || "admin123";
  let sessionCookie = process.env.NENO_ADMIN_SESSION || "";

  if (!sessionCookie) {
    try {
      const authRes = await fetch(`${websiteBaseUrl}/api/admin/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      if (authRes.ok) {
        const setCookieHeader = authRes.headers.get("set-cookie");
        if (setCookieHeader) {
          const match = setCookieHeader.match(/neno-admin-session=([^;]+)/);
          sessionCookie = match ? `neno-admin-session=${match[1]}` : setCookieHeader.split(";")[0];
        }
      }
    } catch {
      // Ignore website auth errors if website is temporarily offline
    }
  }

  // Attempt delete on target website by slug and by id
  const headers: Record<string, string> = {};
  if (sessionCookie) headers["Cookie"] = sessionCookie;

  const deleteEndpoints = [
    item.slug ? `${websiteBaseUrl}/api/admin/blogs/${encodeURIComponent(item.slug)}` : null,
    item.id ? `${websiteBaseUrl}/api/admin/blogs/${encodeURIComponent(item.id)}` : null,
  ].filter(Boolean) as string[];

  let deletedFromWebsite = false;
  for (const url of deleteEndpoints) {
    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        deletedFromWebsite = true;
        break;
      }
    } catch {
      // Continue to next endpoint
    }
  }

  // 2. Delete locally from Content Studio
  const deleted = await ContentService.delete(workspaceId, params.id);
  if (!deleted) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    message: "Content item deleted",
    deletedFromWebsite,
  });
}
