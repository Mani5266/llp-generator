import { supabase } from "./supabase";

const BUCKET = "documents";
const SIGNED_URL_EXPIRY = 300; // 5 minutes

/**
 * Upload a file to the user's private folder in Supabase Storage.
 * Files are stored as: documents/{userId}/{filename}
 *
 * @param userId - The authenticated user's ID
 * @param filename - The file name (e.g., "LLP_Agreement_Acme.docx")
 * @param file - The file data as Blob, Buffer, or File
 * @param contentType - MIME type (e.g., "application/pdf")
 * @returns The storage path (e.g., "{userId}/LLP_Agreement_Acme.docx")
 */
export async function uploadFile(
  userId: string,
  filename: string,
  file: Blob | Buffer,
  contentType: string
): Promise<{ path: string; error: string | null }> {
  // Sanitize filename: remove path separators and null bytes
  const safeName = filename
    .replace(/[/\\]/g, "_")
    .replace(/\0/g, "")
    .slice(0, 200);

  const storagePath = `${userId}/${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType,
      upsert: true, // overwrite if exists
    });

  if (error) {
    return { path: "", error: error.message };
  }

  return { path: storagePath, error: null };
}

/**
 * Generate a signed download URL that expires after 5 minutes.
 * NEVER use getPublicUrl() — the bucket is private.
 *
 * @param storagePath - The file path in storage (e.g., "{userId}/file.docx")
 * @param expiresIn - Expiry in seconds (default: 300 = 5 minutes)
 * @returns A time-limited signed URL
 */
export async function getSignedDownloadUrl(
  storagePath: string,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<{ url: string; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    return { url: "", error: error?.message ?? "Failed to create signed URL" };
  }

  return { url: data.signedUrl, error: null };
}

/**
 * Delete a file from the user's private folder.
 *
 * @param storagePath - The file path in storage (e.g., "{userId}/file.docx")
 */
export async function deleteFile(
  storagePath: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);

  return { error: error?.message ?? null };
}

/**
 * List all files in a user's private folder.
 *
 * @param userId - The authenticated user's ID
 */
export async function listUserFiles(userId: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(userId, {
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    return { files: [], error: error.message };
  }

  return { files: data ?? [], error: null };
}
