"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Play, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NENO_CATEGORIES } from "@/lib/auto-blog/categories";

interface Settings {
  enabled: boolean;
  interval_days: number;
  preferred_time: string;
  timezone: string;
  mode: "draft" | "publish";
  cover_preference: "auto" | "diagram" | "stock" | "photo";
  notify_email: string | null;
  use_suggested: boolean;
  topic_source?: "queue" | "live" | "queue_then_live";
  schedule_type?: "interval" | "weekly";
  posts_per_week?: number;
  random_count?: boolean;
  posts_min?: number;
  posts_max?: number;
  window_start?: string;
  window_end?: string;
  allowed_days?: number[];
  posts_per_run?: number; // undefined until migration 006
  spread_mode?: "spread" | "all_at_once";
  last_post_at: string | null;
  last_category: string | null;
  locked_at: string | null;
}
interface Topic { id: string; title: string; category: string; notes: string | null; status: "queued" | "suggested" | "used"; source: string; content_id: string | null; used_at: string | null }
interface Slot { id: string; slot_at: string; status: "pending" | "running" | "done" | "failed" | "skipped"; content_id: string | null; attempts: number; note: string | null }
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOT_BADGE: Record<Slot["status"], "info" | "warning" | "success" | "destructive" | "secondary"> = {
  pending: "info", running: "warning", done: "success", failed: "destructive", skipped: "secondary",
};
const fmtSlot = (d: string) => new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
interface Run { id: string; trigger: string; started_at: string; duration_ms: number; mode: string | null; status: string; topic: string | null; content_id: string | null; title: string | null; reason: string | null; error: string | null }

const field = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500";
const label = "block text-xs font-medium text-slate-600 mb-1";
const STATUS_BADGE: Record<string, "success" | "warning" | "destructive" | "secondary" | "info"> = {
  published: "success", draft: "info", skipped: "warning", failed: "destructive",
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—");

async function api(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = data.details?.fieldErrors ? ` ${Object.values(data.details.fieldErrors).flat().join(" ")}` : "";
    throw new Error((data.error || `HTTP ${res.status}`) + details);
  }
  return data;
}

export default function AutomationPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsHere, setRunsHere] = useState(true);
  const [plan, setPlan] = useState<Slot[] | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState("");
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [draft, setDraft] = useState({ title: "", category: NENO_CATEGORIES[0], notes: "" });
  const [editing, setEditing] = useState<{ id: string; title: string; category: string; notes: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/auto-blog");
      setSettings(data.settings);
      setTopics(data.topics);
      setRuns(data.runs);
      setRunsHere(data.runsHere);
      setPlan(data.plan);
      setPlanError(data.planError);
      setError("");
      return data as { settings: Settings; runs: Run[] };
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // While a "Run now" is in progress, poll until its history row appears (runs take a few minutes).
  useEffect(() => {
    if (!runStartedAt) return;
    const timer = setInterval(async () => {
      const data = await load();
      const finished = data && !data.settings.locked_at && data.runs.some((r) => new Date(r.started_at).getTime() >= runStartedAt - 5000);
      if (finished || Date.now() - runStartedAt > 35 * 60_000) setRunStartedAt(null);
    }, 5000);
    return () => clearInterval(timer);
  }, [runStartedAt, load]);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  };

  const saveSettings = () => act("save", async () => {
    if (!settings) return;
    const { enabled, interval_days, preferred_time, timezone, mode, cover_preference, notify_email, use_suggested, topic_source } = settings;
    // Schedule-type fields exist only once migration 005 is applied (planError says it isn't).
    const weekly = planError ? {} : {
      schedule_type: settings.schedule_type || "interval",
      posts_per_week: settings.posts_per_week ?? 3,
      random_count: settings.random_count ?? false,
      posts_min: settings.posts_min ?? 2,
      posts_max: settings.posts_max ?? 4,
      window_start: settings.window_start || "09:00",
      window_end: settings.window_end || "19:00",
      allowed_days: settings.allowed_days?.length ? settings.allowed_days : [1, 2, 3, 4, 5, 6, 7],
    };
    const perRun = settings.posts_per_run === undefined ? {} : { posts_per_run: settings.posts_per_run, spread_mode: settings.spread_mode || "spread" }; // migration 006
    await api("/api/auto-blog", "PUT", { enabled, interval_days, preferred_time, timezone, mode, cover_preference, notify_email: notify_email || "", use_suggested, topic_source: topic_source || "queue_then_live", ...weekly, ...perRun });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  });

  const runNow = () => act("run", async () => {
    await api("/api/auto-blog/run", "POST");
    setRunStartedAt(Date.now());
  });

  const pending = topics.filter((t) => t.status !== "used");
  const used = topics.filter((t) => t.status === "used");
  const move = (id: string, dir: -1 | 1) => act(`move-${id}`, async () => {
    const ids = pending.map((t) => t.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await api("/api/auto-blog/topics", "PUT", { ids });
  });

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => (s ? { ...s, [k]: v } : s));
  const clampWeek = (v: string) => Math.max(1, Math.min(7, Number(v) || 1));
  const weeklyMode = settings?.schedule_type === "weekly";
  const isRunning = Boolean(runStartedAt) || Boolean(settings?.locked_at && Date.now() - new Date(settings.locked_at).getTime() < 30 * 60_000);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Blog Automation</h1>
          <p className="text-sm text-slate-500">One post every few days from your topic queue, run by Windows Task Scheduler on this PC.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
          <Button size="sm" onClick={runNow} disabled={!runsHere || isRunning || busy === "run"} className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white">
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isRunning ? "Running…" : "Run now"}
          </Button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {!runsHere && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">This is the hosted site. Automation runs only on your PC: open the content engine locally to use Run now.</div>}
      {isRunning && <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">A run is in progress (usually 3–8 minutes). This page refreshes on its own.</div>}

      {settings && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Settings</h2>
            <Button size="sm" onClick={saveSettings} disabled={busy === "save"} className="gap-1.5">
              {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}{saved ? "Saved" : "Save settings"}
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" checked={settings.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 accent-orange-600" />
            Enable scheduled blog creation
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="schedule">Schedule type</label>
              <select id="schedule" className={field} disabled={Boolean(planError)} value={weeklyMode ? "weekly" : "interval"} onChange={(e) => set("schedule_type", e.target.value as Settings["schedule_type"])}>
                <option value="interval">Every N days</option>
                <option value="weekly">Posts per week (random days and times)</option>
              </select>
            </div>
            {weeklyMode ? (
              <>
                <div>
                  <label className={label} htmlFor="ppw">Posts per week</label>
                  <input id="ppw" type="number" min={1} max={7} className={field} disabled={settings.random_count} value={settings.posts_per_week ?? 3} onChange={(e) => set("posts_per_week", clampWeek(e.target.value))} />
                  <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={settings.random_count ?? false} onChange={(e) => set("random_count", e.target.checked)} className="h-4 w-4 accent-orange-600" />
                    Random count each week
                  </label>
                </div>
                {settings.random_count ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={label} htmlFor="pmin">Min</label>
                      <input id="pmin" type="number" min={1} max={7} className={field} value={settings.posts_min ?? 2} onChange={(e) => set("posts_min", clampWeek(e.target.value))} />
                    </div>
                    <div>
                      <label className={label} htmlFor="pmax">Max</label>
                      <input id="pmax" type="number" min={1} max={7} className={field} value={settings.posts_max ?? 4} onChange={(e) => set("posts_max", clampWeek(e.target.value))} />
                    </div>
                  </div>
                ) : <div />}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={label} htmlFor="wstart">Earliest (IST)</label>
                    <input id="wstart" type="time" step={300} className={field} value={settings.window_start || "09:00"} onChange={(e) => set("window_start", e.target.value)} />
                  </div>
                  <div>
                    <label className={label} htmlFor="wend">Latest (IST)</label>
                    <input id="wend" type="time" step={300} className={field} value={settings.window_end || "19:00"} onChange={(e) => set("window_end", e.target.value)} />
                  </div>
                </div>
                <fieldset className="sm:col-span-2">
                  <legend className={label}>Allowed days</legend>
                  <div className="flex flex-wrap gap-3">
                    {DAYS.map((d, i) => {
                      const days = settings.allowed_days?.length ? settings.allowed_days : [1, 2, 3, 4, 5, 6, 7];
                      return (
                        <label key={d} className="flex items-center gap-1.5 text-sm text-slate-800">
                          <input type="checkbox" className="h-4 w-4 accent-orange-600" checked={days.includes(i + 1)}
                            onChange={(e) => set("allowed_days", e.target.checked ? [...days, i + 1].sort() : days.filter((x) => x !== i + 1))} />
                          {d}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </>
            ) : (
              <>
                <div>
                  <label className={label} htmlFor="interval">Every (days)</label>
                  <input id="interval" type="number" min={1} max={60} className={field} value={settings.interval_days} onChange={(e) => set("interval_days", Number(e.target.value) || 1)} />
                </div>
                {settings.posts_per_run !== undefined && (
                  <div>
                    <label className={label} htmlFor="ppr">Posts per run</label>
                    <input id="ppr" type="number" min={1} max={10} className={field} value={settings.posts_per_run} onChange={(e) => set("posts_per_run", Math.max(1, Math.min(10, Number(e.target.value) || 1)))} />
                  </div>
                )}
                {settings.posts_per_run !== undefined && (
                  <div>
                    <label className={label} htmlFor="spread">When on the due day</label>
                    <select id="spread" className={field} value={settings.spread_mode || "spread"} onChange={(e) => set("spread_mode", e.target.value as Settings["spread_mode"])}>
                      <option value="spread">Spread across the day (45+ min apart)</option>
                      <option value="all_at_once">All at once, one after another</option>
                    </select>
                  </div>
                )}
                {settings.posts_per_run !== undefined && settings.spread_mode !== "all_at_once" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={label} htmlFor="iwstart">Earliest (IST)</label>
                      <input id="iwstart" type="time" step={300} className={field} value={settings.window_start || "09:00"} onChange={(e) => set("window_start", e.target.value)} />
                    </div>
                    <div>
                      <label className={label} htmlFor="iwend">Latest (IST)</label>
                      <input id="iwend" type="time" step={300} className={field} value={settings.window_end || "19:00"} onChange={(e) => set("window_end", e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className={label} htmlFor="time">Preferred time (IST)</label>
                    <input id="time" type="time" className={field} value={settings.preferred_time} onChange={(e) => set("preferred_time", e.target.value)} />
                  </div>
                )}
              </>
            )}
            <div>
              <label className={label} htmlFor="mode">Mode</label>
              <select id="mode" className={field} value={settings.mode} onChange={(e) => set("mode", e.target.value as Settings["mode"])}>
                <option value="draft">Create draft for review</option>
                <option value="publish">Auto-publish</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="cover">Cover</label>
              <select id="cover" className={field} value={settings.cover_preference} onChange={(e) => set("cover_preference", e.target.value as Settings["cover_preference"])}>
                <option value="auto">Auto (diagram for technical, stock photo for strategy/team)</option>
                <option value="diagram">Always diagram</option>
                <option value="stock">Always stock photo</option>
                <option value="photo">Always AI photo</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="source">Topic source</label>
              <select id="source" className={field} value={settings.topic_source || "queue_then_live"} onChange={(e) => set("topic_source", e.target.value as Settings["topic_source"])}>
                <option value="queue_then_live">Queue first, then live trends</option>
                <option value="queue">Queue only</option>
                <option value="live">Live trends only</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="email">Notification email</label>
              <input id="email" type="email" className={field} placeholder="you@company.com" value={settings.notify_email || ""} onChange={(e) => set("notify_email", e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input type="checkbox" checked={settings.use_suggested} onChange={(e) => set("use_suggested", e.target.checked)} className="h-4 w-4 accent-orange-600" />
            Use suggested topics automatically when no queued topic fits
          </label>
          <p className="text-xs text-slate-500">
            Last automated post: {fmt(settings.last_post_at)}{settings.last_category ? ` (${settings.last_category})` : ""}.
            {" "}Times are Asia/Kolkata. The scheduled task checks every 15 minutes, so schedule changes apply without re-registering it.
            {planError && <span className="block text-amber-700">{planError} &ldquo;Posts per week&rdquo; is unavailable until then.</span>}
          </p>
        </Card>
      )}

      {plan && (weeklyMode || plan.length > 0) && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">This week&rsquo;s plan</h2>
            {weeklyMode && (
              <Button size="sm" variant="outline" disabled={busy === "replan"} className="gap-1.5"
                onClick={() => act("replan", () => api("/api/auto-blog/plan", "POST", { action: "replan" }))}>
                <RefreshCw className="h-3.5 w-3.5" />Re-plan this week
              </Button>
            )}
          </div>
          {plan.length === 0 ? (
            <p className="text-sm text-slate-500">No slots this week{settings?.enabled ? "" : " yet (the plan is made when automation runs or you save the schedule)"}. Re-plan to create them.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {plan.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                  <span className="w-40 font-medium text-slate-900">{fmtSlot(s.slot_at)}</span>
                  <Badge variant={SLOT_BADGE[s.status]}>{s.status}</Badge>
                  <span className="flex-1 min-w-[160px] text-xs text-slate-500">
                    {s.content_id ? <Link className="text-orange-700 hover:underline" href={`/content/${s.content_id}?review=1`}>Open post</Link> : null}
                    {s.content_id && s.note ? " · " : ""}{s.note}
                  </span>
                  {s.status === "pending" && (
                    <Button size="sm" variant="ghost" disabled={busy === `skip-${s.id}`}
                      onClick={() => act(`skip-${s.id}`, () => api("/api/auto-blog/plan", "POST", { action: "skip", id: s.id }))}>
                      Skip this slot
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Topic queue</h2>
        <form
          className="grid gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            act("add", async () => {
              await api("/api/auto-blog/topics", "POST", { ...draft, notes: draft.notes || null });
              setDraft({ ...draft, title: "", notes: "" });
            });
          }}
        >
          <input aria-label="Topic title idea" className={field} placeholder="Title idea" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required minLength={3} />
          <input aria-label="Category" className={field} list="neno-categories" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} required />
          <input aria-label="Notes (optional)" className={field} placeholder="Notes (optional)" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          <Button type="submit" size="sm" disabled={busy === "add"} className="gap-1.5 h-[38px]"><Plus className="h-3.5 w-3.5" />Add</Button>
        </form>
        <datalist id="neno-categories">{NENO_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>

        {pending.length === 0 && <p className="text-sm text-slate-500">Queue is empty. The next run will ask the AI for 5 suggestions (used only if &ldquo;Use suggested topics&rdquo; is on).</p>}
        <ul className="divide-y divide-slate-100">
          {pending.map((t, i) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 py-2">
              {editing?.id === t.id ? (
                <div className="grid flex-1 gap-2 sm:grid-cols-[2fr_1fr_2fr]">
                  <input aria-label="Title" className={field} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                  <input aria-label="Category" className={field} list="neno-categories" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                  <input aria-label="Notes" className={field} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                </div>
              ) : (
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium text-slate-900">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.category}{t.notes ? ` · ${t.notes}` : ""}</div>
                </div>
              )}
              {t.status === "suggested" && <Badge variant="warning">suggested</Badge>}
              <div className="flex items-center gap-1">
                {editing?.id === t.id ? (
                  <>
                    <Button size="icon" variant="ghost" aria-label="Save topic" onClick={() => act(`edit-${t.id}`, async () => {
                      await api(`/api/auto-blog/topics/${t.id}`, "PATCH", { title: editing.title, category: editing.category, notes: editing.notes || null });
                      setEditing(null);
                    })}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Cancel edit" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    {t.status === "suggested" && (
                      <Button size="sm" variant="outline" onClick={() => act(`q-${t.id}`, () => api(`/api/auto-blog/topics/${t.id}`, "PATCH", { status: "queued" }))}>Add to queue</Button>
                    )}
                    <Button size="icon" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(t.id, -1)}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Move down" disabled={i === pending.length - 1} onClick={() => move(t.id, 1)}><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Edit topic" onClick={() => setEditing({ id: t.id, title: t.title, category: t.category, notes: t.notes || "" })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Delete topic" onClick={() => confirm(`Delete "${t.title}"?`) && act(`del-${t.id}`, () => api(`/api/auto-blog/topics/${t.id}`, "DELETE"))}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        {used.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-600">Used topics ({used.length})</summary>
            <ul className="mt-2 space-y-1 text-slate-500">
              {used.map((t) => (
                <li key={t.id}>
                  {t.content_id ? <Link className="text-orange-700 hover:underline" href={`/content/${t.content_id}`}>{t.title}</Link> : t.title} · {t.category} · {fmt(t.used_at)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Run history</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">No runs yet. Routine skips (disabled, not due yet) appear only in logs/auto-blog.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-medium">Time (IST)</th><th className="py-2 pr-3 font-medium">Result</th><th className="py-2 pr-3 font-medium">Topic / post</th>
                  <th className="py-2 pr-3 font-medium">Mode</th><th className="py-2 pr-3 font-medium">Duration</th><th className="py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmt(r.started_at)}<div className="text-xs text-slate-400">{r.trigger}</div></td>
                    <td className="py-2 pr-3"><Badge variant={STATUS_BADGE[r.status] || "secondary"}>{r.status === "draft" ? "ready for review" : r.status}</Badge></td>
                    <td className="py-2 pr-3">{r.content_id ? <Link className="text-orange-700 hover:underline" href={`/content/${r.content_id}?review=1`}>{r.title || r.topic}</Link> : r.topic || "—"}</td>
                    <td className="py-2 pr-3">{r.mode || "—"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{Math.round(r.duration_ms / 1000)}s</td>
                    <td className="py-2 text-xs text-slate-600 max-w-sm">{r.error ? <span className="text-red-700">{r.error}</span> : r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
