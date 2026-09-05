import { ReservasList } from "@/components/admin/reservas-list";
import { getAllReservations } from "@/lib/data";

export default async function AdminReservasPage() {
  const reservations = await getAllReservations();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Reservas</h1>
      <ReservasList reservations={reservations} />
    </div>
  );
}
