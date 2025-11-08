import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}


