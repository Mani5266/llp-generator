import { supabase } from "./supabase";

const BUCKET = "documents";
const SIGNED_URL_EXPIRY = 300; // 5 minutes

/**
 * Upload a file to Supabase Storage.
 * Files are stored as: documents/{filename}
 *
 * @param filename - The file name (e.g., "LLP_Agreement_Acme.docx")
 * @param file - The file data as Blob, Buffer, or File
 * @param contentType - MIME type (e.g., "application/pdf")
 * @returns The storage path
 */
export async function uploadFile(
  filename: string,
  file: Blob | Buffer,
  contentType: string
): Promise<{ path: string; error: string | null }> {
  // Sanitize filename: remove path separators and null bytes
  const safeName = filename
    .replace(/[/\\]/g, "_")
    .replace(/\0/g, "")
    .slice(0, 200);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(safeName, file, {
      contentType,
      upsert: true,
    });

  if (error) {
    return { path: "", error: error.message };
  }

  return { path: safeName, error: null };
}

/**
 * Generate a signed download URL that expires after 5 minutes.
 *
 * @param storagePath - The file path in storage
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
 * Delete a file from storage.
 *
 * @param storagePath - The file path in storage
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
 * List all files in storage.
 */
export async function listFiles() {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list("", {
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    return { files: [], error: error.message };
  }

  return { files: data ?? [], error: null };
}
