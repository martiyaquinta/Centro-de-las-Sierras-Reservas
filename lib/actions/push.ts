"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isAllowedAdminEmail } from "@/lib/admin-allowlist";
import { getVapidPublicKey } from "@/lib/web-push";
import type { ActionResult } from "@/lib/actions/reservations";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(200),
  }),
});

async function requireAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase no configurado");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  if (!isAllowedAdminEmail(user.email)) {
    await supabase.auth.signOut();
    throw new Error("No autorizado");
  }
  return { supabase, user };
}

export async function getPushPublicKeyAction(): Promise<
  ActionResult<{ publicKey: string }>
> {
  const key = getVapidPublicKey();
  if (!key) {
    return {
      ok: false,
      error:
        "Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en el entorno (Vercel o .env.local).",
    };
  }
  return { ok: true, data: { publicKey: key } };
}

export async function savePushSubscriptionAction(
  raw: unknown
): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Subscription inválida" };
  }
  try {
    const { supabase, user } = await requireAdminClient();
    const { endpoint, keys } = parsed.data;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_id: user.id,
        user_agent:
          typeof raw === "object" &&
          raw &&
          "userAgent" in raw &&
          typeof (raw as { userAgent?: string }).userAgent === "string"
            ? (raw as { userAgent: string }).userAgent.slice(0, 300)
            : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    revalidatePath("/admin/ajustes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function removePushSubscriptionAction(
  endpoint: string
): Promise<ActionResult> {
  if (!endpoint || endpoint.length > 2000) {
    return { ok: false, error: "Endpoint inválido" };
  }
  try {
    const { supabase } = await requireAdminClient();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    revalidatePath("/admin/ajustes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function getPushStatusAction(): Promise<
  ActionResult<{ count: number; vapidReady: boolean }>
> {
  try {
    const vapidReady = Boolean(getVapidPublicKey());
    if (!isSupabaseConfigured()) {
      return { ok: true, data: { count: 0, vapidReady } };
    }
    const { supabase } = await requireAdminClient();
    const { count, error } = await supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { count: count ?? 0, vapidReady } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
