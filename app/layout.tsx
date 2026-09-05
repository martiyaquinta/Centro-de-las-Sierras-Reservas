import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Departamento de las Sierras · Tandil",
    template: "%s · Las Sierras",
  },
  description:
    "Escapada de finde con vista a las sierras, en pleno centro de Tandil. Hasta 3 personas. Reservá online.",
  applicationName: "Departamento de las Sierras",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Las Sierras",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3EDE3" },
    { media: "(prefers-color-scheme: dark)", color: "#C47A4A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className={`${fraunces.variable} ${nunito.variable} min-h-dvh antialiased`}>
        {children}
        <PwaRegister />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
