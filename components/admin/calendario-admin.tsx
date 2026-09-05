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
        toast.success(status === "available" ? "Abierto" : "Bloqueado");
        setRange(undefined);
      }
    });
  }

  function onDayClick(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    if (booked.has(key)) {
      toast.message("Noche ocupada por reserva");
      return;
    }
    const cur = map.get(key) ?? "blocked";
    const next = cur === "available" ? "blocked" : "available";
    startTransition(async () => {
      const res = await toggleAvailabilityDayAction(key, next);
      if (!res.ok) toast.error(res.error);
      else toast.success(`${key}: ${next}`);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tocá un día para alternar available/blocked. O elegí rango y abrí/cerrá.
      </p>
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-primary/40" /> Disponible
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" /> Bloqueado
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-destructive/50" /> Ocupado
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
          available: "bg-primary/20 text-marron font-semibold",
          blocked: "opacity-40",
          occupied: "bg-destructive/30 text-destructive line-through",
        }}
        className={cn("rounded-xl border border-border bg-crema")}
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => apply("available")}>
          Abrir rango
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("blocked")}>
          Bloquear rango
        </Button>
      </div>
      <Label className="text-xs text-muted-foreground">
        Tip: seed abre vie+sáb. Podés abrir jueves o weekdays cuando quieras.
      </Label>
    </div>
  );
}
