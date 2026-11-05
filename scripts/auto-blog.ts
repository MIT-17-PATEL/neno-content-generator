/**
 * npm run blog:auto [-- --force]
 * Runs one automated blog post without the dev server: loads .env.local itself, calls runAutoBlog(),
 * writes logs/auto-blog/<time>.log and exits (code 1 on failure). Started daily by Windows Task Scheduler.
 */
import fs from "node:fs";
import path from "node:path";
import { format } from "node:util";
import { loadEnvConfig } from "@next/env";

const root = path.resolve(__dirname, "..");
process.chdir(root); // Task Scheduler may start us elsewhere; fonts/mermaid are read relative to cwd
loadEnvConfig(root, true);
process.env.DB_POOL_MAX ||= "2";
process.env.DB_CONNECT_TIMEOUT_MS ||= "15000";

// Tee console output into the per-run log file.
const lines: string[] = [];
for (const level of ["log", "warn", "error"] as const) {
  const orig = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    lines.push(`${new Date().toISOString()} ${level.toUpperCase()} ${format(...args)}`);
    orig(...args);
  };
}

async function main(): Promise<number> {
  const force = process.argv.includes("--force");
  // Imported after the env is loaded: the DB client reads DATABASE_URL / pool settings at import time.
  const { runAutoBlog } = await import("../src/lib/auto-blog/run-auto-blog");
  const { db } = await import("../src/db/client");

  const r = await runAutoBlog({ trigger: force ? "manual" : "scheduled", force });
  await db.close().catch(() => {});

  const stamp = r.startedAt.toISOString().replace(/[:.]/g, "-");
  const dir = path.join(root, "logs", "auto-blog");
  fs.mkdirSync(dir, { recursive: true });
  // Routine checks (every 15 min: disabled / nothing due) get one line in a daily file, not a log file each.
  if (r.status === "skipped" && !r.notify) {
    fs.appendFileSync(path.join(dir, `checks-${stamp.slice(0, 10)}.log`), `${r.startedAt.toISOString()} skipped (${(r.durationMs / 1000).toFixed(1)}s): ${r.reason}\n`);
    return 0;
  }
  const header = [
    `time:     ${r.startedAt.toISOString()}`,
    `trigger:  ${r.trigger}`,
    `topic:    ${r.topic ?? "-"}`,
    `mode:     ${r.mode ?? "-"}`,
    `result:   ${r.status}${r.title ? ` (${r.title})` : ""}`,
    `reason:   ${r.reason ?? "-"}`,
    `duration: ${(r.durationMs / 1000).toFixed(1)}s`,
    `error:    ${r.error ?? "-"}`,
    `review:   ${r.reviewUrl ?? "-"}`,
  ].join("\n");
  fs.writeFileSync(path.join(dir, `${stamp}.log`), `${header}\n\n--- output ---\n${lines.join("\n")}\n`);
  console.log(`\n${header}`);
  return r.status === "failed" ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("auto-blog crashed:", err);
    process.exit(1);
  });
