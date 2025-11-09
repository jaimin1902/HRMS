'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function PayslipsPage() {
  const router = useRouter();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    month: '',
    year: new Date().getFullYear().toString(),
  });

  useEffect(() => {
    fetchPayslips();
  }, [filters]);

  const fetchPayslips = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);

      const response = await api.get(`/payroll/payslips?${params.toString()}`);
      setPayslips(response.data.data);
    } catch (error) {
      console.error('Failed to fetch payslips:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Payslips</h1>
      
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <Select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              placeholder="Year"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((payslip) => (
                <TableRow key={payslip.id}>
                  <TableCell>{payslip.employee_name}</TableCell>
                  <TableCell>
                    {new Date(2000, payslip.month - 1).toLocaleString('default', { month: 'long' })} {payslip.year}
                  </TableCell>
                  <TableCell>{formatCurrency(payslip.gross_salary)}</TableCell>
                  <TableCell>{formatCurrency(payslip.total_deductions)}</TableCell>
                  <TableCell>{formatCurrency(payslip.net_salary)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/payroll/payslips/${payslip.id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


