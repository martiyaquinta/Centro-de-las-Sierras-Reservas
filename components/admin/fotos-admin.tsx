"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import type { Photo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deletePhotoAction,
  reorderPhotoAction,
  setCoverPhotoAction,
  uploadPhotoAction,
} from "@/lib/actions/admin";
import { photoPublicUrl } from "@/lib/data-client";

export function FotosAdmin({ photos }: { photos: Photo[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [pending, startTransition] = useTransition();

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("alt", alt);
    startTransition(async () => {
      const res = await uploadPhotoAction(fd);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Foto subida");
        setAlt("");
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-border bg-crema p-4">
        <p className="mb-2 text-sm font-medium">Subir foto</p>
        <Input
          placeholder="Alt text (opcional)"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          className="mb-3"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onUpload}
        />
        <Button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Elegir archivo
        </Button>
      </div>

      <div className="space-y-3">
        {photos.map((p) => (
          <div
            key={p.id}
            className="flex gap-3 rounded-xl border border-border bg-crema p-3"
          >
            <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-arena">
              <Image
                src={photoPublicUrl(p.storage_path)}
                alt={p.alt ?? ""}
                fill
                className="object-cover"
                sizes="96px"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <p className="truncate text-sm font-medium">{p.alt || p.storage_path}</p>
                {p.is_cover && (
                  <span className="text-xs text-primary">Portada</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await reorderPhotoAction(p.id, "up");
                    })
                  }
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await reorderPhotoAction(p.id, "down");
                    })
                  }
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await setCoverPhotoAction(p.id, p.storage_path);
                      if (!res.ok) toast.error(res.error);
                      else toast.success("Portada actualizada");
                    })
                  }
                >
                  <Star className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await deletePhotoAction(p.id, p.storage_path);
                      if (!res.ok) toast.error(res.error);
                      else toast.success("Eliminada");
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {photos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay fotos. Subí las del depto (balcón, living, cocina…).
          </p>
        )}
      </div>
    </div>
  );
}
