import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Admin Sierras",
  },
  applicationName: "Admin Sierras",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Admin Sierras",
  },
  // PWA anclada al panel: abre /admin (login o dashboard), no la landing
  manifest: "/manifest-admin.webmanifest",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
