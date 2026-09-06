"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/types";
import { photoPublicUrl } from "@/lib/data-client";

export function Gallery({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState(0);
  const list = photos.length ? photos : [];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (list.length < 2) return;
      setActive((i) => (i + dir + list.length) % list.length);
    },
    [list.length]
  );

  useEffect(() => {
    if (list.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, list.length]);

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
      <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-arena">
        <Image
          src={photoPublicUrl(main.storage_path)}
          alt={main.alt ?? "Foto del departamento"}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, 720px"
          priority
        />

        {list.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-marron shadow-md backdrop-blur-sm transition hover:bg-background sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-marron shadow-md backdrop-blur-sm transition hover:bg-background sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {list.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Ir a foto ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === active ? "w-5 bg-primary" : "w-2 bg-background/70 hover:bg-background"
                  )}
                />
              ))}
            </div>
          </>
        )}
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
