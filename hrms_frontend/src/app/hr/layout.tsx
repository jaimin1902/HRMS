import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}


