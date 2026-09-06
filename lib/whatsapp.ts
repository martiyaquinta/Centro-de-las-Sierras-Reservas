import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function normalizeWhatsAppE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

export function buildWhatsAppUrl(params: {
  phoneE164: string | null | undefined;
  guestName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  publicCode: string;
  totalAmount?: number;
}): string | null {
  const phone = normalizeWhatsAppE164(params.phoneE164);
  if (!phone) return null;

  const inFmt = format(parseISO(params.checkIn), "d MMM yyyy", { locale: es });
  const outFmt = format(parseISO(params.checkOut), "d MMM yyyy", { locale: es });

  const lines = [
    `Hola! Soy ${params.guestName}.`,
    `Quiero reservar Departamento de las Sierras.`,
    `Check-in: ${inFmt}`,
    `Check-out: ${outFmt}`,
    `Huéspedes: ${params.guests}`,
    `Código: ${params.publicCode}`,
  ];
  if (params.totalAmount != null) {
    lines.push(
      `Total estimado: USD ${params.totalAmount.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`
    );
  }
  lines.push("¡Gracias!");

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${phone}?text=${text}`;
}

export function buildGenericWhatsAppUrl(
  phoneE164: string | null | undefined,
  message = "Hola! Quiero consultar por el Departamento de las Sierras."
): string | null {
  const phone = normalizeWhatsAppE164(phoneE164);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
