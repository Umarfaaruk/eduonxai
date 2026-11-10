import { createHash, randomUUID } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "./_admin.js";
import { requireAuth } from "./_verifyToken.js";

interface Question {
  question: string;
  options: string[];
  correct: number;
}

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const q = value as Question;
  return typeof q.question === "string" && q.question.length > 0 && q.question.length <= 1000 &&
    Array.isArray(q.options) && q.options.length === 4 &&
    q.options.every((option) => typeof option === "string" && option.length > 0 && option.length <= 500) &&
    Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4;
}

const examIdPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const attemptIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

export default async function handler(req: any, res: any) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  res.setHeader("Cache-Control", "no-store");
  const caller = await requireAuth(req, res);
  if (!caller) return;

  try {
    const db = getFirestore(getAdminApp());
    const catalog = db.collection("_exam_catalog");
    const attempts = db.collection("_exam_attempts");
    if (req.method === "GET") {
      const list = await catalog.where("published", "==", true).limit(50).select("title", "durationSeconds").get();
      return res.status(200).json({
        exams: list.docs.filter((entry) => examIdPattern.test(entry.id)).map((entry) => ({
          id: entry.id, title: entry.data().title, durationSeconds: entry.data().durationSeconds,
        })),
      });
    }

    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(raw) > 4096) return res.status(413).json({ error: "Request too large" });
    let body;
    try { body = JSON.parse(raw); }
    catch { return res.status(400).json({ error: "Invalid JSON" }); }

    if (body?.action === "start") {
      if (typeof body.examId !== "string" || !examIdPattern.test(body.examId)) {
        return res.status(400).json({ error: "Invalid exam" });
      }
      const examRef = catalog.doc(body.examId);
      const attemptId = randomUUID();
      const attemptRef = attempts.doc(attemptId);
      // Prevent repeated starts and keep one attempt per user per catalog version.
      const slotId = createHash("sha256").update(JSON.stringify([caller.uid, body.examId])).digest("hex");
      const slot = db.collection("_exam_slots").doc(slotId);
      const started = await db.runTransaction(async (transaction) => {
        const [examSnapshot, slotSnapshot] = await Promise.all([transaction.get(examRef), transaction.get(slot)]);
        const exam = examSnapshot.data();
        if (!exam?.published || typeof exam.title !== "string" || !Number.isInteger(exam.durationSeconds) ||
          exam.durationSeconds < 30 || exam.durationSeconds > 14_400 ||
          !Array.isArray(exam.questions) || exam.questions.length < 1 || exam.questions.length > 50 ||
          !exam.questions.every(isQuestion)) return null;
        const previous = slotSnapshot.data();
        if (previous) {
          const saved = (await transaction.get(attempts.doc(previous.attemptId))).data();
          if (!saved || saved.uid !== caller.uid || saved.examId !== body.examId) throw new Error("Missing exam attempt");
          return { ...saved, attemptId: previous.attemptId };
        }
        const questions = (exam.questions as Question[]).map(({ question, options, correct }) => ({
          question, options, correct,
        }));
        const value = {
          uid: caller.uid, examId: body.examId, title: exam.title,
          expiresAt: Date.now() + exam.durationSeconds * 1000, questions,
        };
        transaction.create(attemptRef, value);
        transaction.create(slot, { uid: caller.uid, attemptId });
        return { ...value, attemptId };
      });
      if (!started) return res.status(404).json({ error: "Exam unavailable" });
      const questions = (started.questions as Question[]).map(({ question, options }) => ({ question, options }));
      return res.status(200).json({
        attemptId: started.attemptId, title: started.title, expiresAt: started.expiresAt,
        questions, result: "result" in started ? started.result : null,
      });
    }

    if (body?.action !== "submit" || typeof body.attemptId !== "string" ||
      !attemptIdPattern.test(body.attemptId) || !Array.isArray(body.answers) || body.answers.length > 50 ||
      !body.answers.every((answer: unknown) => answer === null ||
        (typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < 4))) {
      return res.status(400).json({ error: "Invalid exam submission" });
    }

    const receivedAt = Date.now();
    const attemptRef = attempts.doc(body.attemptId);
    const outcome = await db.runTransaction(async (transaction) => {
      const attempt = (await transaction.get(attemptRef)).data();
      if (!attempt || attempt.uid !== caller.uid) return { status: 404, error: "Attempt unavailable" };
      if (attempt.result) return { status: 200, result: attempt.result };
      if (receivedAt >= attempt.expiresAt) return { status: 409, error: "Attempt has expired" };
      const questions = attempt.questions as Question[];
      if (body.answers.length !== questions.length) return { status: 400, error: "Invalid answer count" };
      const score = questions.reduce((sum, q, index) => sum + Number(q.correct === body.answers[index]), 0);
      const result = { score, total: questions.length, xp: score * 10 };
      transaction.update(attemptRef, { result, submittedAt: receivedAt });
      transaction.create(db.collection("_verified_exam_xp").doc(body.attemptId), {
        uid: caller.uid, examId: attempt.examId, xp: result.xp, createdAt: receivedAt,
      });
      return { status: 200, result };
    });
    return res.status(outcome.status).json(outcome.status === 200 ? outcome.result : { error: outcome.error });
  } catch {
    return res.status(503).json({ error: "Exam service unavailable" });
  }
}


