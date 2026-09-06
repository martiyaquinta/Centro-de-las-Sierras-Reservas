import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProperty } from "@/lib/data";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatARS } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Solicitud enviada",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GraciasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const code = String(sp.code ?? "");
  const name = String(sp.name ?? "huésped");
  const checkIn = String(sp.in ?? "");
  const checkOut = String(sp.out ?? "");
  const guests = Number(sp.guests ?? 1);
  const total = Number(sp.total ?? 0);
  const autoWa = String(sp.wa ?? "") === "1";

  const property = await getProperty();
  const wa =
    code && checkIn && checkOut
      ? buildWhatsAppUrl({
          phoneE164: property.whatsapp_e164,
          guestName: name,
          checkIn,
          checkOut,
          guests,
          publicCode: code,
          totalAmount: total || undefined,
        })
      : null;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center">
      {wa && autoWa && (
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.replace(${JSON.stringify(wa)});`,
          }}
        />
      )}

      <CheckCircle2 className="mb-4 h-14 w-14 text-primary" />
      <h1 className="font-serif text-2xl font-semibold">¡Listo, {name.split(" ")[0]}!</h1>
      <p className="mt-2 text-muted-foreground">
        Recibimos tu solicitud. Te redirigimos a WhatsApp con los datos de la reserva para
        confirmar.
      </p>

      {code && (
        <Card className="mt-6 w-full bg-crema">
          <CardContent className="space-y-2 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Código de seguimiento
            </p>
            <p className="font-mono text-2xl font-bold text-marron">{code}</p>
            {total > 0 && (
              <p className="text-sm text-muted-foreground">
                Total estimado: {formatARS(total)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex w-full flex-col gap-3">
        {wa && (
          <Button asChild variant="whatsapp" size="lg">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              Abrir WhatsApp con la reserva
            </a>
          </Button>
        )}
        {code && (
          <Button asChild variant="outline" size="lg">
            <Link href={`/reserva/${code}`}>Ver estado de la reserva</Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
