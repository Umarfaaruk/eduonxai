/**
 * Profile picture upload shared by the Profile and Settings pages.
 *
 * The image is resized, stored in Firebase Storage at avatars/{uid}/profile.jpg
 * and only its download URL is written to the profile document. (Settings used
 * to write the picture into Firestore as a base64 data URL, which bloated every
 * profile read, including leaderboard and friend lookups.)
 */
import { doc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { fileToSquareJpegBlob } from "@/lib/image";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const blob = await fileToSquareJpegBlob(file, 200, 0.85);
  const storageRef = ref(storage, `avatars/${uid}/profile.jpg`);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  await setDoc(
    doc(db, "profiles", uid),
    { avatar_url: url, updated_at: new Date().toISOString() },
    { merge: true }
  );
  return url;
}
