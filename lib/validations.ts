import { z } from "zod";

export const createReservationSchema = z
  .object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
    guests: z.coerce.number().int().min(1).max(3),
    guestName: z.string().trim().min(2, "Ingresá tu nombre").max(120),
    guestEmail: z
      .string()
      .trim()
      .email("Email inválido")
      .optional()
      .or(z.literal("")),
    guestPhone: z
      .string()
      .trim()
      .min(8, "Teléfono requerido")
      .max(30)
      .regex(/^[+\d\s()-]+$/, "Teléfono inválido"),
    message: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Check-out debe ser después del check-in",
    path: ["checkOut"],
  });

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const propertyContentSchema = z.object({
  name: z.string().min(2).max(120),
  tagline: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  address_text: z.string().max(300).optional().or(z.literal("")),
  maps_url: z.string().url().optional().or(z.literal("")),
  whatsapp_e164: z.string().max(20).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(10),
  check_in_time: z.string().max(10).optional().or(z.literal("")),
  check_out_time: z.string().max(10).optional().or(z.literal("")),
  house_rules: z.string().max(5000).optional().or(z.literal("")),
  amenities: z.string().max(2000),
});

export const propertyPriceSchema = z.object({
  price_per_night: z.coerce.number().min(0),
  weekend_pack_price: z.coerce.number().min(0).optional().or(z.literal("")),
  cleaning_fee: z.coerce.number().min(0),
  currency: z.string().min(3).max(3),
  min_nights: z.coerce.number().int().min(1).max(30),
});

export const availabilityRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["available", "blocked"]),
  note: z.string().max(200).optional().or(z.literal("")),
});

export const reservationStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["confirmed", "rejected", "cancelled"]),
  admin_note: z.string().max(1000).optional().or(z.literal("")),
});
