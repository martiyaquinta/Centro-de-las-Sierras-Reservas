import { differenceInCalendarDays, parseISO, getDay } from "date-fns";

export function nightsBetween(checkIn: string, checkOut: string): number {
  return differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
}

/** Finde normal: check-in sábado, check-out lunes (noches sáb + dom) = pack USD 100 */
export function isWeekendPackRange(checkIn: string, checkOut: string): boolean {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights !== 2) return false;
  const inDay = getDay(parseISO(checkIn)); // 6 = sábado
  const outDay = getDay(parseISO(checkOut)); // 1 = lunes
  return inDay === 6 && outDay === 1;
}

export function calculateTotal(params: {
  checkIn: string;
  checkOut: string;
  pricePerNight: number;
  weekendPackPrice?: number | null;
  cleaningFee?: number;
}): { nights: number; total: number; usedWeekendPack: boolean } {
  const nights = nightsBetween(params.checkIn, params.checkOut);
  if (nights <= 0) {
    return { nights: 0, total: 0, usedWeekendPack: false };
  }

  const cleaning = params.cleaningFee ?? 0;
  const pack = params.weekendPackPrice;
  if (pack != null && pack > 0 && isWeekendPackRange(params.checkIn, params.checkOut)) {
    return { nights, total: pack + cleaning, usedWeekendPack: true };
  }

  return {
    nights,
    total: nights * params.pricePerNight + cleaning,
    usedWeekendPack: false,
  };
}
