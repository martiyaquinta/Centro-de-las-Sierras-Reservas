import { promises as fs } from "fs";
import path from "path";
import type { Availability, AvailabilityStatus, Reservation } from "@/lib/types";
import { buildDemoAvailability } from "@/lib/seed-data";

const STORE_PATH = path.join(process.cwd(), ".data", "demo-store.json");

export type DemoStore = {
  availabilityOverrides: Record<string, AvailabilityStatus>;
  reservations: Reservation[];
};

const emptyStore = (): DemoStore => ({
  availabilityOverrides: {},
  reservations: [],
});

async function ensureStore(): Promise<DemoStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DemoStore>;
    return {
      availabilityOverrides: parsed.availabilityOverrides ?? {},
      reservations: parsed.reservations ?? [],
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: DemoStore): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

/** Seed vie+sáb hasta fin 2026 + overrides del admin (available/blocked). */
export async function getDemoAvailability(endDate = "2026-12-31"): Promise<Availability[]> {
  const store = await ensureStore();
  const base = buildDemoAvailability(endDate);
  const byDate = new Map(base.map((a) => [a.night_date, a]));

  for (const [night_date, status] of Object.entries(store.availabilityOverrides)) {
    byDate.set(night_date, {
      night_date,
      status,
      note: status === "blocked" ? "bloqueado admin" : "abierto admin",
      updated_at: new Date().toISOString(),
    });
  }

  return [...byDate.values()].sort((a, b) => a.night_date.localeCompare(b.night_date));
}

export async function setDemoAvailabilityRange(
  from: string,
  to: string,
  status: AvailabilityStatus,
  dates: string[]
): Promise<void> {
  const store = await ensureStore();
  for (const d of dates) {
    store.availabilityOverrides[d] = status;
  }
  // keep from/to for clarity in file
  void from;
  void to;
  await writeStore(store);
}

export async function setDemoAvailabilityDay(
  nightDate: string,
  status: AvailabilityStatus
): Promise<void> {
  const store = await ensureStore();
  store.availabilityOverrides[nightDate] = status;
  await writeStore(store);
}

export async function getDemoReservations(): Promise<Reservation[]> {
  const store = await ensureStore();
  return [...store.reservations].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addDemoReservation(row: Reservation): Promise<Reservation> {
  const store = await ensureStore();
  store.reservations.unshift(row);
  await writeStore(store);
  return row;
}

export async function updateDemoReservationStatus(
  id: string,
  status: Reservation["status"],
  adminNote?: string | null
): Promise<boolean> {
  const store = await ensureStore();
  const idx = store.reservations.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  store.reservations[idx] = {
    ...store.reservations[idx],
    status,
    admin_note: adminNote ?? store.reservations[idx].admin_note,
    hold_until:
      status === "confirmed" || status === "rejected" || status === "cancelled"
        ? null
        : store.reservations[idx].hold_until,
    updated_at: new Date().toISOString(),
  };
  await writeStore(store);
  return true;
}
