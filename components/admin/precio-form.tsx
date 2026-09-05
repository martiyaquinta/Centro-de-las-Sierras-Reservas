"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Property } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePropertyPriceAction } from "@/lib/actions/admin";

export function PrecioForm({ property }: { property: Property }) {
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState(String(property.price_per_night));
  const [pack, setPack] = useState(
    property.weekend_pack_price != null ? String(property.weekend_pack_price) : ""
  );
  const [cleaning, setCleaning] = useState(String(property.cleaning_fee));
  const [currency, setCurrency] = useState(property.currency);
  const [minNights, setMinNights] = useState(String(property.min_nights));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePropertyPriceAction({
        price_per_night: price,
        weekend_pack_price: pack,
        cleaning_fee: cleaning,
        currency,
        min_nights: minNights,
      });
      if (!res.ok) toast.error(res.error);
      else toast.success("Precios guardados");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="price">Precio por noche (ARS)</Label>
        <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pack">Pack finde vie–dom (opcional)</Label>
        <Input id="pack" type="number" min={0} value={pack} onChange={(e) => setPack(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cleaning">Fee limpieza</Label>
        <Input id="cleaning" type="number" min={0} value={cleaning} onChange={(e) => setCleaning(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">Moneda</Label>
        <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="min">Mínimo de noches</Label>
        <Input id="min" type="number" min={1} value={minNights} onChange={(e) => setMinNights(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Guardando..." : "Guardar precios"}
      </Button>
    </form>
  );
}
