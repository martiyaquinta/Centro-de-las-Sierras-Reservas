import type { Availability, Photo, Property, Reservation } from "@/lib/types";
import { addDays, format, getDay, startOfDay } from "date-fns";

export const DEMO_PROPERTY: Property = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Departamento de las Sierras",
  tagline: "Escapada de finde con vista a las sierras, en pleno centro.",
  description:
    "Un depto cálido en el centro de Tandil, a pasos de todo. Desde el balcón mirás las sierras mientras el barrio se queda en silencio. Ideal para parejas o grupos chicos que buscan desconectar sin alejarse de bares, cafés y la peatonal.",
  address_text: "San Martín e Yrigoyen, Tandil",
  maps_url: "https://maps.google.com/?q=San+Martin+e+Yrigoyen,+Tandil",
  whatsapp_e164: "5492494000000",
  capacity: 3,
  price_per_night: 85000,
  weekend_pack_price: 160000,
  cleaning_fee: 0,
  currency: "ARS",
  min_nights: 1,
  check_in_time: "15:00",
  check_out_time: "11:00",
  amenities: [
    "WiFi",
    "Cocina equipada",
    "Ropa de cama",
    "Toallas",
    "Calefacción",
    "Balcón con vista a las sierras",
    "TV",
    "Agua caliente",
  ],
  house_rules:
    "No fumar dentro del depto. Sin fiestas. Mascotas a consultar. Check-in desde las 15:00, check-out hasta las 11:00. Respetá a los vecinos.",
  cover_photo_path: null,
  updated_at: new Date().toISOString(),
};

export const DEMO_PHOTOS: Photo[] = [
  {
    id: "photo-1",
    storage_path: "/brand/logo-beige.png",
    alt: "Departamento de las Sierras",
    sort_order: 0,
    is_cover: true,
    created_at: new Date().toISOString(),
  },
];

/** Próximos ~12 findes: vie+sáb available; resto blocked */
export function buildDemoAvailability(weeks = 12): Availability[] {
  const rows: Availability[] = [];
  const start = startOfDay(new Date());
  const end = addDays(start, weeks * 7 + 7);

  for (let d = start; d <= end; d = addDays(d, 1)) {
    const day = getDay(d); // 0 dom ... 5 vie 6 sab
    const night_date = format(d, "yyyy-MM-dd");
    // available: viernes (5) y sábado (6) — noches del finde
    const status = day === 5 || day === 6 ? "available" : "blocked";
    rows.push({
      night_date,
      status,
      note: null,
      updated_at: new Date().toISOString(),
    });
  }
  return rows;
}

export const DEMO_RESERVATIONS: Reservation[] = [];
