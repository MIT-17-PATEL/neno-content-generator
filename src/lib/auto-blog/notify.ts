import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { AutoBlogResult } from "@/lib/auto-blog/run-auto-blog";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function summary(r: AutoBlogResult): { subject: string; line: string } {
  const label = { published: "Published", draft: "Draft ready for review", skipped: "Skipped", failed: "FAILED" }[r.status];
  return {
    subject: `Neno Auto Blog: ${label}${r.title ? ` — ${r.title}` : r.topic ? ` — ${r.topic}` : ""}`,
    line: r.error ? `Error: ${r.error}` : r.reason || label,
  };
}

const NOTICE_FILE = path.join(process.cwd(), "logs", "auto-blog", ".last-outage-notice");
const OUTAGE_QUIET_MS = 3 * 3_600_000;

/**
 * Scheduled checks run every 15 minutes: when one fails before doing anything (DB / API unreachable), notify at most
 * once every 3 hours. A file, not the DB, because the DB may be what's down.
 */
function quietOutage(r: AutoBlogResult): boolean {
  if (r.status !== "failed" || r.trigger !== "scheduled" || r.topic || r.contentId) return false;
  try {
    if (Date.now() - fs.statSync(NOTICE_FILE).mtimeMs < OUTAGE_QUIET_MS) return true;
  } catch {
    // no notice sent yet
  }
  try {
    fs.mkdirSync(path.dirname(NOTICE_FILE), { recursive: true });
    fs.writeFileSync(NOTICE_FILE, new Date().toISOString());
  } catch {
    // can't record it: notify anyway
  }
  return false;
}

/** Emails the run result via Resend; without RESEND_API_KEY (or if sending fails) shows a Windows toast instead. */
export async function notifyRun(r: AutoBlogResult): Promise<void> {
  if (quietOutage(r)) {
    console.log("[auto-blog] outage already notified in the last 3 hours; not notifying again");
    return;
  }
  const to = r.notifyEmail || process.env.ADMIN_EMAIL;
  if (process.env.RESEND_API_KEY && to) {
    try {
      await sendEmail(r, to);
      return;
    } catch (err) {
      console.error("[auto-blog] email failed, falling back to a toast:", err instanceof Error ? err.message : err);
    }
  }
  const { subject, line } = summary(r);
  await toast(subject, line);
}

async function sendEmail(r: AutoBlogResult, to: string): Promise<void> {
  const { subject, line } = summary(r);
  const attachments: Array<Record<string, string>> = [];
  let coverHtml = "";
  if (r.coverUri?.startsWith("data:")) {
    // WebP data URIs don't show in most mail clients: send a small inline JPEG (cid) instead.
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(Buffer.from(r.coverUri.split(",")[1], "base64")).resize({ width: 600 }).jpeg({ quality: 80 }).toBuffer();
    attachments.push({ filename: "cover.jpg", content: jpg.toString("base64"), content_id: "cover" });
    coverHtml = `<img src="cid:cover" width="600" alt="Cover" style="max-width:100%;border-radius:8px">`;
  } else if (r.coverUri?.startsWith("https://")) {
    coverHtml = `<img src="${esc(r.coverUri)}" width="600" alt="Cover" style="max-width:100%;border-radius:8px">`;
  }
  const rows: Array<[string, string | null]> = [
    ["Status", r.status], ["Mode", r.mode], ["Topic", r.topic], ["Category", r.category],
    ["Duration", `${Math.round(r.durationMs / 1000)}s`], ["Trigger", r.trigger],
  ];
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px">
<h2 style="margin:0 0 8px">${esc(r.title || r.topic || "Automated blog run")}</h2>
<p style="color:${r.status === "failed" ? "#b91c1c" : "#334155"}">${esc(line)}</p>
${coverHtml}
<table style="margin-top:12px;font-size:14px">${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="color:#64748b;padding-right:12px">${k}</td><td>${esc(String(v))}</td></tr>`).join("")}</table>
${r.reviewUrl ? `<p><a href="${esc(r.reviewUrl)}" style="display:inline-block;background:#ea580c;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open Review &amp; Publish</a></p><p style="font-size:12px;color:#64748b">Opens on this PC (the content engine must be running: npm run dev).</p>` : ""}
</div>`;
  await postResend(to, subject, html, attachments);
}

async function postResend(to: string, subject: string, html: string, attachments: Array<Record<string, string>> = []): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTO_BLOG_EMAIL_FROM || "Neno Auto Blog <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      ...(attachments.length ? { attachments } : {}),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { id } = (await res.json().catch(() => ({}))) as { id?: string };
  console.log(`[auto-blog] email sent to ${to} (Resend id ${id || "unknown"})`);
}

export interface BatchSummary {
  batchAt: Date;
  mode: "draft" | "publish";
  notifyEmail: string | null;
  items: Array<{ status: string; title: string | null; url: string | null; note: string | null }>;
}

/** Pure: subject + text of the daily "Every N days" summary. */
export function batchSummaryText(s: BatchSummary): { subject: string; line: string } {
  const made = s.items.filter((i) => i.status === "done").length;
  const failed = s.items.filter((i) => i.status === "failed").length;
  const skipped = s.items.filter((i) => i.status === "skipped").length;
  const day = s.batchAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  const parts = [`${made} of ${s.items.length} post${s.items.length === 1 ? "" : "s"} made`, failed && `${failed} failed`, skipped && `${skipped} skipped`].filter(Boolean);
  return { subject: `Neno Auto Blog ${day}: ${parts.join(", ")}`, line: `${parts.join(", ")} (${s.mode === "publish" ? "auto-publish" : "drafts for review"}).` };
}

/** One email per batch day (Resend), or a toast without RESEND_API_KEY. */
export async function notifyBatchSummary(s: BatchSummary): Promise<void> {
  const { subject, line } = batchSummaryText(s);
  console.log(`[auto-blog] daily summary: ${subject} | ${line} | ${s.items.map((i) => `${i.status}: ${i.title || i.note || "-"}${i.url ? ` <${i.url}>` : ""}`).join(" ; ")}`);
  const to = s.notifyEmail || process.env.ADMIN_EMAIL;
  if (process.env.RESEND_API_KEY && to) {
    const color: Record<string, string> = { done: "#047857", failed: "#b91c1c", skipped: "#b45309" };
    const rows = s.items.map((i) => `<tr>
<td style="padding:6px 12px 6px 0;color:${color[i.status] || "#334155"};white-space:nowrap">${esc(i.status)}</td>
<td style="padding:6px 0">${i.url ? `<a href="${esc(i.url)}">${esc(i.title || "Open post")}</a>` : esc(i.title || "—")}${i.note ? `<div style="font-size:12px;color:#64748b">${esc(i.note)}</div>` : ""}</td>
</tr>`).join("");
    const html = `<div style="font-family:Arial,sans-serif;max-width:640px">
<h2 style="margin:0 0 8px">${esc(subject)}</h2>
<p style="color:#334155">${esc(line)}</p>
<table style="font-size:14px;border-collapse:collapse">${rows}</table>
<p style="font-size:12px;color:#64748b">Links open Review &amp; Publish on this PC (the content engine must be running: npm run dev).</p>
</div>`;
    try {
      await postResend(to, subject, html);
      return;
    } catch (err) {
      console.error("[auto-blog] summary email failed, falling back to a toast:", err instanceof Error ? err.message : err);
    }
  }
  await toast(subject, line);
}

// Text goes in through environment variables, never into the script, so titles can't inject PowerShell.
const TOAST_PS = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$x = $t.GetElementsByTagName('text')
$x.Item(0).AppendChild($t.CreateTextNode($env:NENO_TOAST_TITLE)) > $null
$x.Item(1).AppendChild($t.CreateTextNode($env:NENO_TOAST_BODY)) > $null
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($t))`;

function toast(title: string, body: string): Promise<void> {
  if (process.platform !== "win32") {
    console.log(`[auto-blog] ${title}: ${body}`);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", TOAST_PS],
      { env: { ...process.env, NENO_TOAST_TITLE: title.slice(0, 120), NENO_TOAST_BODY: body.slice(0, 250) }, timeout: 20_000 },
      (err) => {
        if (err) console.error("[auto-blog] toast failed:", err.message);
        resolve();
      }
    );
  });
}
