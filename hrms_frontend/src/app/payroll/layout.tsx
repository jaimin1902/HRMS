import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default function PayrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}


