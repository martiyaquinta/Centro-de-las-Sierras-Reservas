import { FotosAdmin } from "@/components/admin/fotos-admin";
import { getPhotos } from "@/lib/data";

export default async function AdminFotosPage() {
  const photos = await getPhotos();
  // Filter out pure brand placeholders that aren't in storage if needed
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Fotos</h1>
      <FotosAdmin photos={photos.filter((p) => !p.id.startsWith("photo-"))} />
    </div>
  );
}
