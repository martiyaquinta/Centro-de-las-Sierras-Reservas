import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/logo-sinfondo.png"
            alt="Departamento de las Sierras"
            width={40}
            height={40}
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="font-serif text-sm font-semibold leading-tight text-marron sm:text-base">
            De Las Sierras
          </span>
        </Link>
        <Link
          href="/reservar"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
        >
          Reservá
        </Link>
      </div>
    </header>
  );
}
