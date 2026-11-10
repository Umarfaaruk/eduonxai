/**
 * WEEKLY PROGRESS EMAIL (#7)
 * ==========================
 * Sends each active user a digest of THEIR real weekly stats (XP earned this
 * week, total XP, streak) to their account email. Triggered by a Vercel Cron
 * (see vercel.json) once a week, or manually with the CRON_SECRET.
 *
 * Accuracy: only users who actually earned XP in the last 7 days get an email,
 * and the numbers come straight from that user's deduplicated xp_logs — no
 * phantom data, no duplicates.
 *
 * Required env (set in Vercel):
 *   RESEND_API_KEY                – your Resend API key
 *   FIREBASE_SERVICE_ACCOUNT_KEY  – already used by admin-delete-user
 * Optional:
 *   RESEND_FROM                   – e.g. "EduOnx <noreply@yourdomain.com>"
 *                                   (defaults to Resend's onboarding sender)
 *   CRON_SECRET                   – the request must send
 *                                   Authorization: Bearer <CRON_SECRET>
 */
import { timingSafeEqual, createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { Resend } from "resend";
import { getAdminApp } from "./_admin.js";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const digest = (value: string) => createHash("sha256").update(value).digest();
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function emailHtml(name: string, weeklyXp: number, totalXp: number, streak: number, awards: number) {
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px -12px rgba(0,0,0,.15);">
      <div style="background:linear-gradient(135deg,#29ABE2,#1E96CC);padding:28px 28px 22px;color:#fff;">
        <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">EduOnx · Weekly Recap</div>
        <h1 style="margin:6px 0 0;font-size:24px;">Nice work this week, ${escapeHtml(name)}! 🎉</h1>
      </div>
      <div style="padding:24px 28px;">
        <p style="color:#475569;font-size:15px;margin:0 0 18px;">Here's how your learning went over the last 7 days:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:10px 0;">
          <tr>
            <td style="background:#EAF7FD;border-radius:14px;padding:16px;text-align:center;">
              <div style="font-size:26px;font-weight:800;color:#1E96CC;">${weeklyXp.toLocaleString()}</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">XP this week</div>
            </td>
            <td style="background:#FFF7ED;border-radius:14px;padding:16px;text-align:center;">
              <div style="font-size:26px;font-weight:800;color:#F97316;">${streak}</div>
              <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;">Day streak</div>
            </td>
          </tr>
        </table>
        <div style="margin-top:18px;color:#475569;font-size:14px;line-height:1.7;">
          <div>📚 Total XP earned all-time: <b style="color:#0f172a;">${totalXp.toLocaleString()}</b></div>
          <div>⚡ Study sessions / activities this week: <b style="color:#0f172a;">${awards}</b></div>
        </div>
        <div style="text-align:center;margin-top:26px;">
          <a href="https://eduonx-eta.vercel.app/dashboard" style="display:inline-block;background:#29ABE2;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 26px;border-radius:12px;">Keep your streak going →</a>
        </div>
      </div>
      <div style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:11px;text-align:center;">
        You're receiving this because you have an EduOnx account. Keep learning! 💙
      </div>
    </div>
  </div></body></html>`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return res.status(503).json({ error: "Email job unavailable" });
  const auth = req.headers?.authorization;
  if (typeof auth !== "string" || !timingSafeEqual(digest(auth), digest(`Bearer ${secret}`))) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "RESEND_API_KEY is not configured." });
  }
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM || "EduOnx <onboarding@resend.dev>";

  try {
    const app = getAdminApp();
    const db = getFirestore(app);
    const now = new Date();
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),
      now.getUTCDate() - (now.getUTCDay() + 6) % 7));
    const weekAgo = new Date(weekStart.getTime() - 7 * 86400_000);

    // Aggregate this week's XP per user from the event log (de-duplicated).
    const logs = await db
      .collection("xp_logs")
      .where("created_at", ">=", Timestamp.fromDate(weekAgo))
      .where("created_at", "<", Timestamp.fromDate(weekStart))
      .get();

    const seen = new Set<string>();
    const weeklyXp = new Map<string, number>();
    const counts = new Map<string, number>();
    logs.forEach((d) => {
      const x = d.data() as any;
      if (typeof x.user_id !== "string" || !x.user_id || !Number.isFinite(x.xp_amount)) return;
      const ms = x.created_at?.toMillis?.() ?? 0;
      const sig = `${x.user_id}|${x.xp_amount}|${x.source_type}|${ms}`;
      if (seen.has(sig)) return;
      seen.add(sig);
      weeklyXp.set(x.user_id, (weeklyXp.get(x.user_id) || 0) + x.xp_amount);
      counts.set(x.user_id, (counts.get(x.user_id) || 0) + 1);
    });

    let sent = 0;
    let skippedNoEmail = 0;
    const failures: string[] = [];

    for (const [uid, xpWeek] of weeklyXp) {
      try {
        const [pSnap, sSnap, account] = await Promise.all([
          db.collection("profiles").doc(uid).get(),
          db.collection("user_streaks").doc(uid).get(),
          getAuth(app).getUser(uid),
        ]);
        const profile = pSnap.data() as any;
        if (!account.email || !account.emailVerified || account.disabled) { skippedNoEmail++; continue; }
        const name = (typeof profile?.full_name === "string" ? profile.full_name.trim().slice(0, 100) : "there").split(" ")[0] || "there";
        const totalXp = Number(profile?.total_xp) || 0;
        const streak = Number(sSnap.data()?.current_streak) || 0;

        // Resend resolves with { data, error } and does NOT throw on API
        // errors (invalid key, unverified domain, bad recipient, rate limit),
        // so we must inspect `error` — otherwise failed sends look successful.
        const { error } = await resend.emails.send({
          from,
          to: account.email,
          subject: `Your EduOnx week: +${xpWeek.toLocaleString()} XP 🚀`,
          html: emailHtml(name, xpWeek, totalXp, streak, counts.get(uid) || 0),
        }, { idempotencyKey: `weekly-${weekStart.toISOString().slice(0, 10)}-${uid}` });
        if (error) {
          failures.push(uid);
        } else {
          sent++;
        }
      } catch {
        failures.push(uid);
      }
    }

    return res.status(200).json({
      ok: true,
      usersWithActivity: weeklyXp.size,
      sent,
      skippedNoEmail,
      failed: failures.length,
    });
  } catch (err: any) {
    console.error("[send-weekly-emails] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
