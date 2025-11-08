'use client';

import { auth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';

export function Navbar() {
  const router = useRouter();
  const user = auth.getUser();

  const handleLogout = () => {
    auth.clearAuth();
    router.push('/login');
  };

  return (
    <div className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">
          {user?.first_name} {user?.last_name}
        </h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {user?.role_name}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}

