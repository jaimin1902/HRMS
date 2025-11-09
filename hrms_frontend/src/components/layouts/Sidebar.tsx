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
  User,
  Bell,
  LogOut,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminMenu: SidebarItem[] = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Attendance', href: '/hr/attendance', icon: Calendar },

  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Time Off', href: '/hr/leaves/approvals', icon: FileText },

  { title: 'Departments', href: '/admin/departments', icon: Users },
  { title: 'Leave Types', href: '/admin/leave-types', icon: FileText },

  { title: 'Settings', href: '/admin/settings', icon: Settings },
  // { title: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardList },
];

const hrMenu: SidebarItem[] = [
  { title: 'Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
  { title: 'Employees', href: '/hr/employees', icon: Users },
  { title: 'Attendance', href: '/hr/attendance', icon: Calendar },
  { title: 'Time Off ', href: '/hr/leaves/approvals', icon: FileText },
];

const payrollMenu: SidebarItem[] = [
  { title: 'Dashboard', href: '/payroll/dashboard', icon: LayoutDashboard },
  { title: 'Salary Structure', href: '/payroll/salary-structure', icon: DollarSign },
  { title: 'Payrun', href: '/payroll/payrun', icon: FileText },
  { title: 'Payslips', href: '/payroll/payslips', icon: FileText },
];

const employeeMenu: SidebarItem[] = [
  { title: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
  { title: 'Attendance', href: '/employee/attendance', icon: Calendar },
  { title: 'Leaves', href: '/employee/leaves/my-requests', icon: FileText },
  { title: 'Payslips', href: '/employee/payslips', icon: DollarSign },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = auth.getUser();
  const role = user?.role_name?.toLowerCase() || user?.role?.toLowerCase();

  let menu: SidebarItem[] = [];
  if (role === 'admin') menu = adminMenu;
  else if (role === 'hr officer') menu = hrMenu;
  else if (role === 'payroll officer') menu = payrollMenu;
  else menu = employeeMenu;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-gray-50 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header with Close Button (Mobile) */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-xl font-bold text-gray-900">WorkZen HRMS</h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  // Close sidebar on mobile when link is clicked
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4 space-y-1">
          <Link
            href="/profile"
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose();
              }
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <User className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">Profile</span>
          </Link>
          <Link
            href="/notifications"
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose();
              }
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <Bell className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">Notifications</span>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => auth.logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}


