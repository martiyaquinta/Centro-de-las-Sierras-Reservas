export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="font-serif text-2xl font-semibold text-marron">Sin conexión</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        Abrí la app cuando tengas señal para ver disponibilidad y reservar.
      </p>
    </div>
  );
}
