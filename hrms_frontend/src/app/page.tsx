'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ROLE_ROUTES } from '@/lib/constants';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (auth.isAuthenticated()) {
      const dashboardRoute = auth.getDashboardRoute();
      router.push(dashboardRoute);
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Loading...</h1>
      </div>
    </div>
  );
}
