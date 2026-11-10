import test, { after } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const modules = {
  jose: `export const createRemoteJWKSet = () => null;
    export async function jwtVerify(token, _, options) {
      globalThis.verification = options;
      if (token !== 'valid' && token !== 'bad-claims') throw new Error('bad signature');
      return { protectedHeader: { kid: 'key' }, payload: { sub: 'student',
        auth_time: token === 'valid' ? 1 : 'invalid' } };
    }`,
  "firebase-admin/app": `export const getApps = () => [];
    export const cert = () => ({}); export const initializeApp = () => ({});`,
  "firebase-admin/firestore": `export const getFirestore = () => globalThis.mockDb;
    export const Timestamp = { fromDate: (value) => value };`,
  "firebase-admin/auth": `export const getAuth = () => globalThis.mockAuth;`,
  resend: `export class Resend { emails = { send: (...args) => globalThis.mockSend(...args) }; }`,
};
const hook = registerHooks({
  resolve(specifier, context, next) {
    if (Object.hasOwn(modules, specifier)) {
      return { shortCircuit: true, url: "data:text/javascript," + encodeURIComponent(modules[specifier]) };
    }
    return next(specifier, context);
  },
});
after(() => hook.deregister());

const { requireAuth } = await import("../api/_verifyToken.js");
const { default: groq } = await import("../api/groq.ts");
const { default: cron } = await import("../api/send-weekly-emails.ts");
const { default: deleteUser } = await import("../api/admin-delete-user.ts");
const environment = { ...process.env };
after(() => {
  for (const key of ["FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_KEY",
    "CRON_SECRET", "RESEND_API_KEY", "GROQ_API_KEY"]) {
    if (environment[key] === undefined) delete process.env[key];
    else process.env[key] = environment[key];
  }
});

function response() {
  return {
    code: 200,
    status(code) { this.code = code; return this; },
    setHeader() {},
    json(body) { this.body = body; return this; },
  };
}

test("API guard fails closed and binds claims to the Firebase project", async () => {
  delete process.env.FIREBASE_PROJECT_ID;
  delete process.env.VITE_FIREBASE_PROJECT_ID;
  let res = response();
  assert.equal(await requireAuth({}, res), null);
  assert.equal(res.code, 503);
  process.env.FIREBASE_PROJECT_ID = "local-test";
  for (const authorization of [undefined, ["Bearer valid"], "Bearer forged", "Bearer bad-claims"]) {
    res = response();
    assert.equal(await requireAuth({ headers: { authorization } }, res), null);
    assert.equal(res.code, 401);
  }
  const caller = await requireAuth({ headers: { authorization: "Bearer valid" } }, response());
  assert.equal(caller.uid, "student");
  assert.deepEqual(globalThis.verification.algorithms, ["RS256"]);
  assert.equal(globalThis.verification.issuer, "https://securetoken.google.com/local-test");
  assert.equal(globalThis.verification.audience, "local-test");
});

test("AI refuses remote images and enforces persistent quotas before upstream calls", async () => {
  process.env.FIREBASE_PROJECT_ID = "local-test";
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{"project_id":"local-test"}';
  process.env.GROQ_API_KEY = "mock";
  const req = { method: "POST", headers: { authorization: "Bearer valid" }, body: {
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "https://example.com/image" } }] }],
  } };
  let res = response();
  await groq(req, res);
  assert.equal(res.code, 400);
  req.body.messages = [{ role: "user", content: "Hi", tool_calls: ["unexpected"] }];
  globalThis.mockDb = {
    collection: () => ({ doc: () => ({}) }),
    runTransaction: async (callback) => callback({
      get: async () => ({ data: () => ({ minute: Math.floor(Date.now() / 60_000), minuteCount: 12 }) }),
      set: () => assert.fail("Over-quota request attempted a write"),
    }),
  };
  res = response();
  await groq(req, res);
  assert.equal(res.code, 429);
  globalThis.mockDb.runTransaction = () => { throw new Error("offline"); };
  res = response();
  await groq(req, res);
  assert.equal(res.code, 503);
});

test("cron requires GET and a configured secret, escapes HTML, and uses verified Auth email", async () => {
  process.env.FIREBASE_PROJECT_ID = "local-test";
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{"project_id":"local-test"}';
  delete process.env.CRON_SECRET;
  let res = response();
  await cron({ method: "GET" }, res);
  assert.equal(res.code, 503);
  process.env.CRON_SECRET = "local-secret";
  res = response();
  await cron({ method: "POST" }, res);
  assert.equal(res.code, 405);
  res = response();
  await cron({ method: "GET", headers: { authorization: "Bearer wrong" } }, res);
  assert.equal(res.code, 401);
  process.env.RESEND_API_KEY = "mock";
  globalThis.mockAuth = { getUser: async () => ({ email: "verified@example.com", emailVerified: true }) };
  const log = { data: () => ({ user_id: "student", xp_amount: 20, created_at: { toMillis: () => 1 } }) };
  const query = { where: () => query, get: async () => [log] };
  globalThis.mockDb = { collection: (name) => name === "xp_logs" ? query : {
    doc: () => ({ get: async () => ({
      data: () => ({ email: "untrusted@example.com", full_name: "<img>", current_streak: 1 }),
    }) }),
  } };
  let sends = 0;
  globalThis.mockSend = async (message, options) => {
    sends++;
    assert.equal(message.to, "verified@example.com");
    assert.match(message.html, /&lt;img&gt;/);
    assert.match(options.idempotencyKey, /^weekly-\d{4}-\d{2}-\d{2}-student$/);
    return { error: null };
  };
  res = response();
  await cron({ method: "GET", headers: { authorization: "Bearer local-secret" } }, res);
  assert.equal(sends, 1);
  assert.equal(res.body.sent, 1);
});

test("admin deletion rejects invalid tokens and never trusts a profile-only role", async () => {
  process.env.FIREBASE_PROJECT_ID = "local-test";
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{"project_id":"local-test"}';
  const req = { method: "POST", headers: { authorization: "Bearer valid" }, body: { uid: "target" } };
  globalThis.mockAuth = {
    verifyIdToken: async (_, checkRevoked) => {
      assert.equal(checkRevoked, true);
      throw new Error("revoked");
    },
  };
  let res = response();
  await deleteUser(req, res);
  assert.equal(res.code, 401);
  globalThis.mockAuth.verifyIdToken = async () => ({ uid: "student" });
  globalThis.mockDb = { collection: (name) => {
    assert.equal(name, "users");
    return { doc: () => ({ get: async () => ({ data: () => ({}) }) }) };
  } };
  res = response();
  await deleteUser(req, res);
  assert.equal(res.code, 403);
});

test("verified exams hide keys, enforce ownership and expiry, and award once on retries", async () => {
  const { default: exam } = await import("../api/verified-exam.ts");
  process.env.FIREBASE_PROJECT_ID = "local-test";
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{"project_id":"local-test"}';
  const rows = new Map([["_exam_catalog/math-v1", {
    published: true, title: "Math", durationSeconds: 60,
    questions: [{ question: "2 + 2?", options: ["1", "2", "3", "4"], correct: 3 }],
  }]]);
  globalThis.mockDb = {
    collection: (name) => ({ doc: (id) => `${name}/${id}` }),
    runTransaction: async (callback) => {
      const pending = [];
      const result = await callback({
        get: async (ref) => ({ data: () => rows.get(ref) }),
        create: (ref, value) => pending.push(() => {
          assert.equal(rows.has(ref), false);
          rows.set(ref, value);
        }),
        update: (ref, value) => pending.push(() => rows.set(ref, { ...rows.get(ref), ...value })),
      });
      for (const commit of pending) commit();
      return result;
    },
  };
  const invoke = async (body) => {
    const res = response();
    await exam({ method: "POST", headers: { authorization: "Bearer valid" }, body }, res);
    return res;
  };
  const start = await invoke({ action: "start", examId: "math-v1" });
  assert.equal(start.code, 200);
  assert.deepEqual(start.body.questions, [{ question: "2 + 2?", options: ["1", "2", "3", "4"] }]);
  const { attemptId } = start.body;
  assert.equal((await invoke({ action: "start", examId: "math-v1" })).body.attemptId, attemptId);
  const row = rows.get(`_exam_attempts/${attemptId}`);
  const submit = { action: "submit", attemptId, answers: [3], score: 9000, xp: 9000 };
  row.uid = "other";
  assert.equal((await invoke(submit)).code, 404);
  row.uid = "student";
  const deadline = row.expiresAt;
  row.expiresAt = 1;
  assert.equal((await invoke(submit)).code, 409);
  row.expiresAt = deadline;
  assert.equal((await invoke({ ...submit, answers: [4] })).code, 400);
  assert.equal((await invoke({ ...submit, answers: [] })).code, 400);
  assert.deepEqual((await invoke(submit)).body, { score: 1, total: 1, xp: 10 });
  assert.deepEqual((await invoke({ ...submit, answers: [0] })).body, { score: 1, total: 1, xp: 10 });
  assert.equal([...rows.keys()].filter((key) => key.startsWith("_verified_exam_xp/")).length, 1);
});
