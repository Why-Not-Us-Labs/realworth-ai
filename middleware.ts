import { NextRequest, NextResponse } from 'next/server';

/**
 * Subdomain routing for partner portals.
 * bullseyesb.realworth.ai → /partner/bullseye/*
 * Main realworth.ai is completely unaffected.
 */
export function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') || '';
  const url = req.nextUrl.clone();

  // Only rewrite for partner subdomains
  if (hostname.startsWith('bullseyesb.')) {
    // Already on a /partner/bullseye path or API route — don't double-rewrite
    if (url.pathname.startsWith('/partner/bullseye') || url.pathname.startsWith('/api/')) {
      return NextResponse.next();
    }

    // Static assets, Next internals — pass through
    if (
      url.pathname.startsWith('/_next') ||
      url.pathname.startsWith('/favicon') ||
      url.pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    // Rewrite to partner route
    url.pathname = `/partner/bullseye${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all paths except static files and API routes
  matcher: ['/((?!_next/static|_next/image).*)'],
};
