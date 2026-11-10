import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthHeaders } from "@/lib/authHeaders";

type Answer = number | null;
type Result = { score: number; total: number; xp: number };
type Exam = { id: string; title: string; durationSeconds: number };
type Attempt = {
  attemptId: string;
  title: string;
  expiresAt: number;
  questions: { question: string; options: string[] }[];
  result: Result | null;
};

async function examRequest<T>(body?: object): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch("/api/verified-exam", body ? {
    method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Exam request failed");
  return data;
}

export default function VerifiedExamPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  return uid ? <ExamSession key={uid} uid={uid} /> : null;
}

function ExamSession({ uid }: { uid: string }) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const catalog = useQuery({
    queryKey: ["verified-exams", uid],
    queryFn: () => examRequest<{ exams: Exam[] }>(),
  });
  const key = attempt ? `verified-exam:${uid}:${attempt.attemptId}` : null;

  useEffect(() => {
    if (!attempt || attempt.result) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((attempt.expiresAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt]);

  async function start(examId: string) {
    setBusy(true);
    setError("");
    try {
      const current = await examRequest<Attempt>({ action: "start", examId });
      const empty = current.questions.map(() => null);
      let restored = empty as Answer[];
      try {
        const saved = JSON.parse(sessionStorage.getItem(`verified-exam:${uid}:${current.attemptId}`) ?? "null");
        if (Array.isArray(saved) && saved.length === empty.length &&
          saved.every((value) => value === null || Number.isInteger(value) && value >= 0 && value < 4)) restored = saved;
      } catch { /* Draft storage is optional. */ }
      setAnswers(restored);
      setSecondsLeft(Math.max(0, Math.ceil((current.expiresAt - Date.now()) / 1000)));
      setAttempt(current);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not start the exam");
    } finally {
      setBusy(false);
    }
  }

  function choose(index: number, choice: Answer) {
    const next = answers.map((value, position) => position === index ? choice : value);
    setAnswers(next);
    if (key) {
      try { sessionStorage.setItem(key, JSON.stringify(next)); }
      catch { /* Draft storage is optional. */ }
    }
  }

  async function submit() {
    if (!attempt || busy || secondsLeft === 0) return;
    setBusy(true);
    setError("");
    try {
      const result = await examRequest<Result>({ action: "submit", attemptId: attempt.attemptId, answers });
      setAttempt({ ...attempt, result });
      if (key) {
        try { sessionStorage.removeItem(key); }
        catch { /* The result is already saved. */ }
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not submit the exam");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Link className="text-sm underline" to="/quiz">Back to practice quizzes</Link>
      {attempt && <Button variant="ghost" disabled={busy} onClick={() => { setAttempt(null); setError(""); }}>Exam catalog</Button>}
      <h1 className="text-2xl font-semibold">{attempt?.title ?? "Verified exams"}</h1>
      {(error || catalog.isError) && <p role="alert">{error || "Could not load the exam catalog."}</p>}
      {!attempt && (
        <div className="space-y-3">
          {catalog.isPending && <p>Loading exams…</p>}
          {catalog.data?.exams.length === 0 && <p>No verified exams are currently available.</p>}
          {catalog.data?.exams.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between gap-4 rounded border p-4">
              <span>{exam.title} · {Math.ceil(exam.durationSeconds / 60)} min</span>
              <Button disabled={busy} onClick={() => void start(exam.id)}>Open exam</Button>
            </div>
          ))}
        </div>
      )}
      {attempt?.result && (
        <p role="status">Verified score {attempt.result.score}/{attempt.result.total} · {attempt.result.xp} verified exam XP</p>
      )}
      {attempt && !attempt.result && (
        <div className="space-y-5">
          <p>{secondsLeft > 0 ? `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s remaining` : "Time expired."}</p>
          {attempt.questions.map((question, index) => (
            <fieldset key={index} disabled={busy || secondsLeft === 0} className="space-y-2 rounded border p-4">
              <legend className="font-medium">{index + 1}. {question.question}</legend>
              {question.options.map((option, choice) => (
                <label key={choice} className="flex items-center gap-2">
                  <input type="radio" name={`question-${index}`} checked={answers[index] === choice}
                    onChange={() => choose(index, choice)} />
                  {option}
                </label>
              ))}
              <Button type="button" size="sm" variant="ghost" onClick={() => choose(index, null)}>Clear answer</Button>
            </fieldset>
          ))}
          <Button disabled={busy || secondsLeft === 0} onClick={() => void submit()}>
            {busy ? "Submitting…" : "Submit exam"}
          </Button>
        </div>
      )}
    </main>
  );
}

