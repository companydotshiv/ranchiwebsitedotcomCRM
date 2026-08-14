import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  // 1. Protect profile route
  if (url.pathname.startsWith('/profile') && !user) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. Redirect logged-in users away from auth routes, except reset-password when there is a code param
  const isAuthRoute =
    url.pathname === '/login' ||
    url.pathname === '/register' ||
    url.pathname === '/forgot-password';

  if (isAuthRoute && user) {
    url.pathname = '/profile';
    return NextResponse.redirect(url);
  }

  if (url.pathname === '/reset-password' && user && !url.searchParams.has('code')) {
    // If user is logged in but has no password reset code, they can still access it (to change password)
    // but if not logged in and no code, redirect to login
  } else if (url.pathname === '/reset-password' && !user && !url.searchParams.has('code')) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any image formats
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
