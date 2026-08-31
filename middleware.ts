import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Resuelve la sesión y separa las superficies por HOST:
//   - host de plataforma (PLATFORM_HOST)  -> Sitio A (comercial + super-admin)
//   - cualquier otro host                 -> Sitio B (academia de un tenant)
// Un usuario de tenant nunca debe terminar en rutas de Sitio A y viceversa.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresca la sesión (necesario para Server Components).
  const { data: { user } } = await supabase.auth.getUser();

  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase();
  const platformHost = (process.env.PLATFORM_HOST || "").toLowerCase();
  // "www.x" y "x" cuentan como el mismo host de plataforma (ver lib/tenant.ts).
  const stripWww = (h: string) => h.replace(/^www\./, "");
  const isPlatform = !!platformHost && stripWww(host) === stripWww(platformHost);
  const path = request.nextUrl.pathname;

  const rol = (user?.app_metadata as { rol?: string } | undefined)?.rol ?? null;

  // Exponemos el pathname a los Server Components (p. ej. el layout raíz,
  // para no renderizar el nav/footer públicos dentro de /panel).
  response.headers.set("x-pathname", path);

  // --- Sitio A: solo el proveedor. Nadie de un tenant entra acá. ---
  if (isPlatform) {
    if (path.startsWith("/admin") && rol !== "platform_admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  // --- Sitio B (academia): proteger back-office y área del alumno. ---
  if (path.startsWith("/panel")) {
    if (!user) return NextResponse.redirect(new URL("/login", request.url));
    if (rol !== "tenant_admin" && rol !== "instructor") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  if (path.startsWith("/mis-cursos") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  // Excluir assets estáticos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
