"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Property } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePropertyPriceAction } from "@/lib/actions/admin";
import { formatMoney } from "@/lib/utils";

export function PrecioForm({ property }: { property: Property }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState(String(property.price_per_night));
  const [pack, setPack] = useState(
    property.weekend_pack_price != null ? String(property.weekend_pack_price) : ""
  );
  const [cleaning, setCleaning] = useState(String(property.cleaning_fee));
  const [currency, setCurrency] = useState(property.currency || "ARS");
  const [minNights, setMinNights] = useState(String(property.min_nights));

  const priceNum = Number(price) || 0;
  const packNum = pack === "" ? null : Number(pack) || 0;
  const cleaningNum = Number(cleaning) || 0;
  const cur = (currency || "ARS").toUpperCase();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePropertyPriceAction({
        price_per_night: price,
        weekend_pack_price: pack,
        cleaning_fee: cleaning,
        currency: cur,
        min_nights: minNights,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Precios guardados — ya se ven en la web");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-crema p-4 text-sm">
        <p className="text-xs text-muted-foreground">Vista previa (landing)</p>
        <p className="text-2xl font-bold text-primary">
          {formatMoney(priceNum, cur)}
          <span className="text-sm font-normal text-muted-foreground"> / noche</span>
        </p>
        {packNum != null && packNum > 0 && (
          <p className="mt-1 text-marron">
            Pack finde vie–dom: <strong>{formatMoney(packNum, cur)}</strong>
          </p>
        )}
        {cleaningNum > 0 && (
          <p className="text-xs text-muted-foreground">
            + limpieza {formatMoney(cleaningNum, cur)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Precio por noche</Label>
        <Input
          id="price"
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pack">Pack finde vie–dom (opcional)</Label>
        <Input
          id="pack"
          type="number"
          min={0}
          step={1}
          value={pack}
          onChange={(e) => setPack(e.target.value)}
          placeholder="Dejá vacío para desactivar"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cleaning">Fee limpieza</Label>
        <Input
          id="cleaning"
          type="number"
          min={0}
          step={1}
          value={cleaning}
          onChange={(e) => setCleaning(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">Moneda (ISO)</Label>
        <Input
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          maxLength={3}
          placeholder="ARS"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="min">Mínimo de noches</Label>
        <Input
          id="min"
          type="number"
          min={1}
          value={minNights}
          onChange={(e) => setMinNights(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Guardando..." : "Guardar precios"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Al guardar se actualiza la landing y el flujo de reserva al instante.
      </p>
    </form>
  );
}
