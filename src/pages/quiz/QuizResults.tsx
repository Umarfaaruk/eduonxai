import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, ArrowRight, Target, TrendingUp, Zap } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const QuizResults = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const attemptId = state?.attemptId;

  const score = state?.score ?? 0;
  const total = state?.total ?? 0;
  const topicTitle = state?.topicTitle ?? "Quiz";
  const topicId = state?.topicId;

  const questions = state?.questions ?? [];
  const answers = state?.answers ?? [];
  const timeSeconds = state?.timeSeconds ?? 0;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const xp = Math.round(score * 10 + (pct >= 80 ? 20 : 0));

  useEffect(() => {
    if (!user || typeof attemptId !== "string" || !/^[a-f0-9-]{36}$/.test(attemptId) || total === 0) return;
    const recordId = `${user.uid}_${attemptId}`;
    const attempt = doc(db, "quiz_attempts", recordId);
    const progress = topicId ? doc(db, "topic_progress", `${user.uid}_${topicId}`) : null;

    void runTransaction(db, async (transaction) => {
      if ((await transaction.get(attempt)).exists()) return;
      const existing = progress ? (await transaction.get(progress)).data() : undefined;
      transaction.set(attempt, {
        user_id: user.uid, topic_id: topicId || null, quiz_id: null, topic_title: topicTitle,
        score, total_questions: total, xp_awarded: xp, created_at: serverTimestamp(),
      });
      if (xp > 0) {
        transaction.set(doc(db, "xp_logs", recordId), {
          user_id: user.uid, source_type: "quiz", xp_amount: xp, created_at: serverTimestamp(),
        });
        transaction.set(doc(db, "profiles", user.uid), {
          total_xp: increment(xp), updated_at: serverTimestamp(),
        }, { merge: true });
      }
      if (progress) {
        const oldCount = Number(existing?.quiz_count) || 0;
        const count = oldCount + 1;
        const average = ((Number(existing?.avg_quiz_score) || 0) * oldCount + (score / total) * 100) / count;
        transaction.set(progress, {
          user_id: user.uid, topic_id: topicId, quiz_count: count,
          avg_quiz_score: Math.round(average),
          mastery_score: Math.round(average * 0.7 + (existing?.lessons_completed > 0 ? 30 : 0)),
          ...(existing ? { last_updated: serverTimestamp() } : { created_at: serverTimestamp() }),
        }, { merge: true });
      }
    }).catch(() => toast.error("Quiz progress could not be saved. Reload this page to retry."));
  }, [user, total, topicId, attemptId, topicTitle, score, xp]);

  // Redirect if no quiz data — must be in useEffect, not during render
  useEffect(() => {
    if (total === 0) {
      navigate("/quiz", { replace: true });
    }
  }, [total, navigate]);

  if (total === 0) {
    return null;
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <div className="inline-flex h-16 w-16 rounded-2xl bg-secondary items-center justify-center">
          <Trophy className={`h-8 w-8 ${pct >= 70 ? "text-accent" : "text-muted-foreground"}`} />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {pct >= 80 ? "Excellent!" : pct >= 50 ? "Good effort!" : "Keep practicing!"}
        </h1>
        <p className="text-muted-foreground text-sm">You completed the {topicTitle} quiz</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <div className="text-5xl font-bold text-accent">{pct}%</div>
        <div className="text-sm text-muted-foreground mt-2">{score} out of {total} correct</div>
        <div className="h-2 bg-muted rounded-full overflow-hidden mt-4 max-w-xs mx-auto">
          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Target, label: "Accuracy", value: `${pct}%` },
          { icon: Zap, label: "XP Earned", value: `+${xp}` },
          { icon: TrendingUp, label: "Time", value: formatTime(timeSeconds) },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <s.icon className="h-4 w-4 text-accent mx-auto mb-2" />
            <div className="text-lg font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Review wrong answers */}
      {questions.length > 0 && score < total && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="text-sm font-semibold text-foreground">Review Mistakes</div>
          {questions.map((q: any, i: number) => {
            if (answers[i] === q.correct) return null;
            return (
              <div key={i} className="border-t border-border pt-3 space-y-1">
                <p className="text-sm text-foreground font-medium">{q.question}</p>
                <p className="text-xs text-destructive">Your answer: {q.options[answers[i]] ?? "Skipped"}</p>
                <p className="text-xs text-accent">Correct: {q.options[q.correct]}</p>
                {q.explanation && <p className="text-xs text-muted-foreground italic">{q.explanation}</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <Link to="/quiz" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <RotateCcw className="h-4 w-4" /> New Quiz
          </Button>
        </Link>
        <Link to="/dashboard" className="flex-1">
          <Button className="w-full bg-navy text-highlight hover:bg-navy/90 gap-2">
            Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default QuizResults;
