// Pure scheduling logic for "Posts per week" (no DB / server imports; unit-tested).
// shortcut: weeks and windows are in Asia/Kolkata (fixed +05:30, no DST); support other zones only if the timezone setting starts being used.

const IST_OFFSET_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface WeeklySettings {
  posts_per_week: number;
  random_count: boolean;
  posts_min: number;
  posts_max: number;
  window_start: string; // "HH:MM" IST
  window_end: string;
  allowed_days: number[]; // ISO weekday: 1 = Mon ... 7 = Sun
}

export interface PlanSlot {
  id: string;
  slot_at: Date;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  kind?: "weekly" | "batch"; // undefined before migration 006 = weekly
}

export const parseHHMM = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

/** Monday 00:00 IST of the week containing `now`. */
export function weekStartIST(now: Date): Date {
  const ist = new Date(now.getTime() + IST_OFFSET_MS); // wall-clock IST read through UTC getters
  const daysSinceMonday = (ist.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - daysSinceMonday) - IST_OFFSET_MS);
}

/** 0 = Monday ... 6 = Sunday, relative to weekStart. */
export const dayIndex = (d: Date, weekStart: Date) => Math.floor((d.getTime() - weekStart.getTime()) / DAY_MS);
/** IST calendar day number (days since 1970-01-01 IST). */
export const istDayNumber = (d: Date) => Math.floor((d.getTime() + IST_OFFSET_MS) / DAY_MS);
/** Minutes since IST midnight. */
export const minutesIST = (d: Date) => Math.floor(((d.getTime() + IST_OFFSET_MS) % DAY_MS) / 60_000);
/** 00:00 IST of the day containing `d`. */
export const dayStartIST = (d: Date) => new Date(istDayNumber(d) * DAY_MS - IST_OFFSET_MS);
export const slotDate =(weekStart: Date, day: number, minutes: number) => new Date(weekStart.getTime() + day * DAY_MS + minutes * 60_000);

/** Posts this week: fixed, or random between min and max (inclusive). */
export function pickCount(s: WeeklySettings, rng = Math.random): number {
  if (!s.random_count) return clamp(s.posts_per_week, 1, 7);
  const lo = clamp(Math.min(s.posts_min, s.posts_max), 1, 7);
  const hi = clamp(Math.max(s.posts_min, s.posts_max), 1, 7);
  return lo + Math.floor(rng() * (hi - lo + 1));
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n) || lo));

/** Random time (minutes, multiple of 5) in the window; on `day` == today only after now. null if none left. */
function randomTime(s: WeeklySettings, day: number, today: number, now: Date, rng: () => number): number | null {
  let start = parseHHMM(s.window_start);
  const end = Math.floor(parseHHMM(s.window_end) / 5) * 5;
  if (day === today) start = Math.max(start, minutesIST(now) + 5);
  start = Math.ceil(start / 5) * 5;
  if (start > end) return null;
  return start + 5 * Math.floor(rng() * ((end - start) / 5 + 1));
}

/**
 * New slots for the rest of the week: `count` different allowed days from today on (never a day in `takenDays`),
 * a random 5-minute time in the window each. Fewer slots when fewer days are left.
 */
export function planWeek(
  s: WeeklySettings,
  opts: { now: Date; count: number; takenDays?: Set<number>; rng?: () => number }
): Date[] {
  const rng = opts.rng || Math.random;
  const weekStart = weekStartIST(opts.now);
  const today = dayIndex(opts.now, weekStart);
  const free: Array<{ day: number; minutes: number }> = [];
  for (let day = today; day < 7; day++) {
    if (!s.allowed_days.includes(day + 1) || opts.takenDays?.has(day)) continue;
    const minutes = randomTime(s, day, today, opts.now, rng);
    if (minutes !== null) free.push({ day, minutes });
  }
  // Fisher-Yates, then take the first `count` days
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return free
    .slice(0, Math.max(0, opts.count))
    .map((f) => slotDate(weekStart, f.day, f.minutes))
    .sort((a, b) => a.getTime() - b.getTime());
}

export const MIN_GAP_MINUTES = 45;

/**
 * "Every N days" day plan, made when the day is due. all_at_once: every slot now (run back to back).
 * spread: random 5-minute times from now/window start to window end, at least 45 minutes apart;
 * `dropped` counts posts that no longer fit in what's left of the window.
 */
export function planDay(
  s: { count: number; spread: boolean; window_start: string; window_end: string },
  now: Date,
  rng = Math.random
): { times: Date[]; dropped: number } {
  const count = Math.max(1, Math.min(10, Math.round(s.count) || 1));
  if (!s.spread) return { times: Array.from({ length: count }, () => new Date(now)), dropped: 0 };
  const dayStart = dayStartIST(now);
  const start5 = Math.ceil(Math.max(parseHHMM(s.window_start), minutesIST(now) + 5) / 5); // in 5-minute units
  const end5 = Math.floor(parseHHMM(s.window_end) / 5);
  if (start5 > end5) return { times: [], dropped: count };
  const gap5 = MIN_GAP_MINUTES / 5;
  const fit = Math.min(count, Math.floor((end5 - start5) / gap5) + 1);
  // n sorted random offsets in [0, slack], then add the minimum gap between neighbours
  const slack = end5 - start5 - gap5 * (fit - 1);
  const offsets = Array.from({ length: fit }, () => Math.floor(rng() * (slack + 1))).sort((a, b) => a - b);
  return {
    times: offsets.map((o, i) => new Date(dayStart.getTime() + (start5 + o + i * gap5) * 5 * 60_000)),
    dropped: count - fit,
  };
}

export interface SlotActions {
  due: PlanSlot | null;
  moves: Array<{ id: string; slotAt: Date }>;
  skips: string[];
}

/**
 * What the 15-minute check should do: a past-time pending slot from today is due (earliest one);
 * one from an earlier day moves to the next free allowed day this week (today included while the window is open), else is skipped.
 */
export function resolveSlots(s: WeeklySettings, slots: PlanSlot[], now: Date, rng = Math.random): SlotActions {
  const weekStart = weekStartIST(now);
  const today = dayIndex(now, weekStart);
  const occupied = new Set(slots.filter((x) => x.status !== "failed" && x.status !== "skipped").map((x) => dayIndex(x.slot_at, weekStart)));
  const out: SlotActions = { due: null, moves: [], skips: [] };
  const overdue = slots.filter((x) => x.status === "pending" && x.slot_at.getTime() <= now.getTime()).sort((a, b) => a.slot_at.getTime() - b.slot_at.getTime());
  for (const slot of overdue) {
    const day = dayIndex(slot.slot_at, weekStart);
    if (day < 0) {
      out.skips.push(slot.id); // left over from a previous week: never carried into this one
      continue;
    }
    if (day === today) {
      out.due ??= slot;
      continue;
    }
    occupied.delete(day);
    let moved = false;
    for (let d = today; d < 7 && !moved; d++) {
      if (!s.allowed_days.includes(d + 1) || occupied.has(d)) continue;
      const minutes = randomTime(s, d, today, now, rng);
      if (minutes === null) continue;
      out.moves.push({ id: slot.id, slotAt: slotDate(weekStart, d, minutes) });
      occupied.add(d);
      moved = true;
    }
    if (!moved) out.skips.push(slot.id);
  }
  return out;
}
