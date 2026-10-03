import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireWorkspaceAccess } from "@/server/auth-guard";
import { MediaService } from "@/services/media-service";
import { MediaType } from "@/types";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if ("error" in auth) return auth.error;

  try {
    const formData = await req.formData();
    const workspaceId = formData.get("workspaceId") as string;
    const contentId = (formData.get("contentId") as string) || undefined;
    const title = (formData.get("title") as string) || "Uploaded Asset";
    const altText = (formData.get("altText") as string) || title;
    const type = ((formData.get("type") as string) || "attachment") as MediaType;
    const file = formData.get("file") as File | null;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const wsAuth = await requireWorkspaceAccess(req, workspaceId);
    if ("error" in wsAuth) return wsAuth.error;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file format (${file.type}). Allowed: PNG, JPEG, WebP, SVG, GIF.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 5MB.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    const storageKey = `uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const asset = await MediaService.create({
      workspaceId,
      contentId,
      type,
      title: title || file.name,
      altText,
      storageKey,
      publicUrl: dataUrl,
      fileSize: file.size,
      mimeType: file.type,
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      asset,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
