import type { Metadata } from "next";
import { BookingForm } from "@/components/public/booking-form";
import {
  getActiveReservationsForBooking,
  getAvailability,
  getProperty,
} from "@/lib/data";
import { buildBookedNightSet } from "@/lib/availability";

export const metadata: Metadata = {
  title: "Reservar",
  description: "Elegí fechas y enviá tu solicitud de reserva",
};

export default async function ReservarPage() {
  const [property, availability, active] = await Promise.all([
    getProperty(),
    getAvailability(),
    getActiveReservationsForBooking(),
  ]);
  const booked = buildBookedNightSet(active);

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 font-serif text-2xl font-semibold">Reservá tu finde</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Findes: entrás sábado y te vas lunes (2 noches). Si hay puente, abrimos los días extra.
      </p>
      <BookingForm
        availability={availability}
        bookedNights={[...booked]}
        pricePerNight={property.price_per_night}
        weekendPackPrice={property.weekend_pack_price}
        cleaningFee={property.cleaning_fee}
        capacity={property.capacity}
        minNights={property.min_nights}
        whatsappE164={property.whatsapp_e164}
      />
    </div>
  );
}
