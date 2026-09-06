import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function getSupabaseUrl(): string {
  return env("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && url.startsWith("http"));
}

export async function createClient() {
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el server"
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — ignore
        }
      },
    },
  });
}

export function createServiceClient() {
  const url = getSupabaseUrl();
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_SERVICE_ROLE_KEY o URL");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
