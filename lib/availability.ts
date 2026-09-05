import {
  eachDayOfInterval,
  format,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
import type { Availability, Reservation } from "@/lib/types";

/** Nights slept: check_in inclusive, check_out exclusive */
export function nightsInRange(checkIn: string, checkOut: string): string[] {
  const start = parseISO(checkIn);
  const end = parseISO(checkOut);
  if (!isBefore(start, end)) return [];
  const days = eachDayOfInterval({ start, end: new Date(end.getTime() - 86400000) });
  return days.map((d) => format(d, "yyyy-MM-dd"));
}

export function buildBookedNightSet(
  reservations: Pick<Reservation, "check_in" | "check_out" | "status" | "hold_until">[]
): Set<string> {
  const now = new Date();
  const booked = new Set<string>();

  for (const r of reservations) {
    const active =
      r.status === "confirmed" ||
      (r.status === "pending" &&
        r.hold_until != null &&
        new Date(r.hold_until) > now);

    if (!active) continue;
    for (const n of nightsInRange(r.check_in, r.check_out)) {
      booked.add(n);
    }
  }
  return booked;
}

export function isRangeBookable(params: {
  checkIn: string;
  checkOut: string;
  availability: Availability[];
  bookedNights: Set<string>;
  minNights?: number;
}): { ok: true } | { ok: false; reason: string } {
  const { checkIn, checkOut, availability, bookedNights, minNights = 1 } = params;
  const nights = nightsInRange(checkIn, checkOut);

  if (nights.length === 0) {
    return { ok: false, reason: "Elegí al menos una noche" };
  }
  if (nights.length < minNights) {
    return { ok: false, reason: `Mínimo ${minNights} noche(s)` };
  }

  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  if (checkIn < today) {
    return { ok: false, reason: "La fecha ya pasó" };
  }

  const availMap = new Map(availability.map((a) => [a.night_date, a.status]));

  for (const night of nights) {
    if (availMap.get(night) !== "available") {
      return { ok: false, reason: `La noche ${night} no está disponible` };
    }
    if (bookedNights.has(night)) {
      return { ok: false, reason: `La noche ${night} ya está reservada` };
    }
  }

  return { ok: true };
}

export function disabledDaysMatcher(
  availability: Availability[],
  bookedNights: Set<string>
): (date: Date) => boolean {
  const availMap = new Map(availability.map((a) => [a.night_date, a.status]));
  const today = startOfDay(new Date());

  return (date: Date) => {
    if (isBefore(date, today)) return true;
    const key = format(date, "yyyy-MM-dd");
    if (availMap.get(key) !== "available") return true;
    if (bookedNights.has(key)) return true;
    return false;
  };
}
