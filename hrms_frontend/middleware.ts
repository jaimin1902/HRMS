import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ROLES, ROLE_ROUTES } from './lib/constants';

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

// Role-based route prefixes
const roleRoutes = {
  [ROLES.ADMIN]: ['/admin'],
  [ROLES.HR_OFFICER]: ['/hr'],
  [ROLES.PAYROLL_OFFICER]: ['/payroll'],
  [ROLES.EMPLOYEE]: ['/employee'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('hrms_token')?.value;
  const userStr = request.cookies.get('hrms_user')?.value;
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole = user?.role_name?.toLowerCase();

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If no token and trying to access protected route
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If has token and trying to access auth routes, redirect to dashboard
  if (token && isAuthRoute) {
    const dashboardRoute = userRole && ROLE_ROUTES[userRole as keyof typeof ROLE_ROUTES]
      ? ROLE_ROUTES[userRole as keyof typeof ROLE_ROUTES]
      : '/admin/dashboard';
    return NextResponse.redirect(new URL(dashboardRoute, request.url));
  }

  // Check role-based access
  if (token && userRole) {
    const allowedRoutes = roleRoutes[userRole as keyof typeof roleRoutes] || [];
    const isAllowedRoute = allowedRoutes.some(route => pathname.startsWith(route)) ||
                          pathname.startsWith('/profile') ||
                          pathname.startsWith('/notifications') ||
                          pathname === '/';

    if (!isAllowedRoute && !isPublicRoute) {
      // Redirect to appropriate dashboard based on role
      const dashboardRoute = ROLE_ROUTES[userRole as keyof typeof ROLE_ROUTES] || '/login';
      return NextResponse.redirect(new URL(dashboardRoute, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

