export type AvailabilityStatus = "available" | "blocked";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "expired";

export type Property = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  address_text: string | null;
  maps_url: string | null;
  whatsapp_e164: string | null;
  capacity: number;
  price_per_night: number;
  weekend_pack_price: number | null;
  cleaning_fee: number;
  currency: string;
  min_nights: number;
  check_in_time: string | null;
  check_out_time: string | null;
  amenities: string[];
  house_rules: string | null;
  cover_photo_path: string | null;
  updated_at: string;
};

export type Photo = {
  id: string;
  storage_path: string;
  alt: string | null;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
};

export type Availability = {
  night_date: string;
  status: AvailabilityStatus;
  note: string | null;
  updated_at: string;
};

export type Reservation = {
  id: string;
  public_code: string;
  check_in: string;
  check_out: string;
  guests: number;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string;
  message: string | null;
  nights: number;
  total_amount: number;
  currency: string;
  status: ReservationStatus;
  hold_until: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};
