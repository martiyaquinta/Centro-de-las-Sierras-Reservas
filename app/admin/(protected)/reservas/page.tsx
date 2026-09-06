import { ReservasList } from "@/components/admin/reservas-list";
import { AdminPendingAlerts } from "@/components/admin/admin-pending-alerts";
import { getAllReservations } from "@/lib/data";

export default async function AdminReservasPage() {
  const reservations = await getAllReservations();
  const pending = reservations.filter((r) => r.status === "pending");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Reservas</h1>
      <AdminPendingAlerts
        pendingCount={pending.length}
        latestCode={pending[0]?.public_code ?? null}
      />
      <ReservasList reservations={reservations} />
    </div>
  );
}
