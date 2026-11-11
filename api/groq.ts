 
/**
 * GROQ PROXY — hardened for production
 * =====================================
 * This is the only publicly reachable AI endpoint, so it enforces:
 *
 *  1. MODEL ALLOWLIST — only the three models the app actually uses can be
 *     requested. Prevents anyone from using our API key against arbitrary
 *     (more expensive / higher-quota) models.
 *  2. PAYLOAD CAPS — max 24 messages, 60 000 total chars, 200 KB raw body.
 *     Prevents accidental or malicious token-bomb requests that burn quota.
 *  3. PARAMETER CLAMPS — temperature forced to 0–1, max_tokens to 1–4096.
 *  4. UPSTREAM TIMEOUT — 55 s (Vercel function limit is 60 s). A hung Groq
 *     connection times out cleanly instead of consuming a function slot.
 *  5. RETRY-AFTER PASSTHROUGH — on 429 the client's backoff uses Groq's real
 *     retry hint rather than guessing.
 */

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "./_admin.js";
import { createHash } from "node:crypto";
import { requireAuth } from "./_verifyToken.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Only models the app uses. Anything else is rejected with 400. */
const ALLOWED_MODELS = new Set([
  "llama-3.3-70b-versatile",            // chat, doubts, summaries
  "llama-3.1-8b-instant",               // quiz / planner / doc-analysis JSON
  "meta-llama/llama-4-scout-17b-16e-instruct", // vision (Camera Q&A)
]);

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_MESSAGES = 24;
const MAX_TOTAL_CHARS = 60_000;          // text-only requests
const MAX_BODY_BYTES = 200_000;          // text-only requests
const MAX_BODY_BYTES_VISION = 4_400_000; // vision requests carry a base64 image
                                          // (Vercel's own body limit is ~4.5 MB)
const MAX_TOKENS_CAP = 4096;
const UPSTREAM_TIMEOUT_MS = 55_000;

/** True if any message carries image parts (Camera Q&A vision requests) */
function isVisionPayload(messages: any[]): boolean {
  return messages.some(
    (m) => Array.isArray(m?.content) && m.content.some((p: any) => p?.type === "image_url")
  );
}

function getApiKey(): string {
  const key =
    process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Server is missing GROQ_API_KEY. Set it in Vercel env vars or .env.local."
    );
  }
  return key;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function sanitizeUpstreamError(status: number): string {
  if (status === 429) return "AI service is busy. Please try again in a moment.";
  if (status === 504) return "AI provider timed out. Please try again.";
  if (status >= 500) return "AI service temporarily unavailable. Please try again.";
  if (status === 401 || status === 403) return "Authentication required.";
  return "AI request failed. Please try again.";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Authentication: only signed-in EduOnx users may spend our AI quota ──
  const caller = await requireAuth(req, res);
  if (!caller) return; // requireAuth already wrote the 401 response

  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); }
      catch { return res.status(400).json({ error: "Invalid JSON" }); }
    }
    const { messages, temperature = 0.7, max_tokens, maxTokens, stream = false, model } = body ?? {};

    // ── Message validation ───────────────────────────────────
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `Too many messages (max ${MAX_MESSAGES})` });
    }

    const vision = isVisionPayload(messages);

    // ── Body size guard (vision requests carry a base64 image) ──
    if (Buffer.byteLength(rawBody) > (vision ? MAX_BODY_BYTES_VISION : MAX_BODY_BYTES)) {
      return res.status(413).json({ error: "Request body too large" });
    }

    // ── Text char cap (image parts excluded from the count) ──
    let totalChars = 0;
    let images = 0;
    const safeMessages = [];
    for (const message of messages) {
      if (!["user", "assistant", "system"].includes(message?.role)) {
        return res.status(400).json({ error: "Unsupported message role" });
      }
      const { role, content } = message;
      if (typeof content === "string") {
        totalChars += content.length;
        safeMessages.push({ role, content });
        continue;
      }
      if (role !== "user" || !Array.isArray(content) || content.length < 1 || content.length > 8) {
        return res.status(400).json({ error: "Invalid message content" });
      }
      const parts = [];
      for (const part of content) {
        if (part?.type === "text" && typeof part.text === "string") {
          totalChars += part.text.length;
          parts.push({ type: "text", text: part.text });
        } else if (part?.type === "image_url" && typeof part.image_url?.url === "string" &&
          /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(part.image_url.url) && ++images <= 1) {
          parts.push({ type: "image_url", image_url: { url: part.image_url.url } });
        } else {
          return res.status(400).json({ error: "Unsupported image or content part" });
        }
      }
      safeMessages.push({ role, content: parts });
    }
    if (totalChars > MAX_TOTAL_CHARS) {
      return res.status(400).json({ error: `Combined message content too large (max ${MAX_TOTAL_CHARS} chars)` });
    }

    // ── Model allowlist ──────────────────────────────────────
    const requestedModel = typeof model === "string" && model.trim() ? model.trim() : DEFAULT_MODEL;
    if (!ALLOWED_MODELS.has(requestedModel)) {
      return res.status(400).json({ error: `Model not allowed: ${requestedModel}` });
    }

    // ── Parameter clamps ─────────────────────────────────────
    const parsedTemperature = Number(temperature);
    const safeTemperature = clamp(Number.isFinite(parsedTemperature) ? parsedTemperature : 0.7, 0, 1);
    const tokenLimit = Math.floor(clamp(Number(max_tokens || maxTokens) || MAX_TOKENS_CAP, 1, MAX_TOKENS_CAP));

    if (typeof stream !== "boolean" || (vision && requestedModel !== "meta-llama/llama-4-scout-17b-16e-instruct")) {
      return res.status(400).json({ error: "Invalid streaming or vision configuration" });
    }

    // A transaction makes the limits apply across instances and concurrent requests.
    const key = getApiKey();
    let allowed: boolean;
    try {
      const db = getFirestore(getAdminApp());
      const id = createHash("sha256").update(caller.uid).digest("hex");
      const quota = db.collection("_ai_quota").doc(id);
      const minute = Math.floor(Date.now() / 60_000);
      const day = Math.floor(minute / 1440);
      allowed = await db.runTransaction(async (transaction) => {
        const previous = (await transaction.get(quota)).data();
        const minuteCount = previous?.minute === minute ? previous.minuteCount : 0;
        const dayCount = previous?.day === day ? previous.dayCount : 0;
        if (minuteCount >= 12 || dayCount >= 150) return false;
        transaction.set(quota, { minute, day, minuteCount: minuteCount + 1, dayCount: dayCount + 1 });
        return true;
      });
    } catch {
      return res.status(503).json({ error: "AI quota service unavailable" });
    }
    if (!allowed) return res.status(429).json({ error: "AI request limit reached" });

    // ── Upstream call with timeout ───────────────────────────
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: requestedModel,
        messages: safeMessages,
        temperature: safeTemperature,
        max_tokens: tokenLimit,
        stream,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    // Pass Groq's real retry hint to the client so backoff is accurate
    if (upstream.status === 429) {
      const retryAfter = upstream.headers.get("retry-after");
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
    }

    if (stream) {
      if (!upstream.ok || !upstream.body) {
        return res.status(upstream.status).json({ error: sanitizeUpstreamError(upstream.status) });
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");

      res.flushHeaders?.();
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
      return;
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: sanitizeUpstreamError(upstream.status) });
    }

    return res.status(200).json(await upstream.json());
  } catch (error: any) {
    if (res.headersSent) return res.end();
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      return res.status(504).json({ error: "AI provider timed out. Please try again." });
    }
    console.error("[groq] handler error:", error?.message || error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
