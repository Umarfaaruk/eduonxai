/**
 * EDUONX ANALYTICS SYSTEM
 * ======================
 * 
 * Comprehensive performance tracking and insights generation
 * Database Schema: Firebase Firestore
 */

/**
 * FIRESTORE COLLECTION STRUCTURE
 * =============================
 */

// Collection: study_sessions
// Stores individual study session records
// Example document: {
//   id: "session_12345",
//   user_id: "user_abc123",
//   started_at: "2024-04-20T10:30:00Z",
//   ended_at: "2024-04-20T11:15:00Z",
//   duration_seconds: 2700,
//   created_at: Timestamp,
//   pause_count: 3,
//   interruption_reason: "tab_switch" | "idle" | "manual",
// }

// Collection: xp_logs
// Tracks XP awarded for various activities
// Example document: {
//   id: "xp_12345",
//   user_id: "user_abc123",
//   xp_amount: 75,
//   source_type: "study_session" | "quiz" | "lesson" | "achievement" | "daily_login",
//   source_id: "session_12345" (reference),
//   created_at: Timestamp,
// }

// Collection: user_streaks
// Tracks daily study streaks
// Example document: {
//   user_id: "user_abc123",
//   current_streak: 15,
//   longest_streak: 42,
//   last_study_date: "2024-04-20",
//   updated_at: Timestamp,
// }

// Collection: profiles
// User profile and aggregated stats
// Example document: {
//   user_id: "user_abc123",
//   email: "user@example.com",
//   displayName: "John Doe",
//   total_xp: 5250,
//   level: 12,
//   total_study_hours: 156.5,
//   created_at: Timestamp,
//   updated_at: Timestamp,
// }

// Collection: quiz_results
// Stores quiz attempt results
// Example document: {
//   id: "quiz_result_12345",
//   user_id: "user_abc123",
//   quiz_id: "quiz_abc",
//   topic: "Algebra",
//   questions_total: 10,
//   questions_correct: 8,
//   score: 80,
//   time_spent: 600,
//   completed_at: Timestamp,
//   xp_earned: 50,
// }

// Collection: analytics_snapshots
// Daily aggregated analytics for efficient querying
// Example document: {
//   user_id: "user_abc123",
//   date: "2024-04-20",
//   study_minutes: 145,
//   session_count: 4,
//   xp_earned: 200,
//   quiz_count: 2,
//   quiz_avg_score: 82,
//   streak_maintained: true,
//   timestamp: Timestamp,
// }

// Collection: user_preferences
// User learning preferences and settings
// Example document: {
//   user_id: "user_abc123",
//   daily_goal_minutes: 60,
//   preferred_subjects: ["Math", "Science"],
//   difficulty_level: "medium",
//   notification_enabled: true,
//   theme: "dark",
//   updated_at: Timestamp,
// }

/**
 * FIRESTORE SECURITY RULES & INDEXES
 * ===================================
 * 
 * Recommended indexes for efficient queries:
 * 
 * 1. study_sessions collection:
 *    - user_id + created_at (for user's sessions)
 *    - user_id + started_at (for session recovery)
 * 
 * 2. xp_logs collection:
 *    - user_id + created_at (for user's XP history)
 *    - source_type + created_at (for analytics)
 * 
 * 3. analytics_snapshots collection:
 *    - user_id + date (for daily analytics)
 *    - user_id + created_at (for weekly/monthly queries)
 * 
 * 4. quiz_results collection:
 *    - user_id + completed_at (for user's quiz history)
 *    - topic + completed_at (for topic analytics)
 * 
 * Security Rules:
 * - Users can only read/write their own documents
 * - Admins can read all analytics
 * - Service functions can write to all collections
 */

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { toDateKey } from "./utils";
import { effectiveStreak } from "./streak";
import { xpLogSignature } from "./xp";

/**
 * ANALYTICS DATA MODELS
 */

export interface StudySession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  pause_count?: number;
  interruption_reason?: string;
  created_at: any;
}

export interface XpLog {
  id: string;
  user_id: string;
  xp_amount: number;
  source_type: "study_session" | "quiz" | "lesson" | "achievement" | "daily_login";
  source_id?: string;
  created_at: any;
}

export interface UserStreak {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  updated_at?: any;
}

export interface AnalyticsSnapshot {
  user_id: string;
  date: string; // YYYY-MM-DD
  study_minutes: number;
  session_count: number;
  xp_earned: number;
  quiz_count: number;
  quiz_avg_score: number;
  streak_maintained: boolean;
  timestamp?: any;
}

export interface ProductivityScore {
  overall_score: number; // 0-100
  consistency_score: number; // Streak and daily consistency
  activity_score: number; // Total study time vs goal
  performance_score: number; // Quiz results
  trend: "improving" | "stable" | "declining";
  insights: string[];
}

/**
 * ANALYTICS QUERIES
 *
 * All metrics are derived from the collections the app actually writes:
 * study_sessions, quiz_attempts, xp_logs and user_streaks.
 *
 * An earlier version read a pre-aggregated `analytics_snapshots` collection,
 * but nothing ever wrote to it, so consistency, trend and the daily/weekly
 * breakdowns were permanently zero. It also read the streak with a collection
 * query (which the security rules reject for non-admins, failing the whole
 * analytics load) and treated the raw quiz score (0-5) as a percentage.
 */

const toDate = (value: any): Date | null => {
  if (!value) return null;
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
};

interface UserActivity {
  sessions: { date: Date; seconds: number }[];
  quizzes: { date: Date | null; pct: number }[];
  xp: { date: Date; amount: number }[];
  streak: UserStreak | null;
}

// The Timer page asks for three metrics at once; share one set of reads.
const ACTIVITY_TTL_MS = 15_000;
const activityCache = new Map<string, { at: number; promise: Promise<UserActivity> }>();

async function loadUserActivity(userId: string): Promise<UserActivity> {
  const [sessionSnap, quizSnap, xpSnap, streakSnap] = await Promise.all([
    getDocs(query(collection(db, "study_sessions"), where("user_id", "==", userId))),
    getDocs(query(collection(db, "quiz_attempts"), where("user_id", "==", userId))),
    getDocs(query(collection(db, "xp_logs"), where("user_id", "==", userId))),
    getDoc(doc(db, "user_streaks", userId)),
  ]);

  const sessions: UserActivity["sessions"] = [];
  sessionSnap.forEach((item) => {
    const data = item.data();
    const date = toDate(data.ended_at) ?? toDate(data.created_at);
    const seconds = Number(data.duration_seconds) || 0;
    if (date && seconds > 0) sessions.push({ date, seconds });
  });

  const quizzes: UserActivity["quizzes"] = [];
  quizSnap.forEach((item) => {
    const data = item.data();
    const total = Number(data.total_questions) || 0;
    if (total <= 0) return;
    quizzes.push({ date: toDate(data.created_at), pct: ((Number(data.score) || 0) / total) * 100 });
  });

  const xp: UserActivity["xp"] = [];
  const seenXp = new Set<string>();
  xpSnap.forEach((item) => {
    const data = item.data();
    if (typeof data.xp_amount !== "number") return;
    const signature = xpLogSignature(data);
    if (seenXp.has(signature)) return;
    seenXp.add(signature);
    const date = toDate(data.created_at);
    if (date) xp.push({ date, amount: data.xp_amount });
  });

  return {
    sessions,
    quizzes,
    xp,
    streak: streakSnap.exists() ? (streakSnap.data() as UserStreak) : null,
  };
}

function getUserActivity(userId: string): Promise<UserActivity> {
  const cached = activityCache.get(userId);
  if (cached && Date.now() - cached.at < ACTIVITY_TTL_MS) return cached.promise;
  const promise = loadUserActivity(userId);
  activityCache.set(userId, { at: Date.now(), promise });
  // Never keep a failed load in the cache.
  promise.catch(() => {
    if (activityCache.get(userId)?.promise === promise) activityCache.delete(userId);
  });
  return promise;
}

/** One entry per calendar day for the last `days` days, oldest first, ending today. */
function buildDailySnapshots(userId: string, activity: UserActivity, days: number): AnalyticsSnapshot[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDay = new Map<string, AnalyticsSnapshot & { quizPctTotal: number }>();
  const order: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = toDateKey(day);
    order.push(key);
    byDay.set(key, {
      user_id: userId,
      date: key,
      study_minutes: 0,
      session_count: 0,
      xp_earned: 0,
      quiz_count: 0,
      quiz_avg_score: 0,
      streak_maintained: false,
      quizPctTotal: 0,
    });
  }

  const studySeconds: Record<string, number> = {};
  for (const session of activity.sessions) {
    const entry = byDay.get(toDateKey(session.date));
    if (!entry) continue;
    studySeconds[entry.date] = (studySeconds[entry.date] || 0) + session.seconds;
    entry.session_count += 1;
  }
  for (const quiz of activity.quizzes) {
    if (!quiz.date) continue;
    const entry = byDay.get(toDateKey(quiz.date));
    if (!entry) continue;
    entry.quiz_count += 1;
    entry.quizPctTotal += quiz.pct;
  }
  for (const award of activity.xp) {
    const entry = byDay.get(toDateKey(award.date));
    if (entry) entry.xp_earned += award.amount;
  }

  return order.map((key) => {
    const { quizPctTotal, ...entry } = byDay.get(key)!;
    const seconds = studySeconds[key] || 0;
    return {
      ...entry,
      study_minutes: Math.round(seconds / 60),
      quiz_avg_score: entry.quiz_count > 0 ? Math.round(quizPctTotal / entry.quiz_count) : 0,
      streak_maintained: seconds > 0,
    };
  });
}

const sumMinutes = (days: AnalyticsSnapshot[]) => days.reduce((sum, d) => sum + d.study_minutes, 0);

/**
 * Calculate productivity score for a user
 */
export async function calculateProductivityScore(
  userId: string,
  dailyGoalMinutes: number = 60
): Promise<ProductivityScore> {
  const activity = await getUserActivity(userId);
  const lastWeek = buildDailySnapshots(userId, activity, 7);
  const weekStudyMinutes = sumMinutes(lastWeek);
  const currentStreak = effectiveStreak(activity.streak);

  // Average percentage of the 10 most recent quizzes.
  const recentQuizzes = activity.quizzes
    .slice()
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    .slice(0, 10);
  const avgQuizScore =
    recentQuizzes.length > 0
      ? recentQuizzes.reduce((sum, q) => sum + q.pct, 0) / recentQuizzes.length
      : 0;

  // Consistency: streak (50 points) + share of the last 7 days with study (50 points).
  const streakScore = Math.min((currentStreak / 30) * 50, 50);
  const daysWithStudy = lastWeek.filter((d) => d.study_minutes > 0).length;
  const consistencyScore = Math.min(streakScore + (daysWithStudy / lastWeek.length) * 50, 100);

  const activityScore = Math.min((weekStudyMinutes / (dailyGoalMinutes * 7)) * 100, 100);
  const performanceScore = Math.min(Math.max(avgQuizScore, 0), 100);
  const overallScore = consistencyScore * 0.3 + activityScore * 0.4 + performanceScore * 0.3;

  // Trend: the last 3 days against the 4 days before them.
  let trend: "improving" | "stable" | "declining" = "stable";
  const recentAvg = sumMinutes(lastWeek.slice(-3)) / 3;
  const previousAvg = sumMinutes(lastWeek.slice(0, -3)) / 4;
  if (recentAvg > 0 || previousAvg > 0) {
    if (recentAvg > previousAvg * 1.1) trend = "improving";
    else if (recentAvg < previousAvg * 0.9) trend = "declining";
  }

  const insights: string[] = [];
  if (currentStreak === 0) insights.push("Start a new streak by studying today!");
  if (activityScore < 50) insights.push("Increase your daily study time to reach your goals.");
  if (avgQuizScore > 80) insights.push("Excellent quiz performance! Keep it up.");
  if (weekStudyMinutes >= dailyGoalMinutes * 7) insights.push("🎉 You've met your weekly goal!");

  return {
    overall_score: Math.round(overallScore),
    consistency_score: Math.round(consistencyScore),
    activity_score: Math.round(activityScore),
    performance_score: Math.round(performanceScore),
    trend,
    insights,
  };
}

/**
 * Generate detailed performance insights
 */
export async function getPerformanceBreakdown(userId: string) {
  const activity = await getUserActivity(userId);
  // 31 days always covers the whole current calendar month.
  const daily = buildDailySnapshots(userId, activity, 31);
  const today = daily[daily.length - 1];

  // Week starts on Monday, matching the dashboard and timer charts.
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const thisWeek = daily.slice(-(daysSinceMonday + 1));
  const thisMonth = daily.slice(-now.getDate());
  const weeklyTotal = sumMinutes(thisWeek);
  const monthlyTotal = sumMinutes(thisMonth);

  return {
    daily: {
      minutes: today?.study_minutes || 0,
      sessions: today?.session_count || 0,
      xp: today?.xp_earned || 0,
      quizzes: today?.quiz_count || 0,
    },
    weekly: {
      minutes: weeklyTotal,
      sessionCount: thisWeek.reduce((sum, d) => sum + d.session_count, 0),
      avgDailyMinutes: Math.round(weeklyTotal / Math.max(thisWeek.length, 1)),
    },
    monthly: {
      minutes: monthlyTotal,
      daysActive: thisMonth.filter((d) => d.study_minutes > 0).length,
      avgDailyMinutes: Math.round(monthlyTotal / Math.max(thisMonth.length, 1)),
    },
    breakdown: daily.slice(-7).map((d) => ({
      date: d.date,
      minutes: d.study_minutes,
      sessions: d.session_count,
      xp: d.xp_earned,
    })),
  };
}

/**
 * Get consistency metrics over the last 30 days
 */
export async function getConsistencyMetrics(userId: string) {
  const activity = await getUserActivity(userId);
  const daily = buildDailySnapshots(userId, activity, 30);

  let maxStreak = 0;
  let run = 0;
  for (const day of daily) {
    run = day.study_minutes > 0 ? run + 1 : 0;
    if (run > maxStreak) maxStreak = run;
  }

  // Current streak: consecutive study days ending today. A day that simply
  // hasn't been studied *yet* does not break the run that ended yesterday.
  let currentStreak = 0;
  let index = daily.length - 1;
  if (index >= 0 && daily[index].study_minutes === 0) index--;
  for (; index >= 0 && daily[index].study_minutes > 0; index--) currentStreak++;

  const daysActive = daily.filter((d) => d.study_minutes > 0).length;
  const totalMinutes = sumMinutes(daily);

  return {
    currentStreak,
    maxStreak,
    daysActive,
    totalDays: daily.length,
    consistency: Math.round((daysActive / Math.max(daily.length, 1)) * 100),
    avgDailyMinutes: daily.length > 0 ? Math.round(totalMinutes / daily.length) : 0,
  };
}
