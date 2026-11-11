import { getAdminApp } from "./_admin.js";
import { getAuth } from "firebase-admin/auth";

// Administrative account deletion and cleanup. Retrying the same UID also
// retries cleanup after the Auth record is gone.
/** Collections where user docs are found by a field == uid query.
 *  Some collections reference the user under more than one field
 *  (follows: as follower AND as followed; friends_list: requests
 *  sent AND received) — every direction is listed explicitly. */
const QUERY_CLEANUP: Array<{ name: string; field: string }> = [
  { name: "_exam_attempts",       field: "uid" },
  { name: "_exam_slots",          field: "uid" },
  { name: "_verified_exam_xp",    field: "uid" },
  { name: "xp_logs",             field: "user_id" },
  { name: "study_sessions",      field: "user_id" },
  { name: "quiz_attempts",       field: "user_id" },
  { name: "materials",           field: "user_id" },
  { name: "doubt_sessions",      field: "user_id" },
  { name: "doubt_messages",      field: "user_id" },
  { name: "flashcards",          field: "user_id" },
  { name: "study_plans",         field: "user_id" },
  { name: "complaints",         field: "user_id" },
  { name: "complaint_history",  field: "user_id" },
  { name: "saved_notes",         field: "user_id" },
  { name: "feedback",            field: "userId" },
  { name: "analytics_snapshots", field: "user_id" },
  { name: "lesson_progress",     field: "user_id" },
  { name: "topic_progress",      field: "user_id" },
  { name: "notifications",       field: "user_id" },
  // Social graph — both directions, so the deleted user disappears
  // from everyone else's followers/following/friends lists too.
  { name: "follows",             field: "follower_id" },
  { name: "follows",             field: "following_id" },
  { name: "friends_list",        field: "requester_id" },
  { name: "friends_list",        field: "addressee_id" },
];

/** Docs whose ID is the uid itself. */
const DOC_ID_CLEANUP = ["analytics", "user_streaks", "user_preferences", "profiles", "users"];

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { uid } = body ?? {};
    const adminToken = /^Bearer (\S+)$/.exec(req.headers?.authorization ?? "")?.[1];

    if (!uid || typeof uid !== "string" || uid.length > 128 || !/^[^/\p{Cc}]+$/u.test(uid) || uid === "." || uid === "..") {
      return res.status(400).json({ error: "Missing or invalid 'uid' field" });
    }
    if (!adminToken || typeof adminToken !== "string") {
      return res.status(401).json({ error: "Missing admin authentication token" });
    }

    const app = getAdminApp();
    const auth = getAuth(app);

    // ── Verify the caller is an admin ─────────────────────────
    let callerUid: string;
    try {
      callerUid = (await auth.verifyIdToken(adminToken, true)).uid;
    } catch {
      return res.status(401).json({ error: "Invalid admin authentication token" });
    }

    const { getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore(app);

    const callerDoc = await db.collection("users").doc(callerUid).get();
    const callerData = callerDoc.data();
    const isCallerAdmin = callerData?.is_admin === true || callerData?.role === "admin";

    if (!isCallerAdmin) {
      return res.status(403).json({ error: "Forbidden: caller is not an admin" });
    }
    if (uid === callerUid) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // ── STEP 1: Delete Auth account (locks the user out first) ──
    let authDeleted = false;
    try {
      await auth.deleteUser(uid);
      authDeleted = true;
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        authDeleted = true; // already gone — continue with data cleanup
      } else {
        throw error;
      }
    }

    // ── STEP 2: Firestore query-based cleanup (Admin SDK = no rules) ──
    let deletedDocs = 0;
    const failures: string[] = [];

    /** Delete a list of document refs in batches of 450 (limit is 500). */
    const deleteRefs = async (refs: FirebaseFirestore.DocumentReference[]) => {
      for (let i = 0; i < refs.length; i += 450) {
        const batch = db.batch();
        for (const ref of refs.slice(i, i + 450)) batch.delete(ref);
        await batch.commit();
      }
      deletedDocs += refs.length;
    };

    await Promise.all(
      QUERY_CLEANUP.map(async ({ name, field }) => {
        try {
          const snap = await db.collection(name).where(field, "==", uid).get();
          if (!snap.empty) await deleteRefs(snap.docs.map((d) => d.ref));
        } catch (err: any) {
          failures.push(`${name}(${field}): ${err?.message}`);
        }
      })
    );

    // ── STEP 3: Doc-ID-based cleanup ──────────────────────────
    await Promise.all(
      DOC_ID_CLEANUP.map(async (name) => {
        try {
          await db.collection(name).doc(uid).delete();
          deletedDocs += 1;
        } catch (err: any) {
          failures.push(`${name}: ${err?.message}`);
        }
      })
    );

    // ── STEP 4: Storage cleanup ────────────────
    try {
      const { getStorage } = await import("firebase-admin/storage");
      const bucket = getStorage(app).bucket();
      for (const folder of ["avatars", "complaints", "materials"]) {
        try {
          await bucket.deleteFiles({ prefix: `${folder}/${uid}/` });
        } catch {
          failures.push(`storage:${folder}`);
        }
      }
    } catch (err: any) {
      // Best effort — bucket may not exist or have no files
      failures.push(`storage: ${err?.message}`);
    }

    console.log(
      `[admin-delete-user] uid=${uid} authDeleted=${authDeleted} docs=${deletedDocs} failures=${failures.length}`,
      failures.length ? failures : ""
    );

    return res.status(failures.length ? 500 : 200).json({
      success: failures.length === 0,
      error: failures.length ? "Account cleanup incomplete. Retry to finish cleanup." : undefined,
      deletedDocs,
      failedOperations: failures.length,
    });
  } catch (error: any) {
    console.error("[admin-delete-user] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

