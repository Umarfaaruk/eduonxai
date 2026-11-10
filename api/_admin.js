import { initializeApp, cert, getApps } from "firebase-admin/app";

export function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_KEY environment variable");
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    const expectedProject = process.env.FIREBASE_PROJECT_ID?.trim() ||
      process.env.VITE_FIREBASE_PROJECT_ID?.trim();
    if (!expectedProject || serviceAccount.project_id !== expectedProject) {
      throw new Error("Firebase project does not match the service account");
    }
    // Normalize escaped newlines in the PEM private key. Service-account JSON is
    // commonly stored as a single line with literal "\n" sequences (in Vercel
    // env vars or a quoted .env value); without this, cert() throws
    // "Failed to parse private key: DECODER routines::unsupported".
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    }
    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket:
        process.env.VITE_FIREBASE_STORAGE_BUCKET ||
        `${serviceAccount.project_id}.appspot.com`,
    });
  } catch (e) {
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${e.message}`);
  }
}

