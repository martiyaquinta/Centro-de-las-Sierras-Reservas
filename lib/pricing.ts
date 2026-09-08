import { differenceInCalendarDays, parseISO } from "date-fns";

export function nightsBetween(checkIn: string, checkOut: string): number {
  return differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
}

/** Pack finde desactivado — siempre false. */
export function isWeekendPackRange(checkIn: string, checkOut: string): boolean {
  void checkIn;
  void checkOut;
  return false;
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
  void params.weekendPackPrice;

  return {
    nights,
    total: nights * params.pricePerNight + cleaning,
    usedWeekendPack: false,
  };
}
