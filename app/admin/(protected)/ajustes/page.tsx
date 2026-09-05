import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default function AdminAjustesPage() {
  const configured = isSupabaseConfigured();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Ajustes</h1>
      <Card className="bg-crema">
        <CardHeader>
          <CardTitle className="text-base">Cuenta admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Para cambiar la contraseña usá{" "}
            <strong>Supabase Dashboard → Authentication → Users</strong> o el link de recovery
            por email.
          </p>
          <p>
            Estado Supabase:{" "}
            <span className={configured ? "text-sage font-medium" : "text-destructive font-medium"}>
              {configured ? "configurado" : "modo demo (sin env)"}
            </span>
          </p>
          <p className="text-xs">
            v1 no incluye pagos online (Mercado Pago). Las reservas son solicitudes pending →
            confirm/reject.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
