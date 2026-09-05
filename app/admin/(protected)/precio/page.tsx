import { PrecioForm } from "@/components/admin/precio-form";
import { getProperty } from "@/lib/data";

export default async function AdminPrecioPage() {
  const property = await getProperty();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Precio</h1>
      <PrecioForm property={property} />
    </div>
  );
}
