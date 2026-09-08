"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Siempre: offline + Web Push admin (localhost HTTPS/secure context)
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore
    });
  }, []);
  return null;
}
