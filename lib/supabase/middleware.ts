import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedAdminEmail } from "@/lib/admin-allowlist";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Sin Supabase no hay admin real
    const path = request.nextUrl.pathname;
    if (path.startsWith("/admin") && path !== "/admin/login") {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/admin/login";
      return NextResponse.redirect(redirect);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path.startsWith("/admin");
  const isLogin = path === "/admin/login";

  const allowed = isAllowedAdminEmail(user?.email);

  if (isAdminRoute && !isLogin) {
    if (!user || !allowed) {
      // sesión de un mail no autorizado → cerrar
      if (user && !allowed) {
        await supabase.auth.signOut();
      }
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/admin/login";
      redirect.searchParams.set("next", path);
      return NextResponse.redirect(redirect);
    }
  }

  if (isLogin && user && allowed) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/admin";
    return NextResponse.redirect(redirect);
  }

  return supabaseResponse;
}
