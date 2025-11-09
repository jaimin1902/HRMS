import { ROLES } from '@/lib/constants';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const routePatterns: Record<string, string[]> = {
  admin: ['/admin', '/admin/users', '/admin/departments', '/admin/leave-types', '/admin/settings', '/admin/audit-logs , /hr/attendance','/notifications','/salary-structure','/profile'],
  hr: ['/hr', '/hr/users', '/hr/departments', '/hr/attendance', '/hr/leaves/approvals', '/notifications','/profile'],
  payroll: ['/payroll', '/payroll/users', '/payroll/departments', '/payroll/salary-structure', '/payroll/payrun', '/payroll/payslips', '/notifications','/profile'],
  employee: ['/employee', '/employee/users', '/employee/departments', '/employee/attendance', '/employee/leaves/my-requests', '/employee/payslips', '/notifications','/profile'],
  auth: ['/login', '/register', '/forgot-password', '/reset-password'],
  public: ['/login', '/register', '/forgot-password', '/reset-password', '/', '/admin/dashboard', '/hr/dashboard', '/payroll/dashboard', '/employee/dashboard', '/admin/users', '/admin/departments', '/admin/leave-types', '/admin/settings', '/admin/audit-logs', '/hr/users', '/hr/departments', '/hr/attendance', '/hr/leaves/approvals', '/payroll/users', '/payroll/departments', '/payroll/salary-structure', '/payroll/payrun', '/payroll/payslips', '/employee/users', '/employee/departments', '/employee/attendance', '/employee/leaves/my-requests', '/employee/payslips', '/notifications','/profile'],
};

// Check if current path matches any pattern
function matchesPattern(path: string, patterns: string[] | undefined): boolean {
  if (!patterns || !Array.isArray(patterns)) {
    return false;
  }
  return patterns.some((pattern) => {
    // Exact match
    if (pattern === path) return true;
    // Path starts with pattern (for nested routes)
    if (path.startsWith(pattern + "/")) return true;
    return false;
  });
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = (await cookies()).get('workzen_token')?.value;
  const userStr = (await cookies()).get('workzen_user')?.value;
  
  // Parse user object from cookie string
  let user: any = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (error) {
      console.error('Failed to parse user from cookie:', error);
    }
  }

    // Allow public assets and API routes
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes("/images") ||
        pathname.includes("favicon.ico")
      ) {
        return NextResponse.next();
      }
  // Handle authentication routes
  if (matchesPattern(pathname, routePatterns.auth)) {
    if (token && user) {
      // Redirect logged-in users away from auth routes based on their role
      const userRole = user.role_name?.toLowerCase() || user.role?.toLowerCase();
      switch (userRole) {
        case ROLES.HR_OFFICER.toLowerCase():
          return NextResponse.redirect(new URL("/hr/dashboard", request.url));
        case ROLES.ADMIN.toLowerCase():
          return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        case ROLES.PAYROLL_OFFICER.toLowerCase():
          return NextResponse.redirect(new URL("/payroll/dashboard", request.url));
        case ROLES.EMPLOYEE.toLowerCase():
          return NextResponse.redirect(new URL("/employee/dashboard", request.url));
        default:
          return NextResponse.redirect(new URL("/login", request.url));
      }
    }
    return NextResponse.next();
  }

  // Handle public routes
  if (matchesPattern(pathname, routePatterns.public)) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based routing logic
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const userRole = user.role_name?.toLowerCase() || user.role?.toLowerCase();
  
  switch (userRole) {
    case ROLES.ADMIN.toLowerCase(): {
      if (!matchesPattern(pathname, routePatterns.admin)) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      break;
    }
    case ROLES.HR_OFFICER.toLowerCase(): {
      if (!matchesPattern(pathname, routePatterns.hr)) {
        return NextResponse.redirect(new URL("/hr/dashboard", request.url));
      }
      break;
    }
    case ROLES.PAYROLL_OFFICER.toLowerCase(): {
      if (!matchesPattern(pathname, routePatterns.payroll)) {
        return NextResponse.redirect(new URL("/payroll/dashboard", request.url));
      }
      break;
    }
    case ROLES.EMPLOYEE.toLowerCase(): {
      if (!matchesPattern(pathname, routePatterns.employee)) {
        return NextResponse.redirect(new URL("/employee/dashboard", request.url));
      }
      break;
    }
    default: {
      return NextResponse.redirect(new URL("/login", request.url));
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


