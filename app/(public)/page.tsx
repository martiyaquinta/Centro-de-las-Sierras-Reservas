import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Users,
  Mountain,
  CalendarDays,
  Wifi,
  ChefHat,
  BedDouble,
  ExternalLink,
} from "lucide-react";
import { Gallery } from "@/components/public/gallery";
import { StickyCta } from "@/components/public/sticky-cta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPhotos, getProperty } from "@/lib/data";
import { formatARS } from "@/lib/utils";
import { buildGenericWhatsAppUrl } from "@/lib/whatsapp";

const amenityIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("wifi")) return Wifi;
  if (n.includes("cocina")) return ChefHat;
  if (n.includes("cama") || n.includes("ropa")) return BedDouble;
  if (n.includes("sierra") || n.includes("balcón") || n.includes("balcon")) return Mountain;
  return null;
};

export default async function HomePage() {
  const [property, photos] = await Promise.all([getProperty(), getPhotos()]);
  const wa = buildGenericWhatsAppUrl(property.whatsapp_e164);

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        {/* Hero */}
        <section className="relative mb-6 overflow-hidden rounded-2xl bg-background">
          <div className="relative flex flex-col items-center px-4 pb-6 pt-8 sm:pt-10">
            {property.cover_photo_path ? (
              <div className="relative mb-4 aspect-[5/4] w-full overflow-hidden rounded-2xl sm:aspect-[16/10]">
                <Image
                  src={
                    property.cover_photo_path.startsWith("http") ||
                    property.cover_photo_path.startsWith("/")
                      ? property.cover_photo_path
                      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${property.cover_photo_path}`
                  }
                  alt={property.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 720px"
                  priority
                />
              </div>
            ) : (
              <Image
                src="/brand/logo-sinfondo.png"
                alt={property.name}
                width={280}
                height={280}
                className="mb-4 h-auto w-48 object-contain sm:w-64"
                priority
              />
            )}
            <div className="w-full text-center text-marron">
              <div className="mb-2 flex items-center justify-center gap-2">
                <Badge variant="secondary" className="bg-arena text-marron">
                  Tandil · centro
                </Badge>
              </div>
              <h1 className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                {property.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {property.tagline ?? "Escapada de finde con vista a las sierras."}
              </p>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: CalendarDays, label: "Finde", sub: "Vie a dom" },
            { icon: Users, label: "Hasta 3", sub: "personas" },
            { icon: Mountain, label: "Vista sierras", sub: "desde el balcón" },
            { icon: MapPin, label: "Centro", sub: "San Martín e Yrigoyen" },
          ].map((h) => (
            <Card key={h.label} className="bg-crema">
              <CardContent className="flex flex-col items-start gap-1 p-3">
                <h.icon className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-marron">{h.label}</p>
                <p className="text-xs text-muted-foreground">{h.sub}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Gallery */}
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-xl font-semibold">El depto</h2>
          <Gallery photos={photos} />
        </section>

        {/* Description */}
        {property.description && (
          <section className="mb-8">
            <h2 className="mb-2 font-serif text-xl font-semibold">Sobre el lugar</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 sm:text-base">
              {property.description}
            </p>
          </section>
        )}

        {/* Amenities */}
        {property.amenities.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 font-serif text-xl font-semibold">Qué incluye</h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {property.amenities.map((a) => {
                const Icon = amenityIcon(a);
                return (
                  <li
                    key={a}
                    className="flex items-center gap-2 rounded-lg bg-crema px-3 py-2 text-sm"
                  >
                    {Icon ? <Icon className="h-4 w-4 text-primary" /> : <span className="text-primary">•</span>}
                    {a}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Price */}
        <section className="mb-8">
          <Card className="border-primary/25 bg-gradient-to-br from-crema to-arena">
            <CardContent className="space-y-3 p-5">
              <h2 className="font-serif text-xl font-semibold">Precio</h2>
              <p className="text-3xl font-bold text-primary">
                {formatARS(property.price_per_night)}
                <span className="text-base font-normal text-muted-foreground"> / noche</span>
              </p>
              {property.weekend_pack_price != null && property.weekend_pack_price > 0 && (
                <p className="text-sm text-marron">
                  Pack finde (vie–dom):{" "}
                  <strong>{formatARS(property.weekend_pack_price)}</strong>
                </p>
              )}
              {property.cleaning_fee > 0 && (
                <p className="text-sm text-muted-foreground">
                  + limpieza {formatARS(property.cleaning_fee)}
                </p>
              )}
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/reservar">Ver disponibilidad</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Location */}
        <section className="mb-8">
          <h2 className="mb-2 font-serif text-xl font-semibold">Ubicación</h2>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {property.address_text ?? "San Martín e Yrigoyen, Tandil"}
          </p>
          {property.maps_url && (
            <a
              href={property.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Abrir en Google Maps <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </section>

        {/* Rules */}
        {property.house_rules && (
          <section className="mb-8">
            <h2 className="mb-2 font-serif text-xl font-semibold">Reglas de la casa</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {property.house_rules}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Check-in {property.check_in_time ?? "15:00"} · Check-out{" "}
              {property.check_out_time ?? "11:00"}
            </p>
          </section>
        )}

        <Separator className="mb-6" />

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="flex-1">
            <Link href="/reservar">Reservar finde</Link>
          </Button>
          {wa && (
            <Button asChild variant="whatsapp" size="lg" className="flex-1">
              <a href={wa} target="_blank" rel="noopener noreferrer">
                Escribime por WhatsApp
              </a>
            </Button>
          )}
        </div>
      </div>

      <StickyCta
        priceFrom={property.price_per_night}
        weekendPack={property.weekend_pack_price}
      />
    </>
  );
}
