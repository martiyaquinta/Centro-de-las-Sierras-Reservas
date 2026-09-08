"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Availability } from "@/lib/types";
import {
  setAvailabilityRangeAction,
  toggleAvailabilityDayAction,
} from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

export function CalendarioAdmin({
  availability,
  bookedNights,
}: {
  availability: Availability[];
  bookedNights: string[];
}) {
  const [range, setRange] = useState<DateRange | undefined>();
  const [pending, startTransition] = useTransition();

  const map = useMemo(() => {
    const m = new Map(availability.map((a) => [a.night_date, a.status]));
    return m;
  }, [availability]);

  const booked = useMemo(() => new Set(bookedNights), [bookedNights]);

  function modifiers() {
    const available: Date[] = [];
    const blocked: Date[] = [];
    const occupied: Date[] = [];
    for (const [date, status] of map) {
      const d = new Date(date + "T12:00:00");
      if (booked.has(date)) occupied.push(d);
      else if (status === "available") available.push(d);
      else blocked.push(d);
    }
    // also mark booked nights even if not in availability map
    for (const date of booked) {
      if (!map.has(date)) {
        occupied.push(new Date(date + "T12:00:00"));
      }
    }
    return { available, blocked, occupied };
  }

  const mods = modifiers();

  function apply(status: "available" | "blocked") {
    if (!range?.from || !range?.to) {
      toast.error("Elegí un rango");
      return;
    }
    startTransition(async () => {
      const res = await setAvailabilityRangeAction({
        from: format(range.from!, "yyyy-MM-dd"),
        to: format(range.to!, "yyyy-MM-dd"),
        status,
      });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(status === "available" ? "Marcado libre" : "Marcado ocupado/bloqueado");
        setRange(undefined);
      }
    });
  }

  function onDayClick(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    if (booked.has(key)) {
      toast.message("Ocupado por una reserva — gestioná en Reservas");
      return;
    }
    const cur = map.get(key) ?? "blocked";
    const next = cur === "available" ? "blocked" : "available";
    startTransition(async () => {
      const res = await toggleAvailabilityDayAction(key, next);
      if (!res.ok) toast.error(res.error);
      else toast.success(next === "available" ? `${key}: libre` : `${key}: ocupado`);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tocá un día para alternar libre ↔ ocupado. O elegí un rango y usá los botones.
        El rojo de reserva no se edita acá (va en Reservas).
      </p>

      <div className="flex flex-wrap gap-2 text-xs sm:gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700/30 bg-emerald-100 px-2.5 py-1 font-medium text-emerald-900">
          <span className="h-3 w-3 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
          Libre
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-stone-400/40 bg-stone-200/80 px-2.5 py-1 font-medium text-stone-700">
          <span className="h-3 w-3 rounded-full bg-stone-400 ring-2 ring-stone-200" />
          Cerrado
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-red-700/30 bg-red-100 px-2.5 py-1 font-medium text-red-900">
          <span className="h-3 w-3 rounded-full bg-red-600 ring-2 ring-red-200" />
          Ocupado (reserva)
        </span>
      </div>

      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        onDayClick={onDayClick}
        numberOfMonths={1}
        modifiers={mods}
        modifiersClassNames={{
          available:
            "!bg-emerald-500 !text-white hover:!bg-emerald-600 font-bold shadow-sm ring-2 ring-emerald-700/30",
          blocked:
            "!bg-stone-300/90 !text-stone-600 hover:!bg-stone-400/80 font-medium",
          occupied:
            "!bg-red-600 !text-white hover:!bg-red-600 font-bold ring-2 ring-red-800/40 line-through decoration-white/80",
        }}
        className={cn("rounded-xl border border-border bg-crema p-3")}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => apply("available")}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Marcar libre
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => apply("blocked")}
          className="border-stone-400 bg-stone-100 text-stone-800 hover:bg-stone-200"
        >
          Marcar ocupado / cerrado
        </Button>
      </div>
      <Label className="text-xs text-muted-foreground">
        Verde = se puede reservar. Gris = cerrado. Rojo = ya hay reserva. Por defecto solo
        vie+sáb están libres (check-out domingo); abrí jue u otros días para puentes.
      </Label>
    </div>
  );
}
