import { CalendarioAdmin } from "@/components/admin/calendario-admin";
import { getActiveReservationsForBooking, getAvailability } from "@/lib/data";
import { buildBookedNightSet } from "@/lib/availability";

export default async function AdminCalendarioPage() {
  const [availability, active] = await Promise.all([
    getAvailability(),
    getActiveReservationsForBooking(),
  ]);
  const booked = buildBookedNightSet(active);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Calendario</h1>
      <CalendarioAdmin availability={availability} bookedNights={[...booked]} />
    </div>
  );
}
