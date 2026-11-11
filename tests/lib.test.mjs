// Unit tests for the pure client helpers. They are TypeScript, so each module
// is bundled to plain JS with esbuild (already installed with Vite) and loaded
// from a temp file. Firebase is never imported by the modules under test.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(path.join(tmpdir(), "eduonx-lib-"));

async function load(entry, stubs = {}) {
  const outfile = path.join(outDir, entry.replace(/[\\/]/g, "_") + ".mjs");
  await build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile,
    logLevel: "silent",
    plugins: [{
      name: "alias-and-stubs",
      setup(b) {
        b.onResolve({ filter: /^@\// }, (args) => {
          if (stubs[args.path]) return { path: args.path, namespace: "stub" };
          return { path: path.join(root, "src", args.path.slice(2) + ".ts") };
        });
        b.onLoad({ filter: /.*/, namespace: "stub" }, (args) => ({ contents: stubs[args.path], loader: "js" }));
      },
    }],
  });
  return import(pathToFileURL(outfile).href);
}

test("effectiveStreak drops a streak once a day has been missed", async () => {
  const { effectiveStreak, withEffectiveStreak } = await load("src/lib/streak.ts");
  const now = new Date(2026, 10, 11, 9, 0, 0); // 11 Nov 2026, local time
  assert.equal(effectiveStreak({ current_streak: 5, last_study_date: "2026-11-11" }, now), 5);
  assert.equal(effectiveStreak({ current_streak: 5, last_study_date: "2026-11-10" }, now), 5);
  assert.equal(effectiveStreak({ current_streak: 5, last_study_date: "2026-11-09" }, now), 0);
  assert.equal(effectiveStreak({ current_streak: 5, last_study_date: "2026-10-01" }, now), 0);
  assert.equal(effectiveStreak({ current_streak: 5 }, now), 5); // legacy doc without a date
  assert.equal(effectiveStreak(null, now), 0);
  const doc = withEffectiveStreak({ current_streak: 9, longest_streak: 12, last_study_date: "2026-11-01" }, now);
  assert.deepEqual(doc, { current_streak: 0, longest_streak: 12, last_study_date: "2026-11-01" });
});

test("fitMessagesToLimits keeps requests inside the proxy limits", async () => {
  const { fitMessagesToLimits } = await load("src/lib/aiService.ts", {
    "@/lib/authHeaders": "export const getAuthHeaders = async () => ({});",
  });
  const chars = (ms) => ms.reduce((n, m) => n + m.content.length, 0);

  // Long chat: system prompt and the newest turn survive, oldest turns go.
  const chat = [{ role: "system", content: "sys" }];
  for (let i = 0; i < 40; i++) chat.push({ role: i % 2 ? "assistant" : "user", content: `turn ${i}` });
  const fitted = fitMessagesToLimits(chat);
  assert.ok(fitted.length <= 24);
  assert.equal(fitted[0].role, "system");
  assert.equal(fitted.at(-1).content, "turn 39");
  assert.equal(fitted[1].content, "turn 17");

  // One oversized message is truncated instead of failing the request.
  const big = fitMessagesToLimits([
    { role: "system", content: "sys" },
    { role: "user", content: "x".repeat(150_000) },
  ]);
  assert.equal(big.length, 2);
  assert.ok(chars(big) <= 58_000);
  assert.match(big[1].content, /truncated/);

  // Large history plus a normal question: history is dropped, question kept whole.
  const mixed = fitMessagesToLimits([
    { role: "system", content: "sys" },
    { role: "user", content: "a".repeat(40_000) },
    { role: "assistant", content: "b".repeat(40_000) },
    { role: "user", content: "what next?" },
  ]);
  assert.equal(mixed.at(-1).content, "what next?");
  assert.ok(chars(mixed) <= 58_000);

  // Empty assistant placeholders (stopped responses) are not sent.
  const cleaned = fitMessagesToLimits([
    { role: "user", content: "q1" },
    { role: "assistant", content: "" },
    { role: "user", content: "q2" },
  ]);
  assert.deepEqual(cleaned.map((m) => m.content), ["q1", "q2"]);

  // Small requests pass through untouched.
  const small = [{ role: "system", content: "s" }, { role: "user", content: "hi" }];
  assert.deepEqual(fitMessagesToLimits(small), small);
});
