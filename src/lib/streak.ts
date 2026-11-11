/**
 * STREAK HELPERS
 * ==============
 * `user_streaks.current_streak` is only rewritten when a study session is
 * saved. If a student stops studying, the stored number never drops, so reading
 * it directly keeps showing an old streak (for example "12-day streak" two
 * weeks after the last session).
 *
 * `effectiveStreak` returns the streak as it stands today: the stored value if
 * the student studied today or yesterday, otherwise 0.
 */
import { toDateKey } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StreakLike {
  current_streak?: number;
  longest_streak?: number;
  last_study_date?: string | null;
}

/** Whole days between two YYYY-MM-DD keys (a - b). */
export function dayKeyDiff(a: string, b: string): number {
  const first = new Date(`${a}T00:00:00Z`).getTime();
  const second = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((first - second) / DAY_MS);
}

/** Current streak as of `now`, treating a missed day as a broken streak. */
export function effectiveStreak(streak: StreakLike | null | undefined, now: Date = new Date()): number {
  const stored = Number(streak?.current_streak) || 0;
  const last = streak?.last_study_date;
  if (stored <= 0) return 0;
  // Older documents may not carry last_study_date; trust the stored value then.
  if (typeof last !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return stored;
  const diff = dayKeyDiff(toDateKey(now), last);
  return diff <= 1 ? stored : 0;
}

/** Copy of the streak document with `current_streak` corrected for today. */
export function withEffectiveStreak<T extends StreakLike>(streak: T, now: Date = new Date()): T {
  return { ...streak, current_streak: effectiveStreak(streak, now) };
}
