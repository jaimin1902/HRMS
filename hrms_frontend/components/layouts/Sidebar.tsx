'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  DollarSign,
  ClipboardList,
  Building2,
  UserCircle,
  Bell,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Departments', href: '/admin/departments', icon: Building2 },
  { title: 'Leave Types', href: '/admin/leave-types', icon: FileText },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
  { title: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardList },
];

const hrNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
  { title: 'Employees', href: '/hr/employees', icon: Users },
  { title: 'Attendance', href: '/hr/attendance', icon: Calendar },
  { title: 'Leave Approvals', href: '/hr/leaves/approvals', icon: FileText },
];

const payrollNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/payroll/dashboard', icon: LayoutDashboard },
  { title: 'Salary Structure', href: '/payroll/salary-structure', icon: DollarSign },
  { title: 'Payrun', href: '/payroll/payrun', icon: FileText },
  { title: 'Payslips', href: '/payroll/payslips', icon: ClipboardList },
];

const employeeNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { title: 'Attendance', href: '/employee/attendance', icon: Calendar },
  { title: 'Leaves', href: '/employee/leaves/my-requests', icon: FileText },
  { title: 'Payslips', href: '/employee/payslips', icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = auth.getUser();
  const userRole = user?.role_name?.toLowerCase();

  let navItems: NavItem[] = [];
  if (userRole === 'admin') {
    navItems = adminNavItems;
  } else if (userRole === 'hr officer') {
    navItems = hrNavItems;
  } else if (userRole === 'payroll officer') {
    navItems = payrollNavItems;
  } else {
    navItems = employeeNavItems;
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-gray-50">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">WorkZen HRMS</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Link
          href="/profile"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/profile'
              ? 'bg-primary text-primary-foreground'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          <UserCircle className="h-5 w-5" />
          Profile
        </Link>
        <Link
          href="/notifications"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/notifications'
              ? 'bg-primary text-primary-foreground'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          <Bell className="h-5 w-5" />
          Notifications
        </Link>
      </div>
    </div>
  );
}

