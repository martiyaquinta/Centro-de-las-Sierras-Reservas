"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";

/**
 * Avisos en admin cuando hay pendientes.
 * - banner siempre visible
 * - toast al entrar / cuando sube el contador
 * - Notification del browser (si el usuario acepta)
 * - refresh cada 45s
 */
export function AdminPendingAlerts({
  pendingCount,
  latestCode,
}: {
  pendingCount: number;
  latestCode?: string | null;
}) {
  const router = useRouter();
  const lastCount = useRef<number | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (pendingCount <= 0) {
      lastCount.current = 0;
      return;
    }

    const isFirst = lastCount.current == null;
    const grew = lastCount.current != null && pendingCount > lastCount.current;

    if (isFirst || grew) {
      const msg =
        pendingCount === 1
          ? `Tenés 1 reserva pendiente${latestCode ? ` (${latestCode})` : ""}`
          : `Tenés ${pendingCount} reservas pendientes`;
      toast.message(msg, {
        description: "Revisalas acá para confirmar o rechazar.",
        duration: 8000,
        icon: <Bell className="h-4 w-4" />,
      });

      if (typeof window !== "undefined" && "Notification" in window) {
        const fire = () => {
          try {
            new Notification("Nueva reserva — De Las Sierras", {
              body: msg,
              tag: "sierras-pending",
            });
          } catch {
            /* ignore */
          }
        };
        if (Notification.permission === "granted") fire();
        else if (Notification.permission === "default" && !asked.current) {
          asked.current = true;
          Notification.requestPermission().then((p) => {
            if (p === "granted") fire();
          });
        }
      }
    }

    lastCount.current = pendingCount;
  }, [pendingCount, latestCode]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [router]);

  if (pendingCount <= 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-mostaza/50 bg-mostaza/15 px-4 py-3 text-sm text-marron">
      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-mostaza" />
      <div>
        <p className="font-semibold">
          {pendingCount === 1
            ? "1 reserva esperando tu OK"
            : `${pendingCount} reservas esperando tu OK`}
        </p>
        <p className="text-xs text-muted-foreground">
          Te llega mail a centrodelassierras@gmail.com con cada pedido nuevo.
        </p>
      </div>
    </div>
  );
}
