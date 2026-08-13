import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import crypto from "crypto";

export function middleware(request: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;
  
  if (appPassword) {
    const isAuthPath = request.nextUrl.pathname.startsWith('/login') || 
                       request.nextUrl.pathname.startsWith('/api/v1/auth/login');
    
    const isPublicPath = request.nextUrl.pathname.startsWith('/_next') || 
                         request.nextUrl.pathname.startsWith('/manifest.json') ||
                         request.nextUrl.pathname.match(/\.(png|jpg|ico|svg)$/);

    if (!isAuthPath && !isPublicPath) {
      const authCookie = request.cookies.get('compos_auth');
      const expectedToken = crypto.createHash("sha256").update(appPassword).digest("hex");
      
      if (authCookie?.value !== expectedToken) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
