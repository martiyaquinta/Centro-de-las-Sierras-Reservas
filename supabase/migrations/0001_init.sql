-- Departamento de las Sierras — schema inicial
-- Convención: night_date = fecha de la noche que se duerme (check-in de esa noche).
-- reservations.check_out es exclusive (como hotels): noches = check_out - check_in.

create extension if not exists pgcrypto;

create table public.property (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Departamento de las Sierras',
  tagline text,
  description text,
  address_text text default 'San Martín e Yrigoyen, Tandil',
  maps_url text,
  whatsapp_e164 text,
  capacity int not null default 3 check (capacity > 0 and capacity <= 10),
  price_per_night numeric(12,2) not null default 0,
  weekend_pack_price numeric(12,2),
  cleaning_fee numeric(12,2) not null default 0,
  currency text not null default 'ARS',
  min_nights int not null default 1,
  check_in_time text default '15:00',
  check_out_time text default '11:00',
  amenities jsonb not null default '[]'::jsonb,
  house_rules text,
  cover_photo_path text,
  updated_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  alt text,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.availability (
  night_date date primary key,
  status text not null check (status in ('available','blocked')),
  note text,
  updated_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  check_in date not null,
  check_out date not null,
  guests int not null check (guests between 1 and 10),
  guest_name text not null,
  guest_email text,
  guest_phone text not null,
  message text,
  nights int not null,
  total_amount numeric(12,2) not null,
  currency text not null default 'ARS',
  status text not null default 'pending'
    check (status in ('pending','confirmed','rejected','cancelled','expired')),
  hold_until timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);

create index reservations_status_check_in_idx on public.reservations (status, check_in);
create index photos_sort_order_idx on public.photos (sort_order);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger property_updated_at before update on public.property
  for each row execute function public.set_updated_at();
create trigger availability_updated_at before update on public.availability
  for each row execute function public.set_updated_at();
create trigger reservations_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

-- RLS
alter table public.property enable row level security;
alter table public.photos enable row level security;
alter table public.availability enable row level security;
alter table public.reservations enable row level security;

-- Public read
create policy "property_public_read" on public.property for select using (true);
create policy "photos_public_read" on public.photos for select using (true);
create policy "availability_public_read" on public.availability for select using (true);

-- Admin full access (authenticated)
create policy "property_admin_all" on public.property for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "photos_admin_all" on public.photos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "availability_admin_all" on public.availability for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "reservations_admin_all" on public.reservations for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Public insert reservations is done via service role server action (not open RLS insert)

-- Storage bucket (run in dashboard or via API):
-- insert into storage.buckets (id, name, public) values ('property-photos', 'property-photos', true);
-- policy: public read, authenticated write

-- Seed property
insert into public.property (
  name, tagline, description, address_text, maps_url, whatsapp_e164,
  capacity, price_per_night, weekend_pack_price, cleaning_fee, currency, min_nights,
  check_in_time, check_out_time, amenities, house_rules
) values (
  'Departamento de las Sierras',
  'Escapada de finde con vista a las sierras, en pleno centro.',
  'Un depto cálido en el centro de Tandil, a pasos de todo. Desde el balcón mirás las sierras mientras el barrio se queda en silencio. Ideal para parejas o grupos chicos que buscan desconectar sin alejarse de bares, cafés y la peatonal.',
  'San Martín e Yrigoyen, Tandil',
  'https://maps.google.com/?q=San+Martin+e+Yrigoyen,+Tandil',
  '5492494000000',
  3,
  85000,
  160000,
  0,
  'ARS',
  1,
  '15:00',
  '11:00',
  '["WiFi","Cocina equipada","Ropa de cama","Toallas","Calefacción","Balcón con vista a las sierras","TV","Agua caliente"]'::jsonb,
  'No fumar dentro del depto. Sin fiestas. Mascotas a consultar. Check-in desde las 15:00, check-out hasta las 11:00. Respetá a los vecinos.'
);

-- Seed availability: próximos 12 findes (vie+sáb available), weekdays blocked
do $$
declare
  d date := current_date;
  end_d date := current_date + interval '90 days';
  dow int;
begin
  while d <= end_d loop
    dow := extract(dow from d); -- 0=dom ... 5=vie 6=sab
    insert into public.availability (night_date, status)
    values (
      d,
      case when dow in (5, 6) then 'available' else 'blocked' end
    )
    on conflict (night_date) do nothing;
    d := d + 1;
  end loop;
end $$;
