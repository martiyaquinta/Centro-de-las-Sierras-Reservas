"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import type { Reservation, ReservationStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateReservationStatusAction } from "@/lib/actions/reservations";
import { formatARS } from "@/lib/utils";

const labels: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const variants: Record<
  ReservationStatus,
  "warning" | "success" | "destructive" | "secondary" | "outline"
> = {
  pending: "warning",
  confirmed: "success",
  rejected: "destructive",
  cancelled: "secondary",
  expired: "outline",
};

export function ReservasList({ reservations }: { reservations: Reservation[] }) {
  const [filter, setFilter] = useState<"all" | ReservationStatus>("all");
  const [pending, startTransition] = useTransition();

  const list =
    filter === "all" ? reservations : reservations.filter((r) => r.status === filter);

  function act(id: string, status: "confirmed" | "rejected" | "cancelled") {
    startTransition(async () => {
      const res = await updateReservationStatusAction({ id, status });
      if (!res.ok) toast.error(res.error);
      else toast.success(status === "confirmed" ? "Confirmada" : status === "rejected" ? "Rechazada" : "Cancelada");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "confirmed", "rejected", "cancelled"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todas" : labels[f]}
          </Button>
        ))}
      </div>

      {list.length === 0 && (
        <p className="text-sm text-muted-foreground">No hay reservas en este filtro.</p>
      )}

      <div className="space-y-3">
        {list.map((r) => (
          <article key={r.id} className="rounded-xl border border-border bg-crema p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{r.guest_name}</p>
                <p className="font-mono text-xs text-muted-foreground">{r.public_code}</p>
              </div>
              <Badge variant={variants[r.status]}>{labels[r.status]}</Badge>
            </div>
            <p className="mt-2 text-sm">
              {format(parseISO(r.check_in), "d MMM yyyy", { locale: es })} →{" "}
              {format(parseISO(r.check_out), "d MMM yyyy", { locale: es })} · {r.nights} noche
              {r.nights === 1 ? "" : "s"} · {r.guests} pax
            </p>
            <p className="text-sm font-medium text-primary">
              {formatARS(Number(r.total_amount))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{r.guest_phone}</p>
            {r.message && <p className="mt-2 text-sm italic">&ldquo;{r.message}&rdquo;</p>}

            {r.status === "pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" disabled={pending} onClick={() => act(r.id, "confirmed")}>
                  Confirmar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive" disabled={pending}>
                      Rechazar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Rechazar reserva?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se libera el hold de las noches. El huésped verá estado rechazado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => act(r.id, "rejected")}>
                        Sí, rechazar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {r.status === "confirmed" && (
              <div className="mt-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={pending}>
                      Cancelar reserva
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cancelar reserva confirmada?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Las noches vuelven a estar bookeables si siguen available.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Volver</AlertDialogCancel>
                      <AlertDialogAction onClick={() => act(r.id, "cancelled")}>
                        Sí, cancelar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
