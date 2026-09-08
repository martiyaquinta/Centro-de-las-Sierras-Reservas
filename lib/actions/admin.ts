"use server";

import { revalidatePath } from "next/cache";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import {
  availabilityRangeSchema,
  propertyContentSchema,
  propertyPriceSchema,
} from "@/lib/validations";
import {
  createClient,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import {
  setDemoAvailabilityDay,
  setDemoAvailabilityRange,
} from "@/lib/data";
import {
  isAllowedAdminEmail,
  normalizeAdminEmail,
} from "@/lib/admin-allowlist";
import type { ActionResult } from "@/lib/actions/reservations";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  if (!isAllowedAdminEmail(user.email)) {
    await supabase.auth.signOut();
    throw new Error("No autorizado");
  }
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
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        error:
          "Supabase no configurado: no se puede persistir el precio. Completá .env.local / env de Vercel.",
      };
    }

    await requireAdmin();
    // service role: evita fallos RLS raros; ya validamos admin arriba
    const supabase = createServiceClient();
    const { data: row } = await supabase.from("property").select("id").limit(1).maybeSingle();
    if (!row) return { ok: false, error: "No hay property configurada" };

    const currency = (d.currency || "ARS").toUpperCase();

    const { error } = await supabase
      .from("property")
      .update({
        price_per_night: d.price_per_night,
        // Pack finde desactivado
        weekend_pack_price: null,
        cleaning_fee: d.cleaning_fee,
        currency,
        min_nights: d.min_nights,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (error) return { ok: false, error: error.message };
    revalidatePath("/");
    revalidatePath("/reservar");
    revalidatePath("/admin");
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
    const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) });
    const dates = days.map((d) => format(d, "yyyy-MM-dd"));

    if (!isSupabaseConfigured()) {
      await setDemoAvailabilityRange(from, to, status, dates);
      revalidatePath("/reservar");
      revalidatePath("/admin/calendario");
      revalidatePath("/admin");
      revalidatePath("/");
      return { ok: true };
    }

    const supabase = await requireAdmin();
    const rows = dates.map((night_date) => ({
      night_date,
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
    revalidatePath("/admin");
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
    if (!isSupabaseConfigured()) {
      await setDemoAvailabilityDay(nightDate, nextStatus);
      revalidatePath("/reservar");
      revalidatePath("/admin/calendario");
      revalidatePath("/admin");
      return { ok: true };
    }

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
    revalidatePath("/admin");
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
  const normalized = normalizeAdminEmail(email);
  if (!isAllowedAdminEmail(normalized)) {
    return { ok: false, error: "Este email no está autorizado como admin" };
  }

  const adminPassword = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!adminPassword) {
    return {
      ok: false,
      error:
        "Falta ADMIN_PASSWORD (local: .env.local · Vercel: Project → Settings → Environment Variables). Guardala, redeploy y probá de nuevo.",
    };
  }
  if (password !== adminPassword) {
    return { ok: false, error: "Credenciales inválidas" };
  }

  try {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        error:
          "Supabase no configurado en este entorno. Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (local: .env.local · deploy: env del hosting). Reiniciá el server después de guardarlas.",
      };
    }

    const service = createServiceClient();
    const { data: listed, error: listError } =
      await service.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) return { ok: false, error: listError.message };

    const existing = listed.users.find(
      (u) => normalizeAdminEmail(u.email ?? "") === normalized
    );

    if (!existing) {
      const { error: createError } = await service.auth.admin.createUser({
        email: normalized,
        password: adminPassword,
        email_confirm: true,
      });
      if (createError) return { ok: false, error: createError.message };
    } else {
      const { error: updateError } = await service.auth.admin.updateUserById(
        existing.id,
        { password: adminPassword }
      );
      if (updateError) return { ok: false, error: updateError.message };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password: adminPassword,
    });
    if (error) return { ok: false, error: error.message };
    if (!isAllowedAdminEmail(data.user?.email)) {
      await supabase.auth.signOut();
      return { ok: false, error: "Este email no está autorizado como admin" };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de login";
    return { ok: false, error: msg };
  }
}

/** Registro público deshabilitado: solo existe el admin pre-creado. */
export async function registerAdminAction(): Promise<ActionResult> {
  return { ok: false, error: "El registro de admin está deshabilitado" };
}

export async function logoutAction(): Promise<void> {
  if (!isSupabaseConfigured()) {
    revalidatePath("/admin");
    return;
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/admin");
}
