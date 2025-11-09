'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, TrendingUp, Users } from 'lucide-react';

export default function PayrollDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'monthly' | 'annual'>({ employer: 'monthly', employee: 'monthly' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/payroll/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'short' });
  };

  const getMaxValue = (data: any[], key: string) => {
    if (!data || data.length === 0) return 100;
    return Math.max(...data.map(item => parseFloat(item[key] || 0)), 100);
  };

  if (loading) return <div className="p-4 sm:p-8">Loading...</div>;

  const warnings = dashboardData?.warnings || {};
  const payruns = dashboardData?.payruns || [];
  const employerCosts = dashboardData?.employer_costs?.monthly || [];
  const employeeCounts = dashboardData?.employee_counts?.monthly || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Payroll Dashboard</h1>
      
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Warnings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warnings.employees_without_bank > 0 && (
              <div className="text-blue-600 hover:underline cursor-pointer">
                {warnings.employees_without_bank} Employee{warnings.employees_without_bank !== 1 ? 's' : ''} without Bank A/c
              </div>
            )}
            {warnings.employees_without_manager > 0 && (
              <div className="text-blue-600 hover:underline cursor-pointer">
                {warnings.employees_without_manager} Employee{warnings.employees_without_manager !== 1 ? 's' : ''} without Manager
              </div>
            )}
            {warnings.employees_without_bank === 0 && warnings.employees_without_manager === 0 && (
              <div className="text-gray-500">No warnings</div>
            )}
          </CardContent>
        </Card>

        {/* Payrun Section */}
        <Card>
          <CardHeader>
            <CardTitle>Payrun</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payruns.slice(0, 2).map((payrun: any) => (
              <div key={payrun.id} className="text-blue-600 hover:underline cursor-pointer">
                Payrun for {getMonthName(payrun.month)} {payrun.year} ({payrun.payslip_count || 0} Payslip{payrun.payslip_count !== 1 ? 's' : ''})
              </div>
            ))}
            {payruns.length === 0 && (
              <div className="text-gray-500">No payruns found</div>
            )}
          </CardContent>
        </Card>

        {/* Employer Cost Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Employer Cost
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode({ ...viewMode, employer: 'annual' })}
                  className={`text-xs px-2 py-1 rounded ${
                    viewMode.employer === 'annual' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  Annually
                </button>
                <button
                  onClick={() => setViewMode({ ...viewMode, employer: 'monthly' })}
                  className={`text-xs px-2 py-1 rounded ${
                    viewMode.employer === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode.employer === 'monthly' ? (
              <div className="space-y-4">
                {employerCosts.slice(0, 3).map((cost: any, index: number) => {
                  const maxCost = getMaxValue(employerCosts, 'employer_cost');
                  const percentage = (parseFloat(cost.employer_cost || 0) / maxCost) * 100;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{getMonthName(cost.month)} {cost.year}</span>
                        <span className="font-semibold">{formatCurrency(cost.employer_cost || 0)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 10 && `${Math.round(percentage)}%`}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {employerCosts.length === 0 && (
                  <div className="text-gray-500 text-center py-4">No data available</div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardData?.employer_costs?.annual || 0)}
                </div>
                <div className="text-sm text-gray-500 mt-2">Total Annual Cost</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Count Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Count
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode({ ...viewMode, employee: 'annual' })}
                  className={`text-xs px-2 py-1 rounded ${
                    viewMode.employee === 'annual' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  Annually
                </button>
                <button
                  onClick={() => setViewMode({ ...viewMode, employee: 'monthly' })}
                  className={`text-xs px-2 py-1 rounded ${
                    viewMode.employee === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {viewMode.employee === 'monthly' ? (
              <div className="space-y-4">
                {employeeCounts.slice(0, 3).map((count: any, index: number) => {
                  const maxCount = getMaxValue(employeeCounts, 'employee_count');
                  const percentage = maxCount > 0 ? (parseInt(count.employee_count || 0) / maxCount) * 100 : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{getMonthName(count.month)} {count.year}</span>
                        <span className="font-semibold">{count.employee_count || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 10 && `${Math.round(percentage)}%`}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {employeeCounts.length === 0 && (
                  <div className="text-gray-500 text-center py-4">No data available</div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-2xl font-bold">
                  {dashboardData?.employee_counts?.annual || 0}
                </div>
                <div className="text-sm text-gray-500 mt-2">Total Employees</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
