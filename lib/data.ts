import type { Availability, Photo, Property, Reservation } from "@/lib/types";
import {
  DEMO_PHOTOS,
  DEMO_PROPERTY,
} from "@/lib/seed-data";
import {
  addDemoReservation,
  getDemoAvailability,
  getDemoReservations,
  setDemoAvailabilityDay,
  setDemoAvailabilityRange,
  updateDemoReservationStatus,
} from "@/lib/demo-store";
import { isSupabaseConfigured, createClient, createServiceClient } from "@/lib/supabase/server";

function parseAmenities(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) return p.filter((x): x is string => typeof x === "string");
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function mapProperty(row: Record<string, unknown>): Property {
  return {
    id: String(row.id),
    name: String(row.name ?? DEMO_PROPERTY.name),
    tagline: (row.tagline as string) ?? null,
    description: (row.description as string) ?? null,
    address_text: (row.address_text as string) ?? null,
    maps_url: (row.maps_url as string) ?? null,
    whatsapp_e164: (row.whatsapp_e164 as string) ?? null,
    capacity: Number(row.capacity ?? 3),
    price_per_night: Number(row.price_per_night ?? 0),
    weekend_pack_price:
      row.weekend_pack_price == null ? null : Number(row.weekend_pack_price),
    cleaning_fee: Number(row.cleaning_fee ?? 0),
    currency: String(row.currency ?? "ARS"),
    min_nights: Number(row.min_nights ?? 1),
    check_in_time: (row.check_in_time as string) ?? null,
    check_out_time: (row.check_out_time as string) ?? null,
    amenities: parseAmenities(row.amenities),
    house_rules: (row.house_rules as string) ?? null,
    cover_photo_path: (row.cover_photo_path as string) ?? null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

export async function getProperty(): Promise<Property> {
  if (!isSupabaseConfigured()) return DEMO_PROPERTY;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property").select("*").limit(1).maybeSingle();
    if (error || !data) return DEMO_PROPERTY;
    return mapProperty(data as Record<string, unknown>);
  } catch {
    return DEMO_PROPERTY;
  }
}

export async function getPhotos(): Promise<Photo[]> {
  if (!isSupabaseConfigured()) return DEMO_PHOTOS;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error || !data?.length) return DEMO_PHOTOS;
    return data as Photo[];
  } catch {
    return DEMO_PHOTOS;
  }
}

export async function getAvailability(): Promise<Availability[]> {
  if (!isSupabaseConfigured()) return getDemoAvailability();
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .gte("night_date", today)
      .order("night_date", { ascending: true });
    if (error || !data) return getDemoAvailability();
    return data as Availability[];
  } catch {
    return getDemoAvailability();
  }
}

export async function getActiveReservationsForBooking(): Promise<
  Pick<Reservation, "check_in" | "check_out" | "status" | "hold_until">[]
> {
  if (!isSupabaseConfigured()) {
    const all = await getDemoReservations();
    return all
      .filter((r) => r.status === "pending" || r.status === "confirmed")
      .map((r) => ({
        check_in: r.check_in,
        check_out: r.check_out,
        status: r.status,
        hold_until: r.hold_until,
      }));
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reservations")
      .select("check_in, check_out, status, hold_until")
      .in("status", ["pending", "confirmed"]);
    if (error || !data) return [];
    return data as Pick<Reservation, "check_in" | "check_out" | "status" | "hold_until">[];
  } catch {
    return [];
  }
}

export async function getReservationByCode(code: string): Promise<Reservation | null> {
  if (!isSupabaseConfigured()) {
    const all = await getDemoReservations();
    return all.find((r) => r.public_code.toUpperCase() === code.toUpperCase()) ?? null;
  }
  try {
    let supabase;
    try {
      supabase = createServiceClient();
    } catch {
      supabase = await createClient();
    }
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("public_code", code.toUpperCase())
      .maybeSingle();
    if (error || !data) return null;
    return data as Reservation;
  } catch {
    return null;
  }
}

export async function getAllReservations(): Promise<Reservation[]> {
  if (!isSupabaseConfigured()) return getDemoReservations();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as Reservation[];
}

export function photoPublicUrl(storagePath: string): string {
  if (storagePath.startsWith("/") || storagePath.startsWith("http")) {
    return storagePath;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return storagePath;
  return `${base}/storage/v1/object/public/property-photos/${storagePath}`;
}

/** Demo helpers re-exported for actions */
export {
  addDemoReservation,
  setDemoAvailabilityDay,
  setDemoAvailabilityRange,
  updateDemoReservationStatus,
};
