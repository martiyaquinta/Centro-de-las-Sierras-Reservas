-- Departamento de las Sierras — schema inicial (idempotente donde se puede)
-- night_date = noche que se duerme. check_out exclusive.

create extension if not exists pgcrypto;

create table if not exists public.property (
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
  currency text not null default 'USD',
  min_nights int not null default 2,
  check_in_time text default '15:00',
  check_out_time text default '11:00',
  amenities jsonb not null default '[]'::jsonb,
  house_rules text,
  cover_photo_path text,
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  alt text,
  sort_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.availability (
  night_date date primary key,
  status text not null check (status in ('available','blocked')),
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
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
  currency text not null default 'USD',
  status text not null default 'pending'
    check (status in ('pending','confirmed','rejected','cancelled','expired')),
  hold_until timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);

create index if not exists reservations_status_check_in_idx on public.reservations (status, check_in);
create index if not exists photos_sort_order_idx on public.photos (sort_order);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists property_updated_at on public.property;
create trigger property_updated_at before update on public.property
  for each row execute function public.set_updated_at();
drop trigger if exists availability_updated_at on public.availability;
create trigger availability_updated_at before update on public.availability
  for each row execute function public.set_updated_at();
drop trigger if exists reservations_updated_at on public.reservations;
create trigger reservations_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();

alter table public.property enable row level security;
alter table public.photos enable row level security;
alter table public.availability enable row level security;
alter table public.reservations enable row level security;

drop policy if exists "property_public_read" on public.property;
create policy "property_public_read" on public.property for select using (true);
drop policy if exists "photos_public_read" on public.photos;
create policy "photos_public_read" on public.photos for select using (true);
drop policy if exists "availability_public_read" on public.availability;
create policy "availability_public_read" on public.availability for select using (true);

drop policy if exists "property_admin_all" on public.property;
create policy "property_admin_all" on public.property for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "photos_admin_all" on public.photos;
create policy "photos_admin_all" on public.photos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "availability_admin_all" on public.availability;
create policy "availability_admin_all" on public.availability for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "reservations_admin_all" on public.reservations;
create policy "reservations_admin_all" on public.reservations for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Storage bucket + policies
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read property photos" on storage.objects;
create policy "Public read property photos"
on storage.objects for select
using (bucket_id = 'property-photos');

drop policy if exists "Auth upload property photos" on storage.objects;
create policy "Auth upload property photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'property-photos');

drop policy if exists "Auth update property photos" on storage.objects;
create policy "Auth update property photos"
on storage.objects for update
to authenticated
using (bucket_id = 'property-photos');

drop policy if exists "Auth delete property photos" on storage.objects;
create policy "Auth delete property photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'property-photos');

-- Service role uploads (server actions) also need insert via service role (bypasses RLS)

-- Seed / upsert property (single row)
insert into public.property (
  name, tagline, description, address_text, maps_url, whatsapp_e164,
  capacity, price_per_night, weekend_pack_price, cleaning_fee, currency, min_nights,
  check_in_time, check_out_time, amenities, house_rules, cover_photo_path
)
select
  'Departamento de las Sierras',
  'Una estadía cálida en el centro de Tandil, cerquita de todo.',
  E'Hola! Departamento de las Sierras te ofrece una cálida estadía en Tandil con la mejor ubicación, cerquita de todo!! Centro, dique, parque y calvario.\n\nEstá equipado para 2 a 3 personas máximo (2 adultos y un menor).',
  'San Martín e Yrigoyen, Tandil',
  'https://maps.google.com/?q=San+Martin+e+Yrigoyen,+Tandil',
  '5492266515776',
  3,
  50,
  100,
  0,
  'USD',
  2,
  '15:00',
  '11:00',
  '["Cama de 2 plazas","Sillón sofá cama","Placard","Baño con ducha (agua fría y caliente)","Cocina","Heladera","Vajilla completa","Calefacción","Microondas","TV 42\" con cable (Cablevisión)","TV 32\" en el dormitorio","Internet WiFi"]'::jsonb,
  'No se aceptan mascotas. No fumar dentro del depto. Sin fiestas. Solo sábados, domingos y findes largos. Check-in desde las 15:00, check-out hasta las 11:00. Respetá a los vecinos.',
  null
where not exists (select 1 from public.property limit 1);

update public.property set
  tagline = 'Una estadía cálida en el centro de Tandil, cerquita de todo.',
  description = E'Hola! Departamento de las Sierras te ofrece una cálida estadía en Tandil con la mejor ubicación, cerquita de todo!! Centro, dique, parque y calvario.\n\nEstá equipado para 2 a 3 personas máximo (2 adultos y un menor).',
  whatsapp_e164 = '5492266515776',
  price_per_night = 50,
  weekend_pack_price = 100,
  cleaning_fee = 0,
  currency = 'USD',
  min_nights = 2,
  amenities = '["Cama de 2 plazas","Sillón sofá cama","Placard","Baño con ducha (agua fría y caliente)","Cocina","Heladera","Vajilla completa","Calefacción","Microondas","TV 42\" con cable (Cablevisión)","TV 32\" en el dormitorio","Internet WiFi"]'::jsonb,
  house_rules = 'No se aceptan mascotas. No fumar dentro del depto. Sin fiestas. Solo sábados, domingos y findes largos. Check-in desde las 15:00, check-out hasta las 11:00. Respetá a los vecinos.';

-- Availability: sáb+dom available; weekdays blocked. Puentes: abrir en admin.
do $$
declare
  d date := current_date;
  end_d date := current_date + interval '120 days';
  dow int;
begin
  while d <= end_d loop
    dow := extract(dow from d); -- 0=dom ... 6=sab
    insert into public.availability (night_date, status)
    values (
      d,
      case when dow in (6, 0) then 'available' else 'blocked' end
    )
    on conflict (night_date) do nothing;
    d := d + 1;
  end loop;
end $$;
