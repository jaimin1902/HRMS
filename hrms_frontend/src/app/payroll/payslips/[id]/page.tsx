'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, X, Printer, FileText } from 'lucide-react';

export default function PayslipDetailPage() {
  const router = useRouter();
  const params = useParams();
  const payslipId = params.id as string;
  const [payslip, setPayslip] = useState<any>(null);
  const [computation, setComputation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (payslipId) {
      fetchPayslip();
      fetchComputation();
    }
  }, [payslipId]);

  const fetchPayslip = async () => {
    try {
      const response = await api.get(`/payroll/payslips/${payslipId}`);
      setPayslip(response.data.data);
    } catch (error) {
      console.error('Failed to fetch payslip:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComputation = async () => {
    try {
      const response = await api.get(`/payroll/payslips/${payslipId}/computation`);
      setComputation(response.data.data);
    } catch (error) {
      console.error('Failed to fetch computation:', error);
    }
  };

  const handleValidate = async () => {
    if (!confirm('Are you sure you want to validate this payslip?')) {
      return;
    }
    setValidating(true);
    try {
      await api.post('/payroll/validate', { type: 'payslip', id: parseInt(payslipId) });
      alert('Payslip validated successfully');
      await fetchPayslip();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to validate payslip');
    } finally {
      setValidating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await api.get(`/payroll/payslips/${payslipId}/download`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
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

  const handleNewPayslip = () => {
    // Navigate to create new payslip (if needed)
    router.push('/payroll/payrun');
  };

  const handleCancel = () => {
    router.back();
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!payslip) return <div className="p-8">Payslip not found</div>;

  const isDone = payslip.status === 'done';
  const payrollRun = computation?.payroll_run;
  const workedDays = computation?.worked_days;
  const salaryComp = computation?.salary_computation;

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Payslip</h1>
          <div className="flex gap-2">
            {isDone && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Done
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={handleNewPayslip}
            variant="outline"
            className="bg-purple-100 text-purple-700 hover:bg-purple-200"
          >
            New Payslip
          </Button>
          <Button
            onClick={() => router.push(`/payroll/payrun`)}
            variant="outline"
            className="bg-purple-100 text-purple-700 hover:bg-purple-200"
          >
            Compute
          </Button>
          {!isDone && (
            <Button
              onClick={handleValidate}
              disabled={validating}
              variant="outline"
            >
              Validate
            </Button>
          )}
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled
          >
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            <FileText className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Employee Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{payslip.employee_name || 'Employee'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-500">Payrun</div>
              <div className="text-blue-600 hover:underline cursor-pointer">
                Payrun {payrollRun ? `${getMonthName(payrollRun.month)} ${payrollRun.year}` : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Salary Structure</div>
              <div className="text-blue-600 hover:underline cursor-pointer">
                Regular Pay
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Period</div>
              <div>
                {payrollRun
                  ? `01 ${getMonthName(payrollRun.month)} To ${new Date(payrollRun.year, payrollRun.month, 0).getDate()} ${getMonthName(payrollRun.month)}`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Worked Days and Salary Computation */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="worked-days">
            <TabsList>
              <TabsTrigger value="worked-days">Worked Days</TabsTrigger>
              <TabsTrigger value="salary-computation">Salary Computation</TabsTrigger>
            </TabsList>

            {/* Worked Days Tab */}
            <TabsContent value="worked-days" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workedDays?.breakdown?.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>
                        {item.days.toFixed(2)} ({item.description})
                      </TableCell>
                      <TableCell>{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-gray-50">
                    <TableCell>Total</TableCell>
                    <TableCell>{workedDays?.total_days?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>{formatCurrency(workedDays?.total_amount || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 p-4 bg-blue-50 rounded text-sm text-gray-700">
                <p>
                  Salary is calculated based on the employee's monthly attendance. Paid leaves are included in the total payable days, while unpaid leaves are deducted from the salary.
                </p>
                {isDone && (
                  <p className="mt-2 font-semibold text-green-700">
                    'Done' status shows once any pay run or payslip has been validated.
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Salary Computation Tab */}
            <TabsContent value="salary-computation" className="mt-4">
              <div className="mb-4 p-4 bg-blue-50 rounded text-sm text-gray-700">
                Users can also view the payslip computation, which shows how the total amount is calculated from different salary heads, including allowances and deductions.
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Rate %</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Gross Salary Components */}
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={3} className="font-semibold">Gross</TableCell>
                  </TableRow>
                  {salaryComp?.gross?.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.rule_name}</TableCell>
                      <TableCell>{item.rate_percent}%</TableCell>
                      <TableCell>{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Deductions */}
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={3} className="font-semibold">Deductions</TableCell>
                  </TableRow>
                  {salaryComp?.deductions?.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.rule_name}</TableCell>
                      <TableCell>{item.rate_percent}%</TableCell>
                      <TableCell className="text-red-600">
                        {formatCurrency(Math.abs(item.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Net Amount */}
                  <TableRow className="font-semibold bg-green-50">
                    <TableCell colSpan={2}>Net Amount</TableCell>
                    <TableCell>{formatCurrency(salaryComp?.net_amount || payslip.net_salary || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

