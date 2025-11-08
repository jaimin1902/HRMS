'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { payrunSchema, type PayrunFormData } from '@/lib/validations/payroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

export default function PayrunPage() {
  const router = useRouter();
  const [payruns, setPayruns] = useState<any[]>([]);
  const [selectedPayrun, setSelectedPayrun] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PayrunFormData>({
    resolver: zodResolver(payrunSchema),
  });

  useEffect(() => {
    fetchPayruns();
  }, []);

  useEffect(() => {
    if (selectedPayrun) {
      fetchPayslips(selectedPayrun.id);
    }
  }, [selectedPayrun]);

  const fetchPayruns = async () => {
    try {
      const response = await api.get('/payroll/runs');
      setPayruns(response.data.data);
      if (response.data.data.length > 0) {
        setSelectedPayrun(response.data.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch payruns:', error);
    }
  };

  const fetchPayslips = async (payrunId: number) => {
    try {
      const response = await api.get(`/payroll/payslips?payroll_run_id=${payrunId}`);
      setPayslips(response.data.data);
    } catch (error) {
      console.error('Failed to fetch payslips:', error);
    }
  };

  const onSubmit = async (data: PayrunFormData) => {
    setLoading(true);
    try {
      const response = await api.post('/payroll/runs', data);
      const payrunId = response.data.data.id;
      
      // Process payroll
      setProcessing(true);
      await api.post(`/payroll/runs/${payrunId}/process`);
      alert('Payroll processed successfully');
      await fetchPayruns();
      setSelectedPayrun(await api.get(`/payroll/runs/${payrunId}`).then(r => r.data.data));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create/process payrun');
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const handleValidate = async (payrunId: number) => {
    if (!confirm('Are you sure you want to validate this payrun? This will mark all payslips as done.')) {
      return;
    }
    try {
      await api.post('/payroll/validate', { type: 'payrun', id: payrunId });
      alert('Payrun validated successfully');
      await fetchPayruns();
      if (selectedPayrun?.id === payrunId) {
        setSelectedPayrun(await api.get(`/payroll/runs/${payrunId}`).then(r => r.data.data));
        await fetchPayslips(payrunId);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to validate payrun');
    }
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      processing: { label: 'Processing', className: 'bg-yellow-100 text-yellow-800' },
      completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800' },
      paid: { label: 'Done', className: 'bg-green-100 text-green-800' },
    };
    const statusInfo = statusMap[status] || statusMap.draft;
    return (
      <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Payrun</h1>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Generate Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select
                    id="month"
                    {...register('month', { valueAsNumber: true })}
                    onChange={(e) => setValue('month', parseInt(e.target.value))}
                  >
                    <option value="">Select Month</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </Select>
                  {errors.month && (
                    <p className="text-sm text-red-600">{errors.month.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    defaultValue={new Date().getFullYear()}
                    {...register('year', { valueAsNumber: true })}
                  />
                  {errors.year && (
                    <p className="text-sm text-red-600">{errors.year.message}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loading || processing}>
                  {processing ? 'Processing...' : loading ? 'Creating...' : 'Payrun'}
                </Button>
                <Button type="button" variant="outline" className="flex-1" disabled={loading || processing}>
                  Validate
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payruns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payruns.slice(0, 5).map((payrun) => (
                <div
                  key={payrun.id}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedPayrun?.id === payrun.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedPayrun(payrun)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">
                        {getMonthName(payrun.month)} {payrun.year}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatCurrency(payrun.total_amount || 0)} • {payrun.total_employees || 0} employees
                      </div>
                    </div>
                    {getStatusBadge(payrun.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedPayrun && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Payrun {getMonthName(selectedPayrun.month)} {selectedPayrun.year}</span>
              <div className="flex gap-2">
                {getStatusBadge(selectedPayrun.status)}
                {selectedPayrun.status === 'completed' && (
                  <Button
                    size="sm"
                    onClick={() => handleValidate(selectedPayrun.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Validate
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Employer Cost</div>
                  <div className="font-semibold text-lg">
                    {formatCurrency(
                      payslips.reduce((sum, p) => sum + (p.gross_salary || 0) + (p.pf_employer || 0), 0)
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Gross</div>
                  <div className="font-semibold text-lg">
                    {formatCurrency(payslips.reduce((sum, p) => sum + (p.gross_salary || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Net</div>
                  <div className="font-semibold text-lg">
                    {formatCurrency(payslips.reduce((sum, p) => sum + (p.net_salary || 0), 0))}
                  </div>
                </div>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employer Cost</TableHead>
                  <TableHead>Basic Wage</TableHead>
                  <TableHead>Gross Wage</TableHead>
                  <TableHead>Net Wage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((payslip) => {
                  const employerCost = (payslip.gross_salary || 0) + (payslip.pf_employer || 0);
                  return (
                    <TableRow
                      key={payslip.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/payroll/payslips/${payslip.id}`)}
                    >
                      <TableCell>
                        [{getMonthName(selectedPayrun.month)} {selectedPayrun.year}]
                      </TableCell>
                      <TableCell>{payslip.employee_name || 'Employee'}</TableCell>
                      <TableCell>{formatCurrency(employerCost)}</TableCell>
                      <TableCell>{formatCurrency(payslip.basic_salary || 0)}</TableCell>
                      <TableCell>{formatCurrency(payslip.gross_salary || 0)}</TableCell>
                      <TableCell>{formatCurrency(payslip.net_salary || 0)}</TableCell>
                      <TableCell>
                        {payslip.status === 'done' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {payslips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No payslips found for this payrun
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
