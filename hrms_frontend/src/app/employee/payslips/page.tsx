'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { Download } from 'lucide-react';

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      const response = await api.get('/payroll/payslips/my');
      setPayslips(response.data.data);
    } catch (error) {
      console.error('Failed to fetch payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const response = await api.get(`/payroll/payslips/${id}/download`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const payslip = payslips.find(p => p.id === id);
      const monthName = payslip ? new Date(2000, payslip.month - 1).toLocaleString('default', { month: 'long' }) : 'Unknown';
      link.download = `Payslip_${payslip?.employee_id || 'Unknown'}_${monthName}_${payslip?.year || 'Unknown'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Failed to download PDF:', error);
      alert(error.response?.data?.message || 'Failed to download PDF');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Payslips</h1>
      <Card>
        <CardHeader>
          <CardTitle>Payslip History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((payslip) => (
                <TableRow key={payslip.id}>
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
                      onClick={() => handleDownload(payslip.id)}
                    >
                      <Download className="h-4 w-4" />
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


