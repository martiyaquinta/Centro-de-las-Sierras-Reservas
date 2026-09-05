"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Property } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updatePropertyContentAction } from "@/lib/actions/admin";

export function ContenidoForm({ property }: { property: Property }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: property.name,
    tagline: property.tagline ?? "",
    description: property.description ?? "",
    address_text: property.address_text ?? "",
    maps_url: property.maps_url ?? "",
    whatsapp_e164: property.whatsapp_e164 ?? "",
    capacity: String(property.capacity),
    check_in_time: property.check_in_time ?? "",
    check_out_time: property.check_out_time ?? "",
    house_rules: property.house_rules ?? "",
    amenities: property.amenities.join("\n"),
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePropertyContentAction(form);
      if (!res.ok) toast.error(res.error);
      else toast.success("Contenido guardado");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {(
        [
          ["name", "Nombre", "input"],
          ["tagline", "Tagline", "input"],
          ["description", "Descripción", "textarea"],
          ["address_text", "Dirección", "input"],
          ["maps_url", "URL Google Maps", "input"],
          ["whatsapp_e164", "WhatsApp (E.164, ej 54911...)", "input"],
          ["capacity", "Capacidad", "input"],
          ["check_in_time", "Check-in", "input"],
          ["check_out_time", "Check-out", "input"],
          ["amenities", "Amenities (una por línea)", "textarea"],
          ["house_rules", "Reglas de la casa", "textarea"],
        ] as const
      ).map(([key, label, kind]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{label}</Label>
          {kind === "textarea" ? (
            <Textarea
              id={key}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              rows={key === "description" || key === "house_rules" ? 5 : 4}
            />
          ) : (
            <Input
              id={key}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              required={key === "name"}
            />
          )}
        </div>
      ))}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Guardando..." : "Guardar contenido"}
      </Button>
    </form>
  );
}
