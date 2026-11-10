# EduOnx deployment instructions

Verify in an isolated Firebase project and a Vercel preview before promoting this partial patch. See SECURITY-AUDIT.md for open findings and the acceptance checklist.

## Local checks

Extract the archive and open the eduonx-main directory. Use Node 24.

1. Run npm ci.
2. Run node --test tests/security.test.mjs.
3. Run npm run lint, npm run build, and npm audit.
4. Run the Firebase and browser acceptance checks against representative staging data. Compare with the original application to identify regressions.

## Staging configuration

- Match FIREBASE_PROJECT_ID and VITE_FIREBASE_PROJECT_ID to the service account project. Configure the remaining VITE_FIREBASE web app values for staging and set VITE_FIREBASE_STORAGE_BUCKET to the actual bucket.
- Set FIREBASE_SERVICE_ACCOUNT_KEY server-side for admin deletion, the weekly job, and durable AI quota enforcement. Scope its access to the required Auth, Firestore, and Storage operations. Keep service account, Groq, cron and Resend secrets out of VITE-prefixed settings.
- Set GROQ_API_KEY, CRON_SECRET, RESEND_API_KEY, and RESEND_FROM server-side. Use a verified sender and controlled staging recipient. Rotate the Groq key if it was previously published.
- Confirm that each approved administrator has is_admin set to true or role set to admin in the protected users document keyed by Firebase UID. Review profile-only admins individually before promoting their privileges.
- Enable Storage rules access to the default Firestore database and configure bucket CORS for the exact frontend origins. Verify legacy screenshot URLs resolve through the authenticated viewer, then revoke previously distributed download tokens. [Cross-service rules](https://firebase.google.com/docs/storage/security/rules-conditions), [Web downloads and CORS](https://firebase.google.com/docs/storage/web/download-files)

## Coordinated release

1. Back up Firebase data and retain the currently deployed application, Firebase rules and indexes. Review .firebaserc and explicitly select your staging project before applying any changes.
2. Apply the bundled Firestore rules and indexes and Storage rules using Firebase tooling in staging. Review the index diff to retain existing required indexes. Accept the cross-service permission prompt only for the intended project.
3. Verify login, admin navigation and deletion, complaint submission and attachment viewing, quiz progress, lesson and timer XP, text and vision AI, transcripts, and weekly email. Confirm the cron route rejects missing and incorrect secrets. The bundled schedule is Monday at 09:00 UTC.
4. Promote the frontend, API and Firebase rules together. The new rules require quiz XP and the corresponding attempt in one transaction. The new admin API requires bearer-header authorization. Reload old browser sessions at cutover.
5. If rollback is necessary, restore the corresponding application and rules revisions together. Preserve existing records and backups. Older revisions reintroduce the vulnerabilities in the audit.
