import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { formatMoney } from "@/lib/utils";

export type ReservationNotifyPayload = {
  publicCode: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string | null;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalAmount: number;
  currency: string;
  message?: string | null;
};

function fmtDate(isoDate: string) {
  try {
    return format(parseISO(isoDate), "EEEE d MMM yyyy", { locale: es });
  } catch {
    return isoDate;
  }
}

export function buildReservationEmail(p: ReservationNotifyPayload): {
  subject: string;
  text: string;
  html: string;
} {
  const inLabel = fmtDate(p.checkIn);
  const outLabel = fmtDate(p.checkOut);
  const total = formatMoney(p.totalAmount, p.currency || "USD");
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  const adminUrl = site ? `${site}/admin/reservas` : "/admin/reservas";

  const subject = `Nueva reserva ${p.publicCode} — ${p.guestName}`;

  const lines = [
    "Nueva solicitud de reserva — Departamento de las Sierras",
    "",
    `Código: ${p.publicCode}`,
    `Huésped: ${p.guestName}`,
    `Tel / WhatsApp: ${p.guestPhone}`,
    p.guestEmail ? `Email: ${p.guestEmail}` : null,
    `Check-in: ${inLabel} (${p.checkIn})`,
    `Check-out: ${outLabel} (${p.checkOut})`,
    `Noches: ${p.nights}`,
    `Huéspedes: ${p.guests}`,
    `Total estimado: ${total}`,
    p.message ? `Mensaje: ${p.message}` : null,
    "",
    `Revisar en admin: ${adminUrl}`,
    "",
    "Estado: pendiente (hold 48h hasta confirmar o rechazar).",
  ].filter(Boolean) as string[];

  const text = lines.join("\n");

  const html = `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#3c2a21;background:#faf6f0;padding:24px;border-radius:12px;border:1px solid #e8d5c4">
    <h1 style="font-size:22px;margin:0 0 8px">Nueva reserva</h1>
    <p style="margin:0 0 16px;color:#7a8471">Departamento de las Sierras · solicitud pendiente</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px">
      <tr><td style="padding:6px 0;color:#7a8471">Código</td><td style="padding:6px 0;font-weight:700">${p.publicCode}</td></tr>
      <tr><td style="padding:6px 0;color:#7a8471">Huésped</td><td style="padding:6px 0">${escapeHtml(p.guestName)}</td></tr>
      <tr><td style="padding:6px 0;color:#7a8471">WhatsApp</td><td style="padding:6px 0"><a href="https://wa.me/${p.guestPhone.replace(/\D/g, "")}">${escapeHtml(p.guestPhone)}</a></td></tr>
      ${p.guestEmail ? `<tr><td style="padding:6px 0;color:#7a8471">Email</td><td style="padding:6px 0">${escapeHtml(p.guestEmail)}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#7a8471">Check-in</td><td style="padding:6px 0">${inLabel}</td></tr>
      <tr><td style="padding:6px 0;color:#7a8471">Check-out</td><td style="padding:6px 0">${outLabel}</td></tr>
      <tr><td style="padding:6px 0;color:#7a8471">Noches / huéspedes</td><td style="padding:6px 0">${p.nights} · ${p.guests}</td></tr>
      <tr><td style="padding:6px 0;color:#7a8471">Total estimado</td><td style="padding:6px 0;font-weight:700;color:#c47a4a">${total}</td></tr>
      ${p.message ? `<tr><td style="padding:6px 0;color:#7a8471;vertical-align:top">Mensaje</td><td style="padding:6px 0">${escapeHtml(p.message)}</td></tr>` : ""}
    </table>
    <p style="margin:20px 0 0">
      <a href="${adminUrl}" style="display:inline-block;background:#c47a4a;color:#faf6f0;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">
        Abrir en admin
      </a>
    </p>
  </div>`.trim();

  return { subject, text, html };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Envía mail al admin. Nunca tira: loguea y sigue. */
export async function notifyAdminNewReservation(
  payload: ReservationNotifyPayload
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFY_EMAIL || "centrodelassierras@gmail.com";
  const from =
    process.env.RESEND_FROM_EMAIL ||
    "Departamento de las Sierras <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[notify] RESEND_API_KEY ausente — no se envió mail de reserva", payload.publicCode);
    return { ok: false, error: "RESEND_API_KEY ausente" };
  }

  const { subject, text, html } = buildReservationEmail(payload);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof body === "object" && body && "message" in body
          ? String((body as { message: string }).message)
          : `HTTP ${res.status}`;
      console.error("[notify] Resend error", msg, body);
      return { ok: false, error: msg };
    }
    console.info("[notify] mail ok", payload.publicCode, "→", to);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error de red";
    console.error("[notify] exception", msg);
    return { ok: false, error: msg };
  }
}
