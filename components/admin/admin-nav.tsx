"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Camera,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Menu,
  Settings,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/admin";
import { useState } from "react";

const links = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/reservas", label: "Reservas", icon: ClipboardList },
  { href: "/admin/calendario", label: "Calendario", icon: Calendar },
  { href: "/admin/fotos", label: "Fotos", icon: Camera },
  { href: "/admin/precio", label: "Precio", icon: DollarSign },
  { href: "/admin/contenido", label: "Contenido", icon: FileText },
  { href: "/admin/ajustes", label: "Ajustes", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-marron hover:bg-muted"
            )}
          >
            <l.icon className="h-4 w-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNav() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function onLogout() {
    await logoutAction();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-crema/95 px-3 backdrop-blur md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menú">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="font-serif text-left">Admin · Las Sierras</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <NavLinks onNavigate={() => setOpen(false)} />
              <Button variant="outline" className="mt-6 w-full" onClick={onLogout}>
                <LogOut className="h-4 w-4" /> Salir
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-serif text-sm font-semibold">Admin</span>
        <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Salir">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-crema p-4 md:block">
        <p className="mb-4 font-serif text-lg font-semibold">Las Sierras</p>
        <NavLinks />
        <Button variant="outline" className="mt-8 w-full" onClick={onLogout}>
          <LogOut className="h-4 w-4" /> Salir
        </Button>
      </aside>
    </>
  );
}
