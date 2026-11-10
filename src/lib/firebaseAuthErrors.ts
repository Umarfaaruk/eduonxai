export function getReadableFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: string }).code)
      : "";

  if (code === "auth/unauthorized-domain") {
    const host = window.location.hostname;
    return (
      `This domain is not authorized for Firebase Google login (${host}). ` +
      "Go to Firebase Console -> Authentication -> Settings -> Authorized domains, " +
      `then add "${host}" and try again.`
    );
  }

  if (code === "auth/popup-blocked") {
    return "Google sign-in popup was blocked by the browser. Please allow popups and try again.";
  }

  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in was cancelled before completion.";
  }

  if (code === "auth/network-request-failed") {
    return "Network error during sign-in. Check internet connection and try again.";
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: string }).message || "Authentication failed.");
  }

  return "Authentication failed. Please try again.";
}
