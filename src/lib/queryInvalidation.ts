/**
 * CACHE INVALIDATION FOR USER STATS
 * =================================
 * XP, streak, study time and quiz stats are read by many screens, each under
 * its own React Query key. Anything that changes those numbers (saving a study
 * session, finishing a quiz, completing a lesson) must refresh all of them,
 * otherwise the dashboard, profile and leaderboard keep showing stale values
 * for the 5-minute staleTime.
 *
 * Keep this list in sync with the query keys used across the app.
 */
import type { QueryClient } from "@tanstack/react-query";

/** Keys scoped as [key, uid]. */
const USER_STAT_KEYS = [
  "profile",
  "my-profile",
  "streak",
  "streak-lb",
  "totalXp",
  "sessionStats",
  "quizStats",
  "continueLearning",
  "studySessions",
  "timerAnalytics",
  "profile-stats",
  "achievement-stats",
  "detailed-subject-progress",
  "topics",
] as const;

/** Keys whose uid is not in the second position, matched by prefix only. */
const SHARED_STAT_KEYS = ["leaderboard"] as const;

export function invalidateUserStats(queryClient: QueryClient, uid: string | undefined | null): void {
  if (!uid) return;
  for (const key of USER_STAT_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key, uid] });
  }
  for (const key of SHARED_STAT_KEYS) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

/** Both screens that show the friend graph keep their own cache entry. */
export function invalidateFriendRecords(queryClient: QueryClient, uid: string | undefined | null): void {
  if (!uid) return;
  queryClient.invalidateQueries({ queryKey: ["friendRecords", uid] });
  queryClient.invalidateQueries({ queryKey: ["friend-records", uid] });
}
