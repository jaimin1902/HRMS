'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';

export default function EmployeeDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">This Month Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.this_month_attendance?.present || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Leave Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.this_month_attendance?.leave || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.leave_applications?.pending || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent_payslips?.length > 0 ? (
            <div className="space-y-2">
              {stats.recent_payslips.map((payslip: any) => (
                <div key={payslip.id} className="flex justify-between items-center p-2 border rounded">
                  <span>
                    {new Date(2000, payslip.month - 1).toLocaleString('default', { month: 'long' })} {payslip.year}
                  </span>
                  <span className="font-bold">{formatCurrency(payslip.net_salary)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No payslips available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


