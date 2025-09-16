import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


export async function middleware(req: NextRequest) {
// Basic pattern: rely on the presence of the auth cookie set by Supabase.
// If you need robust checks, use a server client & decode the session; keeping it simple here.
const hasAuthCookie = req.cookies.has('sb-access-token') || req.cookies.has('sb-refresh-token');
const pathname = req.nextUrl.pathname;


if (pathname.startsWith('/summarize') && !hasAuthCookie) {
const url = req.nextUrl.clone();
url.pathname = '/login';
return NextResponse.redirect(url);
}


return NextResponse.next();
}


export const config = {
matcher: ['/summarize/:path*'],
};