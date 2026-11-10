import { jwtVerify, createRemoteJWKSet } from "jose";

// Google's public keys for Firebase ID tokens (JWK format). createRemoteJWKSet
// caches keys per Cache-Control and refreshes automatically.
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

function resolveProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    ""
  );
}

/**
 * Verify the `Authorization: Bearer <idToken>` header against the given project.
 * Returns { uid, email } on success; throws on any failure.
 */
export async function verifyAuthToken(req, projectId) {
  const pid = projectId || resolveProjectId();
  if (!pid) throw new Error("Server missing FIREBASE_PROJECT_ID");

  const header = req.headers?.authorization || req.headers?.Authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) throw new Error("Empty bearer token");

  const { payload, protectedHeader } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${pid}`,
    audience: pid,
    algorithms: ["RS256"],
    requiredClaims: ["sub", "iat", "exp", "auth_time"],
    maxTokenAge: "1h",
  });

  if (!protectedHeader.kid || !payload.sub || payload.sub.length > 128 ||
      !Number.isSafeInteger(payload.auth_time) || payload.auth_time > Date.now() / 1000) {
    throw new Error("Invalid Firebase token claims");
  }
  return { uid: String(payload.sub), email: payload.email };
}

// Reject requests before contacting providers when verification is unavailable.
export async function requireAuth(req, res) {
  const projectId = resolveProjectId();
  if (!projectId) {
    res.status(503).json({ error: "Authentication service unavailable." });
    return null;
  }
  try {
    return await verifyAuthToken(req, projectId);
  } catch {
    res.status(401).json({ error: "Unauthorized: a valid sign-in is required." });
    return null;
  }
}
