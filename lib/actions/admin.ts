"use server";

import { revalidatePath } from "next/cache";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import {
  availabilityRangeSchema,
  propertyContentSchema,
  propertyPriceSchema,
} from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/reservations";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return supabase;
}

export async function updatePropertyContentAction(
  raw: unknown
): Promise<ActionResult> {
  const parsed = propertyContentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;
  const amenities = d.amenities
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const supabase = await requireAdmin();
    const { data: row } = await supabase.from("property").select("id").limit(1).maybeSingle();
    if (!row) return { ok: false, error: "No hay property configurada" };

    const { error } = await supabase
      .from("property")
      .update({
        name: d.name,
        tagline: d.tagline || null,
        description: d.description || null,
        address_text: d.address_text || null,
        maps_url: d.maps_url || null,
        whatsapp_e164: d.whatsapp_e164 || null,
        capacity: d.capacity,
        check_in_time: d.check_in_time || null,
        check_out_time: d.check_out_time || null,
        house_rules: d.house_rules || null,
        amenities,
      })
      .eq("id", row.id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/admin/contenido");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updatePropertyPriceAction(raw: unknown): Promise<ActionResult> {
  const parsed = propertyPriceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;
  try {
    const supabase = await requireAdmin();
    const { data: row } = await supabase.from("property").select("id").limit(1).maybeSingle();
    if (!row) return { ok: false, error: "No hay property configurada" };

    const weekend =
      d.weekend_pack_price === "" || d.weekend_pack_price == null
        ? null
        : Number(d.weekend_pack_price);

    const { error } = await supabase
      .from("property")
      .update({
        price_per_night: d.price_per_night,
        weekend_pack_price: weekend,
        cleaning_fee: d.cleaning_fee,
        currency: d.currency,
        min_nights: d.min_nights,
      })
      .eq("id", row.id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/reservar");
    revalidatePath("/admin/precio");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function setAvailabilityRangeAction(raw: unknown): Promise<ActionResult> {
  const parsed = availabilityRangeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Rango inválido" };
  }
  const { from, to, status, note } = parsed.data;
  try {
    const supabase = await requireAdmin();
    const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
    const rows = days.map((d) => ({
      night_date: format(d, "yyyy-MM-dd"),
      status,
      note: note || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("availability").upsert(rows, {
      onConflict: "night_date",
    });
    if (error) return { ok: false, error: error.message };

    revalidatePath("/reservar");
    revalidatePath("/admin/calendario");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function toggleAvailabilityDayAction(
  nightDate: string,
  nextStatus: "available" | "blocked"
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("availability").upsert(
      {
        night_date: nightDate,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "night_date" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/reservar");
    revalidatePath("/admin/calendario");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function uploadPhotoAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await requireAdmin();
    const file = formData.get("file");
    if (!(file instanceof File)) return { ok: false, error: "Archivo requerido" };
    if (file.size > 8 * 1024 * 1024) return { ok: false, error: "Máx 8MB" };

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `gallery/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from("property-photos")
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (upErr) return { ok: false, error: upErr.message };

    const { data: maxRow } = await supabase
      .from("photos")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sort = (maxRow?.sort_order ?? -1) + 1;
    const alt = String(formData.get("alt") ?? "");

    const { data, error } = await supabase
      .from("photos")
      .insert({ storage_path: path, alt: alt || null, sort_order: sort, is_cover: false })
      .select("id")
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/admin/fotos");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deletePhotoAction(id: string, storagePath: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (!storagePath.startsWith("/")) {
      await supabase.storage.from("property-photos").remove([storagePath]);
    }
    const { error } = await supabase.from("photos").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/admin/fotos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function setCoverPhotoAction(id: string, storagePath: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    await supabase.from("photos").update({ is_cover: false }).neq("id", id);
    const { error } = await supabase.from("photos").update({ is_cover: true }).eq("id", id);
    if (error) return { ok: false, error: error.message };

    const { data: prop } = await supabase.from("property").select("id").limit(1).maybeSingle();
    if (prop) {
      await supabase.from("property").update({ cover_photo_path: storagePath }).eq("id", prop.id);
    }

    revalidatePath("/");
    revalidatePath("/admin/fotos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function reorderPhotoAction(id: string, direction: "up" | "down"): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { data: photos } = await supabase
      .from("photos")
      .select("id, sort_order")
      .order("sort_order", { ascending: true });
    if (!photos?.length) return { ok: false, error: "Sin fotos" };

    const idx = photos.findIndex((p) => p.id === id);
    if (idx < 0) return { ok: false, error: "Foto no encontrada" };
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= photos.length) return { ok: true };

    const a = photos[idx];
    const b = photos[swapIdx];
    await supabase.from("photos").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("photos").update({ sort_order: a.sort_order }).eq("id", b.id);

    revalidatePath("/");
    revalidatePath("/admin/fotos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function loginAction(
  email: string,
  password: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/admin");
}
