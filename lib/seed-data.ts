import type { Availability, Photo, Property, Reservation } from "@/lib/types";
import { addDays, format, getDay, startOfDay } from "date-fns";

export const DEMO_PROPERTY: Property = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Departamento de las Sierras",
  tagline: "Una estadía cálida en el centro de Tandil, cerquita de todo.",
  description:
    "Hola! Departamento de las Sierras te ofrece una cálida estadía en Tandil con la mejor ubicación, cerquita de todo!! Centro, dique, parque y calvario.\n\nEstá equipado para 2 a 3 personas máximo (2 adultos y un menor).",
  address_text: "San Martín e Yrigoyen, Tandil",
  maps_url: "https://maps.google.com/?q=San+Martin+e+Yrigoyen,+Tandil",
  whatsapp_e164: "5492266515776",
  capacity: 3,
  price_per_night: 50,
  weekend_pack_price: 100,
  cleaning_fee: 0,
  currency: "USD",
  min_nights: 2,
  check_in_time: "15:00",
  check_out_time: "11:00",
  amenities: [
    "Cama de 2 plazas",
    "Sillón sofá cama",
    "Placard",
    "Baño con ducha (agua fría y caliente)",
    "Cocina",
    "Heladera",
    "Vajilla completa",
    "Calefacción",
    "Microondas",
    "TV 42\" con cable (Cablevisión)",
    "TV 32\" en el dormitorio",
    "Internet WiFi",
  ],
  house_rules:
    "No se aceptan mascotas. No fumar dentro del depto. Sin fiestas. Solo sábados, domingos y findes largos. Check-in desde las 15:00, check-out hasta las 11:00. Respetá a los vecinos.",
  cover_photo_path: "/photos/depto-hero.jpg",
  updated_at: new Date().toISOString(),
};

export const DEMO_PHOTOS: Photo[] = [
  {
    id: "photo-1",
    storage_path: "/photos/depto-01.jpg",
    alt: "Departamento de las Sierras — living",
    sort_order: 0,
    is_cover: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "photo-2",
    storage_path: "/photos/depto-02.jpg",
    alt: "Departamento de las Sierras — ambiente",
    sort_order: 1,
    is_cover: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "photo-3",
    storage_path: "/photos/depto-03.jpg",
    alt: "Departamento de las Sierras — detalle",
    sort_order: 2,
    is_cover: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "photo-4",
    storage_path: "/photos/depto-04.jpg",
    alt: "Departamento de las Sierras — vista",
    sort_order: 3,
    is_cover: false,
    created_at: new Date().toISOString(),
  },
];

/** Próximos ~12 findes: sáb+dom available; resto blocked. Puentes: abrir a mano en admin. */
export function buildDemoAvailability(weeks = 12): Availability[] {
  const rows: Availability[] = [];
  const start = startOfDay(new Date());
  const end = addDays(start, weeks * 7 + 7);

  for (let d = start; d <= end; d = addDays(d, 1)) {
    const day = getDay(d); // 0 dom ... 5 vie 6 sab
    const night_date = format(d, "yyyy-MM-dd");
    // available: sábado (6) y domingo (0) — 2 noches del finde (check-in sáb → check-out lun)
    const status = day === 6 || day === 0 ? "available" : "blocked";
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
