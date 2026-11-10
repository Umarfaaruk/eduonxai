# edunoxai verified exams milestone

## Delivered

The archive builds on the prior Firebase security patch. Practice Arena links to a separate timed verified exam flow at /quiz/verified. The existing AI practice flow is separate and continues to generate practice scores. Its client-managed scores, lesson XP, timer XP and historical XP remain unverified.

- api/verified-exam.ts verifies Firebase authentication, lists published exam metadata, creates one attempt per user per catalog version, and stores a private snapshot of questions and keys. The start response excludes answer keys. Submissions accept option indices or null for skipped questions. The server checks ownership and the deadline, calculates marks, and commits the result and XP ledger entry together. Repeated submissions return the committed result.
- src/pages/quiz/VerifiedExamPage.tsx shows a timer and restores a draft when the same attempt is reopened in the same browser tab. The API clock controls expiry. The page displays the server result after submission.
- api/admin-delete-user.ts includes the new user-owned attempt, slot and verified XP records in account cleanup.
- The verified ledger is separate from existing dashboard and leaderboard XP. No migration is needed and the new XP does not count toward legacy totals.
- The pilot uses four-option, single-answer questions with one point per correct answer and 10 verified XP per point. There is no negative marking, auto-submit at expiry, or per-answer review. One catalog version allows one timed attempt, including expired attempts.

## Staging setup

The project requires the existing Firebase project and server-side Admin SDK configuration described in DEPLOYMENT.md. The exam route returns an empty catalog until a trusted operator adds reviewed content. No sample exam or production data was seeded.

1. Confirm that Firestore's client rules deny read and write access to _exam_catalog, _exam_slots, _exam_attempts and _verified_exam_xp. The bundled rules do not grant client access to these collections. The trusted API accesses them with the Admin SDK.
2. In an emulator or staging project, create a document such as _exam_catalog/math-v1 using a trusted Admin SDK or console session. Set title to a string, published to true, durationSeconds to an integer from 30 to 14400, and questions to a list of 1 to 50 maps. Each map has question (string), options (four strings), and correct (zero-based integer 0 to 3). Publish new content under a new version ID. Treat version IDs as immutable once published.
3. Sign in as two distinct test users and open Practice Arena, then Verified exams. Confirm a user can reopen their attempt without extending the deadline. Inspect API responses and confirm answer keys are absent. Verify account cleanup with a disposable UID.
4. Race two submissions to the same attempt and verify that the Firestore transaction commits one result and one award. Retry after a simulated response loss. Verify expiry, cross-account denial and direct-client denial for all four collections. Test browsers with different clock settings because the displayed countdown uses the browser clock.
5. Run the original security audit's acceptance checks before promoting. Preserve existing Firebase rules and data, and test legacy quiz and activity paths separately.

## Local verification

Node 24 ran five mocked tests successfully, including hidden keys, same-version start replay, wrong owner, expiration, invalid answers, forged score/XP input and duplicate submission. Node syntax checks passed for API implementations and Vite configuration. The mock does not verify Firestore concurrency or client rules.

npm ci and npm audit were blocked by DNS resolution errors for registry.npmjs.org. npm run build and npm run lint could not start because the tools were unavailable. Type checking, browser rendering, Firebase rules compilation and real transactions are still unverified. No deployment, credential use or live data changes took place.

## Next milestones

1. Reproduce the installation and complete build, lint, dependency audit, emulator and browser acceptance checks.
2. Extend the verified exam model with reviewed syllabus-linked questions, authoring, result history and the scoring rules required by each exam. Review revoked-session behavior, rate limits, storage growth and learner accessibility before public rollout. Keep AI practice and verified results distinguishable.
3. Build the Postgres pilot against the same contract and test fixtures. Keep Firebase Auth and Storage initially. Map Firebase UIDs explicitly, keep answer keys private, and enforce one award per attempt in the database. Run the same tests, then compare measured latency, reporting complexity, and operating costs. Review the existing Supabase archive as reference because its schema includes destructive statements and unsafe write policies.
4. Expand question banks, sectional tests, learning paths, analytics and tutor workflows after the assessment foundations pass verification. These items and the Postgres pilot are pending.
