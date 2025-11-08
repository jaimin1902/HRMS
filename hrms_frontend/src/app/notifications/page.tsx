'use client';

import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  // TODO: Implement notifications API
  const notifications = [
    {
      id: 1,
      type: 'leave',
      message: 'Your leave request has been approved',
      timestamp: new Date().toISOString(),
      read: false,
    },
    {
      id: 2,
      type: 'payroll',
      message: 'Your payslip for January 2024 is available',
      timestamp: new Date().toISOString(),
      read: false,
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Notifications</h1>
        <Card>
          <CardHeader>
            <CardTitle>System Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border rounded-lg ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                >
                  <p className="font-medium">{notification.message}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(notification.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}


