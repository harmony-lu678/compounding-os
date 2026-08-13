import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;

  if (appPassword) {
    const isAuthPath =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/api/v1/auth/login");

    const isPublicPath =
      request.nextUrl.pathname.startsWith("/_next") ||
      request.nextUrl.pathname.startsWith("/manifest.json") ||
      request.nextUrl.pathname.match(/\.(png|jpg|ico|svg)$/);

    if (!isAuthPath && !isPublicPath) {
      const authCookie = request.cookies.get("compos_auth");
      const expectedToken = await sha256Hex(appPassword);

      if (authCookie?.value !== expectedToken) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
