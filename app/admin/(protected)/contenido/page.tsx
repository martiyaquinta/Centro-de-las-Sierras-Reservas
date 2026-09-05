import { ContenidoForm } from "@/components/admin/contenido-form";
import { getProperty } from "@/lib/data";

export default async function AdminContenidoPage() {
  const property = await getProperty();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Contenido</h1>
      <ContenidoForm property={property} />
    </div>
  );
}
