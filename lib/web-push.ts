import webpush from "web-push";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function vapidConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.ADMIN_NOTIFY_EMAIL?.trim() ||
    "mailto:centrodelassierras@gmail.com";
  webpush.setVapidDetails(
    subject.startsWith("mailto:") || subject.startsWith("http")
      ? subject
      : `mailto:${subject}`,
    publicKey,
    privateKey
  );
  return true;
}

/** Envía push a todas las subs admin. Nunca tira. */
export async function notifyAdminPush(payload: PushPayload): Promise<{
  ok: boolean;
  sent: number;
  error?: string;
}> {
  if (!vapidConfigured()) {
    console.warn("[push] VAPID keys ausentes — skip push");
    return { ok: false, sent: 0, error: "VAPID ausente" };
  }
  if (!isSupabaseConfigured()) {
    return { ok: false, sent: 0, error: "Supabase no configurado" };
  }
  if (!configureWebPush()) {
    return { ok: false, sent: 0, error: "VAPID inválido" };
  }

  try {
    const supabase = createServiceClient();
    const { data: rows, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");
    if (error) {
      console.error("[push] list error", error.message);
      return { ok: false, sent: 0, error: error.message };
    }
    if (!rows?.length) {
      console.info("[push] sin subscriptions");
      return { ok: true, sent: 0 };
    }

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/admin/reservas",
      tag: payload.tag || "sierras-reserva",
    });

    let sent = 0;
    for (const row of rows) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          { TTL: 60 * 60 * 12, urgency: "high" }
        );
        sent++;
      } catch (e: unknown) {
        const status =
          e && typeof e === "object" && "statusCode" in e
            ? Number((e as { statusCode: number }).statusCode)
            : 0;
        console.error("[push] send fail", status, row.endpoint.slice(0, 48));
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", row.id);
        }
      }
    }
    console.info("[push] sent", sent, "/", rows.length);
    return { ok: sent > 0 || rows.length === 0, sent };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error push";
    console.error("[push] exception", msg);
    return { ok: false, sent: 0, error: msg };
  }
}
