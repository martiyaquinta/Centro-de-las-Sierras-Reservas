"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPushPublicKeyAction,
  getPushStatusAction,
  removePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/lib/actions/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

export function PushEnable() {
  const [pending, startTransition] = useTransition();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">(
    "unknown"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [serverCount, setServerCount] = useState(0);
  const [vapidReady, setVapidReady] = useState(true);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);

    startTransition(async () => {
      const status = await getPushStatusAction();
      if (status.ok && status.data) {
        setServerCount(status.data.count);
        setVapidReady(status.data.vapidReady);
      }
      if (!ok) return;
      try {
        const reg = await ensureServiceWorker();
        const sub = await reg?.pushManager.getSubscription();
        setSubscribed(Boolean(sub));
      } catch {
        /* ignore */
      }
    });
  }, []);

  function enable() {
    startTransition(async () => {
      try {
        if (!supported) {
          toast.error("Este navegador no soporta notificaciones push");
          return;
        }
        const keyRes = await getPushPublicKeyAction();
        if (!keyRes.ok) {
          toast.error(keyRes.error || "Faltan claves VAPID en el servidor");
          setVapidReady(false);
          return;
        }
        if (!keyRes.data?.publicKey) {
          toast.error("Faltan claves VAPID en el servidor");
          setVapidReady(false);
          return;
        }
        setVapidReady(true);

        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") {
          toast.error("Necesitamos permiso de notificaciones");
          return;
        }

        const reg = await ensureServiceWorker();
        if (!reg) {
          toast.error("No se pudo registrar el service worker");
          return;
        }
        await navigator.serviceWorker.ready;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyRes.data.publicKey),
          });
        }

        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          toast.error("Subscription incompleta");
          return;
        }

        const saved = await savePushSubscriptionAction({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          userAgent: navigator.userAgent,
        });
        if (!saved.ok) {
          toast.error(saved.error);
          return;
        }
        setSubscribed(true);
        setServerCount((c) => Math.max(c, 1));
        toast.success("Notificaciones activadas en este dispositivo");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo activar");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await removePushSubscriptionAction(sub.endpoint);
          await sub.unsubscribe();
        }
        setSubscribed(false);
        toast.success("Notificaciones desactivadas en este dispositivo");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al desactivar");
      }
    });
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Este navegador no soporta Web Push. Probá Chrome/Edge en Android o desktop, o Safari con
        la PWA instalada en iOS 16.4+.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3">
        {subscribed ? (
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
        ) : (
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-medium text-marron">
            {subscribed ? "Push activo en este dispositivo" : "Avisos de nueva reserva"}
          </p>
          <p className="text-xs text-muted-foreground">
            Te llega una notificación aunque no tengas el admin abierto. También sigue el mail.
            {permission === "denied" ? " (Permiso bloqueado en el navegador.)" : ""}
            {!vapidReady ? " Faltan claves VAPID en el servidor." : ""}
            {serverCount > 0 ? ` · ${serverCount} dispositivo(s) registrados.` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {!subscribed ? (
          <Button type="button" onClick={enable} disabled={pending || permission === "denied"}>
            <Bell className="h-4 w-4" />
            {pending ? "Activando..." : "Activar notificaciones"}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={disable} disabled={pending}>
            <BellOff className="h-4 w-4" />
            {pending ? "..." : "Desactivar en este dispositivo"}
          </Button>
        )}
      </div>
    </div>
  );
}
