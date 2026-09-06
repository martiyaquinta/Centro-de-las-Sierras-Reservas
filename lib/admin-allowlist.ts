/** Único email autorizado a entrar en /admin. No hay registro público. */
export const ADMIN_EMAILS = ["centrodelassierras@gmail.com"] as const;

export type AdminEmail = (typeof ADMIN_EMAILS)[number];

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = normalizeAdminEmail(email);
  return (ADMIN_EMAILS as readonly string[]).includes(e);
}
