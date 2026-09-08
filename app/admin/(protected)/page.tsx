import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPendingAlerts } from "@/components/admin/admin-pending-alerts";
import { PushEnable } from "@/components/admin/push-enable";
import { getAllReservations, getAvailability, getProperty } from "@/lib/data";
import { formatARS } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const configured = isSupabaseConfigured();
  const [property, reservations, availability] = await Promise.all([
    getProperty(),
    getAllReservations(),
    getAvailability(),
  ]);

  const pending = reservations.filter((r) => r.status === "pending");
  const upcoming = reservations
    .filter((r) => r.status === "confirmed" && r.check_in >= new Date().toISOString().slice(0, 10))
    .slice(0, 5);
  const availableNights = availability.filter((a) => a.status === "available").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{property.name}</p>
      </div>

      <AdminPendingAlerts
        pendingCount={pending.length}
        latestCode={pending[0]?.public_code ?? null}
      />

      <Card className="bg-crema">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notificaciones push</CardTitle>
        </CardHeader>
        <CardContent>
          <PushEnable />
        </CardContent>
      </Card>

      {!configured && (
        <Card className="border-mostaza/40 bg-mostaza/10">
          <CardContent className="p-4 text-sm">
            Supabase no configurado. La app corre en <strong>modo demo</strong> con datos seed.
            Completá <code className="rounded bg-crema px-1">.env.local</code> y corré la migration.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="bg-crema">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold text-primary">{pending.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-crema">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Noches libres</p>
            <p className="text-2xl font-bold">{availableNights}</p>
          </CardContent>
        </Card>
        <Card className="bg-crema col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Precio / noche</p>
            <p className="text-2xl font-bold">{formatARS(property.price_per_night)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/admin/reservas">Ver reservas</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/calendario">Calendario</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/fotos">Fotos</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/precio">Editar precio</Link>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <Link href="/" target="_blank">
            Ver sitio
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Solicitudes pendientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay solicitudes nuevas.</p>
          )}
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-1 rounded-lg border border-border bg-crema p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{r.guest_name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(r.check_in), "d MMM", { locale: es })} →{" "}
                  {format(parseISO(r.check_out), "d MMM", { locale: es })} · {r.public_code}
                </p>
              </div>
              <Badge variant="warning">pending</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próximas confirmadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin reservas confirmadas próximas.</p>
          )}
          {upcoming.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-crema p-3 text-sm">
              <p className="font-medium">{r.guest_name}</p>
              <p className="text-muted-foreground">
                {format(parseISO(r.check_in), "d MMM yyyy", { locale: es })} ·{" "}
                {formatARS(Number(r.total_amount))}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
