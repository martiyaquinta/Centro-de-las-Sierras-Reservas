import type { Metadata } from "next";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProperty, getReservationByCode } from "@/lib/data";
import { formatARS } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { ReservationStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Estado de reserva",
};

const statusLabel: Record<ReservationStatus, string> = {
  pending: "Pendiente de confirmación",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  expired: "Expirada",
};

const statusVariant: Record<
  ReservationStatus,
  "warning" | "success" | "destructive" | "secondary" | "outline"
> = {
  pending: "warning",
  confirmed: "success",
  rejected: "destructive",
  cancelled: "secondary",
  expired: "outline",
};

type Props = { params: Promise<{ code: string }> };

export default async function ReservaStatusPage({ params }: Props) {
  const { code } = await params;
  const reservation = await getReservationByCode(code);
  if (!reservation) {
    // Demo mode without DB: show friendly empty
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <h1 className="font-serif text-2xl font-semibold">No encontramos esa reserva</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revisá el código o pedile al dueño que te lo reenvíe. Si acabás de pedir en modo demo
          (sin Supabase), la reserva no se persistió.
        </p>
        <Button asChild className="mt-6">
          <Link href="/reservar">Nueva solicitud</Link>
        </Button>
      </div>
    );
  }

  const property = await getProperty();
  const wa = buildWhatsAppUrl({
    phoneE164: property.whatsapp_e164,
    guestName: reservation.guest_name,
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    guests: reservation.guests,
    publicCode: reservation.public_code,
    totalAmount: Number(reservation.total_amount),
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Reserva</p>
      <h1 className="font-mono text-2xl font-bold">{reservation.public_code}</h1>
      <Badge variant={statusVariant[reservation.status]} className="mt-2">
        {statusLabel[reservation.status]}
      </Badge>

      <Card className="mt-6 bg-crema">
        <CardHeader>
          <CardTitle className="font-serif text-lg">{reservation.guest_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Check-in: </span>
            {format(parseISO(reservation.check_in), "EEEE d MMM yyyy", { locale: es })}
          </p>
          <p>
            <span className="text-muted-foreground">Check-out: </span>
            {format(parseISO(reservation.check_out), "EEEE d MMM yyyy", { locale: es })}
          </p>
          <p>
            <span className="text-muted-foreground">Noches: </span>
            {reservation.nights}
          </p>
          <p>
            <span className="text-muted-foreground">Huéspedes: </span>
            {reservation.guests}
          </p>
          <p className="text-base font-semibold text-primary">
            Total: {formatARS(Number(reservation.total_amount))}
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        {wa && (
          <Button asChild variant="whatsapp">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
