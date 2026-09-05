"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/types";
import { photoPublicUrl } from "@/lib/data-client";

export function Gallery({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState(0);
  const list = photos.length ? photos : [];

  if (!list.length) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-arena">
        <Image
          src="/brand/logo-beige.png"
          alt="Departamento de las Sierras"
          fill
          className="object-contain p-8"
          sizes="(max-width: 768px) 100vw, 720px"
          priority
        />
      </div>
    );
  }

  const main = list[Math.min(active, list.length - 1)];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-arena">
        <Image
          src={photoPublicUrl(main.storage_path)}
          alt={main.alt ?? "Foto del departamento"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 720px"
          priority
        />
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2",
                i === active ? "border-primary" : "border-transparent opacity-80"
              )}
            >
              <Image
                src={photoPublicUrl(p.storage_path)}
                alt={p.alt ?? ""}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
