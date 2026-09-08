# Departamento de las Sierras — Web de reservas (PWA)

App de reservas para **un solo departamento** en Tandil (San Martín e Yrigoyen).

- **Público:** landing, galería, calendario, solicitud de reserva, seguimiento por código, WhatsApp
- **Admin:** login, reservas (confirm/reject), calendario availability, fotos, precio, contenido
- **Stack:** Next.js 15 · TypeScript · Tailwind v4 · shadcn/ui · PWA · Supabase

## Requisitos

- Node 20+
- pnpm (recomendado)
- Proyecto Supabase (cloud o local)

## Setup rápido

```bash
cd "/home/marti/Documentos/Estudio Nomade/CM/Centro De Las Sierras/web-reservas"
cp .env.example .env.local
# completar keys de Supabase
pnpm install
pnpm dev
```

Sin `.env.local` la app corre en **modo demo** (seed en memoria: precios, amenities, findes available). Las reservas demo no se persisten.

## Supabase

### 1. Crear proyecto

En [supabase.com](https://supabase.com) creá un proyecto y copiá:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (solo server, nunca en el browser)

### 2. Migration + seed

En el SQL Editor de Supabase, ejecutá el contenido de:

```text
supabase/migrations/0001_init.sql
```

Eso crea tablas, RLS, seed de `property` y availability. Aplicá también `0002_ars_vie_dom_availability.sql` (precios ARS + finde vie→dom hasta 2026-12-31).
Tarifa seed: **ARS 77.500/noche**, pack finde vie→dom (2 noches) **ARS 155.000**. Noches libres por defecto: **vie+sáb** (checkout domingo).

### 3. Storage

En Storage → New bucket:

- Name: `property-photos`
- Public: **sí**

Policies sugeridas (SQL):

```sql
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

create policy "Public read property photos"
on storage.objects for select
using (bucket_id = 'property-photos');

create policy "Auth upload property photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'property-photos');

create policy "Auth update property photos"
on storage.objects for update
to authenticated
using (bucket_id = 'property-photos');

create policy "Auth delete property photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'property-photos');
```

### 4. Usuario admin

Authentication → Users → Add user (email + password).

Ese usuario entra en `/admin/login`. No hay roles extra: cualquier `authenticated` es admin (1–2 users).

## Scripts

```bash
pnpm dev        # localhost:3000
pnpm lint
pnpm typecheck
pnpm build
pnpm start
```

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing |
| `/reservar` | Flujo de reserva |
| `/reserva/[code]` | Estado (ej. `DS-7K2P`) |
| `/gracias` | Post-envío + WhatsApp |
| `/admin/login` | Login |
| `/admin` | Dashboard |
| `/admin/reservas` | Confirmar / rechazar |
| `/admin/calendario` | Available / blocked |
| `/admin/fotos` | Upload / orden / cover |
| `/admin/precio` | Precio y fees |
| `/admin/contenido` | Textos, amenities, WA |
| `/offline` | Fallback PWA |

## Reglas de negocio v1

- Solicitud `pending` con **hold 48h** sobre las noches
- Solo rangos donde todas las noches están `available` y no hay reserva `confirmed` ni `pending` con hold vigente
- Total server-side: `noches * price_per_night` (+ cleaning) o pack finde vie→dom (2 noches) si está seteado
- **Sin Mercado Pago** en v1
- Capacidad máx. 3

## Logo / brand

Logo real copiado a `public/brand/` desde la carpeta del proyecto (sin redibujar).

Iconos PWA: `public/icons/icon-192.png`, `icon-512.png` desde `brand/perfil_A_beige_marron.png`.

Paleta tierra: beige `#F3EDE3`, terracota `#C47A4A`, marrón `#3C2A21`.

## PWA

- Manifest: `/manifest.webmanifest`
- Service worker manual: `public/sw.js` (registrado en production por `PwaRegister`)
- Offline fallback: `/offline`
- En dev el SW no se registra (evita cache molesto)

## Fuera de scope v1

Multi-propiedad, pagos online, chat, i18n, dark mode, rediseño de logo.

## Deploy

Vercel + Supabase cloud. Setear las env vars del `.env.example` en el dashboard de Vercel.
