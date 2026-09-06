"use server";

import { revalidatePath } from "next/cache";
import { createReservationSchema, reservationStatusSchema } from "@/lib/validations";
import { calculateTotal } from "@/lib/pricing";
import {
  buildBookedNightSet,
  isRangeBookable,
} from "@/lib/availability";
import { generatePublicCode } from "@/lib/utils";
import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  addDemoReservation,
  getActiveReservationsForBooking,
  getAvailability,
  getProperty,
  updateDemoReservationStatus,
} from "@/lib/data";
import { notifyAdminNewReservation } from "@/lib/notify";
import { isAllowedAdminEmail } from "@/lib/admin-allowlist";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function sendAdminMail(params: {
  publicCode: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalAmount: number;
  currency: string;
  message?: string | null;
}) {
  // fire-and-forget-ish: await so logs land, but never fail the booking
  try {
    await notifyAdminNewReservation(params);
  } catch (e) {
    console.error("[createReservation] notify failed", e);
  }
}

export async function createReservationAction(
  raw: unknown
): Promise<ActionResult<{ publicCode: string; id: string }>> {
  const parsed = createReservationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const input = parsed.data;
  const property = await getProperty();

  if (input.guests > property.capacity) {
    return { ok: false, error: `Máximo ${property.capacity} personas` };
  }

  const availability = await getAvailability();
  const activeRes = await getActiveReservationsForBooking();
  const booked = buildBookedNightSet(activeRes);
  const bookable = isRangeBookable({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    availability,
    bookedNights: booked,
    minNights: property.min_nights,
  });

  if (!bookable.ok) {
    return { ok: false, error: bookable.reason };
  }

  const { nights, total } = calculateTotal({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    pricePerNight: property.price_per_night,
    weekendPackPrice: property.weekend_pack_price,
    cleaningFee: property.cleaning_fee,
  });

  const holdUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const notifyPayload = {
    publicCode: "",
    guestName: input.guestName,
    guestPhone: input.guestPhone,
    guestEmail: input.guestEmail || null,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    nights,
    totalAmount: total,
    currency: property.currency,
    message: input.message || null,
  };

  if (!isSupabaseConfigured()) {
    const publicCode = generatePublicCode();
    const id = `demo-${publicCode}`;
    await addDemoReservation({
      id,
      public_code: publicCode,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guests: input.guests,
      guest_name: input.guestName,
      guest_email: input.guestEmail || null,
      guest_phone: input.guestPhone,
      message: input.message || null,
      nights,
      total_amount: total,
      currency: property.currency,
      status: "pending",
      hold_until: holdUntil,
      admin_note: null,
      created_at: now,
      updated_at: now,
    });
    await sendAdminMail({ ...notifyPayload, publicCode });
    revalidatePath("/reservar");
    revalidatePath("/admin");
    revalidatePath("/admin/reservas");
    revalidatePath("/admin/calendario");
    return { ok: true, data: { publicCode, id } };
  }

  const service = createServiceClient();

  let publicCode = generatePublicCode();
  let attempts = 0;

  while (attempts < 5) {
    const { data, error } = await service
      .from("reservations")
      .insert({
        public_code: publicCode,
        check_in: input.checkIn,
        check_out: input.checkOut,
        guests: input.guests,
        guest_name: input.guestName,
        guest_email: input.guestEmail || null,
        guest_phone: input.guestPhone,
        message: input.message || null,
        nights,
        total_amount: total,
        currency: property.currency,
        status: "pending",
        hold_until: holdUntil,
      })
      .select("id, public_code")
      .single();

    if (!error && data) {
      await sendAdminMail({ ...notifyPayload, publicCode: data.public_code });
      revalidatePath("/reservar");
      revalidatePath("/admin");
      revalidatePath("/admin/reservas");
      revalidatePath("/admin/calendario");
      return { ok: true, data: { publicCode: data.public_code, id: data.id } };
    }

    if (error?.code === "23505") {
      publicCode = generatePublicCode();
      attempts++;
      continue;
    }

    return { ok: false, error: error?.message ?? "No se pudo crear la reserva" };
  }

  return { ok: false, error: "No se pudo generar código único" };
}

export async function updateReservationStatusAction(
  raw: unknown
): Promise<ActionResult> {
  const parsed = reservationStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos" };
  }

  if (!isSupabaseConfigured()) {
    const ok = await updateDemoReservationStatus(
      parsed.data.id,
      parsed.data.status,
      parsed.data.admin_note || null
    );
    if (!ok) return { ok: false, error: "Reserva no encontrada" };
    revalidatePath("/admin");
    revalidatePath("/admin/reservas");
    revalidatePath("/admin/calendario");
    revalidatePath("/reservar");
    return { ok: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  if (!isAllowedAdminEmail(user.email)) {
    await supabase.auth.signOut();
    return { ok: false, error: "No autorizado" };
  }

  const { error } = await supabase
    .from("reservations")
    .update({
      status: parsed.data.status,
      admin_note: parsed.data.admin_note || null,
      hold_until:
        parsed.data.status === "confirmed"
          ? null
          : parsed.data.status === "rejected" || parsed.data.status === "cancelled"
            ? null
            : undefined,
    })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/calendario");
  revalidatePath("/reservar");
  return { ok: true };
}
