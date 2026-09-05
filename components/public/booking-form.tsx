"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createReservationAction } from "@/lib/actions/reservations";
import { calculateTotal } from "@/lib/pricing";
import { disabledDaysMatcher } from "@/lib/availability";
import { formatARS } from "@/lib/utils";
import type { Availability } from "@/lib/types";

type Props = {
  availability: Availability[];
  bookedNights: string[];
  pricePerNight: number;
  weekendPackPrice: number | null;
  cleaningFee: number;
  capacity: number;
  minNights: number;
};

export function BookingForm({
  availability,
  bookedNights,
  pricePerNight,
  weekendPackPrice,
  cleaningFee,
  capacity,
  minNights,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [message, setMessage] = useState("");

  const bookedSet = useMemo(() => new Set(bookedNights), [bookedNights]);
  const disabled = useMemo(
    () => disabledDaysMatcher(availability, bookedSet),
    [availability, bookedSet]
  );

  const checkIn = range?.from ? format(range.from, "yyyy-MM-dd") : "";
  const checkOut = range?.to ? format(range.to, "yyyy-MM-dd") : "";

  const pricing =
    checkIn && checkOut
      ? calculateTotal({
          checkIn,
          checkOut,
          pricePerNight,
          weekendPackPrice,
          cleaningFee,
        })
      : null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      toast.error("Elegí check-in y check-out");
      return;
    }
    startTransition(async () => {
      const res = await createReservationAction({
        checkIn,
        checkOut,
        guests,
        guestName,
        guestEmail,
        guestPhone,
        message,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Solicitud enviada");
      router.push(
        `/gracias?code=${encodeURIComponent(res.data!.publicCode)}&name=${encodeURIComponent(guestName)}&in=${checkIn}&out=${checkOut}&guests=${guests}&total=${pricing?.total ?? 0}`
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Elegí tus noches</CardTitle>
          <p className="text-sm text-muted-foreground">
            Solo se habilitan fechas disponibles. Check-out es el día que te vas.
          </p>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={1}
            disabled={disabled}
            defaultMonth={new Date()}
            className="mx-auto rounded-xl border border-border bg-crema"
          />
          {checkIn && checkOut && (
            <p className="mt-3 text-center text-sm text-marron">
              {format(range!.from!, "d MMM", { locale: es })} →{" "}
              {format(range!.to!, "d MMM yyyy", { locale: es })}
              {pricing ? ` · ${pricing.nights} noche${pricing.nights === 1 ? "" : "s"}` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-xl">Tus datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guests">Huéspedes (máx. {capacity})</Label>
            <Input
              id="guests"
              type="number"
              min={1}
              max={capacity}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Tu nombre"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono / WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="+54 9 11 ..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Mensaje (opcional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Horario de llegada, consultas..."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-crema">
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Precio / noche</span>
            <span>{formatARS(pricePerNight)}</span>
          </div>
          {weekendPackPrice != null && weekendPackPrice > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pack finde (vie–dom)</span>
              <span>{formatARS(weekendPackPrice)}</span>
            </div>
          )}
          {minNights > 1 && (
            <p className="text-xs text-muted-foreground">Mínimo {minNights} noches</p>
          )}
          {pricing && pricing.nights > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span>
                  {pricing.nights} noche{pricing.nights === 1 ? "" : "s"}
                  {pricing.usedWeekendPack ? " (pack finde)" : ""}
                </span>
                <span className="font-semibold">{formatARS(pricing.total - cleaningFee)}</span>
              </div>
              {cleaningFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Limpieza</span>
                  <span>{formatARS(cleaningFee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-3 text-base font-bold">
                <span>Total estimado</span>
                <span className="text-primary">{formatARS(pricing.total)}</span>
              </div>
            </>
          )}
          <p className="text-xs text-muted-foreground">
            Es una solicitud. El dueño confirma y te escribe. No hay cobro online en esta versión.
          </p>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
