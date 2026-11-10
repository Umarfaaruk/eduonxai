# EduOnx security audit

The patch uses the Firebase version in eduonx-main.zip. The second archive uses Supabase and omits the Firebase rules. The separately named historical security patch was unavailable. No live services or credentials were used and no records were migrated.

| Severity | Files | Finding and disposition |
|---|---|---|
| Critical | api/_verifyToken.js | Missing project configuration previously bypassed verification for Groq, NDLI and transcripts. It now returns 503. Invalid credentials return 401. Verification pins RS256, issuer, audience and required Firebase claims. Lightweight verification does not check revocation. |
| High | api/admin-delete-user.ts, api/_admin.js, firestore.rules, src/components/AdminRoute.tsx, src/pages/admin/AdminLogin.tsx, src/pages/admin/AdminPanel.tsx | Admin checks now use the protected users record instead of also trusting profiles. Deletion verifies token revocation, checks project configuration, uses bearer authentication and reports partial cleanup. Removed ambiguous lesson-progress prefix matching. Legacy and nested cleanup completeness is unverified. |
| High | storage.rules, src/pages/Settings.tsx, src/pages/admin/AdminPanel.tsx | Complaint screenshots previously allowed reads by any signed-in user. Now restricted to the owner or a protected-record admin. New complaints store object paths, and the viewer fetches via the authenticated SDK. Old shared download URLs remain usable until their tokens are revoked. |
| High | api/send-weekly-emails.ts | Previously callable without authentication if CRON_SECRET was missing. Now requires GET and a configured bearer secret. Escapes greeting HTML, uses verified Firebase Auth addresses and reads the previous complete UTC week. A stable provider idempotency key reduces duplicate sends within the provider window. Large-job runtime and longer-term retry deduplication are open. |
| High | api/groq.ts, api/_admin.js | Adds transactional limits of 12 requests/minute and 150/day per account. Validates message structure, restricts vision to inline images and uses a server-only key. Quota failure returns 503. Multi-account and aggregate spend controls remain open. |
| High, open | src/pages/quiz/QuizPage.tsx, src/pages/quiz/QuizResults.tsx, firestore.rules | Browser owns scores and answer keys. Attempts and XP now save atomically with a stable attempt ID, and rules bound and link quiz awards to new immutable attempts. A modified client can still fabricate a score using a fresh ID. Verified scores require server-held keys and one-time server-owned attempts. No separate trusted exam engine was found in this snapshot. |
| High, open | src/lib/studySession.ts, src/lib/xp.ts, firestore.rules | Lesson and timer XP are self-reported. The rules bound new event fields and amounts and prevent client edits to saved events. Repeated plausible events and edits to client-managed aggregates remain possible. Historical scores and XP were retained and should be treated as unverified. |
| Medium | firestore.rules | Ownership cannot be reassigned on several collections. Only the recipient can accept a pending friend request. Complaint status updates require admin access. Signed-in users can still read full profile documents for social features. |
| Medium | vite.config.ts, src/pages/quiz/QuizPage.tsx | Bounded local API body buffering, removed import-cache busting, fixed local SSE header ordering and scoped the dev server to localhost. Quiz cache now distinguishes study materials. Production sourcemaps are disabled. Performance impact remains unmeasured. |
| Open | api/log-error.ts, api/ndli.js, api/youtube-transcript.ts, src/hooks/useDashboardData.ts, src/pages/admin/AdminPanel.tsx | Anonymous telemetry remains open to spam. Transcript and NDLI calls have authentication but lack durable quotas. Dashboard history and admin subscriptions need production-sized benchmarks. |
| Unverified | package.json, package-lock.json | Locked dependencies were retained. The advisory registry was unreachable. |

## Test results

- Node 24.20.0, node --test tests/security.test.mjs. Four passed using mocks. Covered missing and invalid tokens, project/algorithm binding, remote-image rejection, quota denial and outage, cron method/secret, HTML escaping, recipient source, revoked admin token and profile-only admin denial.
- Node syntax checks on API implementation files and vite.config.ts passed. Type checking and JSX compilation remain unverified.
- npm ci and npm audit failed because the npm registry hostname could not be resolved. Automatic approval review rejected the network-enabled install retry. Build and lint could not start because Vite and ESLint were unavailable.
- Firebase rules compilation, browser and Firebase emulator workflows, real token verification, provider integration and performance benchmarks remain unverified.

## Staging tests still required

- Check unauthenticated, owner, unrelated student, profile-only admin and protected-record admin access. Test role changes, owner reassignment, recipient-only friend acceptance and complaint status.
- Complete a quiz, reload and submit the same attempt concurrently. Expect one attempt and at most one XP event. Force a write denial and verify no partial commit. Treat fabricated attempts with new IDs as an open failure.
- Validate owner and admin complaint screenshot access, unrelated-user denial, legacy attachments and download token revocation.
- Verify expired and wrong-project tokens. Delete a disposable test account and simulate partial cleanup, then retry.
- Verify controlled cron delivery, duplicate requests, unverified recipients and provider failures.
- Compare p50/p95 latency, Firestore reads and errors against the baseline. Include dashboard, admin, AI streaming, camera Q&A and concurrent AI quota tests.
