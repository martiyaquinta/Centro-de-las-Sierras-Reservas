"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loginAction, registerAdminAction } from "@/lib/actions/admin";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res =
        mode === "login"
          ? await loginAction(email, password)
          : await registerAdminAction(email, password);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(mode === "login" ? "Bienvenido" : "Cuenta creada");
      router.push(search.get("next") || "/admin");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm bg-crema">
        <CardHeader className="items-center text-center">
          <Image src="/brand/logo-sinfondo.png" alt="" width={64} height={64} className="mb-2" />
          <CardTitle className="font-serif text-xl">Admin · De Las Sierras</CardTitle>
          <p className="text-xs text-muted-foreground">
            Solo cuentas autorizadas del departamento.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending
                ? mode === "login"
                  ? "Entrando..."
                  : "Creando..."
                : mode === "login"
                  ? "Entrar"
                  : "Crear cuenta admin"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
            >
              {mode === "login"
                ? "¿Primera vez? Registrarme"
                : "Ya tengo cuenta — entrar"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
