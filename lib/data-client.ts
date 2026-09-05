/** Client-safe photo URL helper (no server imports) */
export function photoPublicUrl(storagePath: string): string {
  if (storagePath.startsWith("/") || storagePath.startsWith("http")) {
    return storagePath;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return storagePath;
  return `${base}/storage/v1/object/public/property-photos/${storagePath}`;
}
