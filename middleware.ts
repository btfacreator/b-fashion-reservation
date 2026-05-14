import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin') || pathname === '/admin/login') {
    return NextResponse.next();
  }

  const token = req.cookies.get('admin_session')?.value;
  const secret = process.env.SESSION_SECRET;

  if (!token || !secret) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
