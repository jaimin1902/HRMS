'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import api from '@/lib/axios';
import { ArrowLeft, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const salaryStructureSchema = z.object({
  basic_salary: z.number().min(0, 'Basic salary must be positive'),
  hra: z.number().min(0, 'HRA cannot be negative').optional(),
  transport_allowance: z.number().min(0, 'Transport allowance cannot be negative').optional(),
  medical_allowance: z.number().min(0, 'Medical allowance cannot be negative').optional(),
  other_allowances: z.number().min(0, 'Other allowances cannot be negative').optional(),
  pf_percentage: z.number().min(0, 'PF percentage must be at least 0').max(100, 'PF percentage cannot exceed 100'),
  professional_tax: z.number().min(0, 'Professional tax cannot be negative').optional(),
  other_deductions: z.number().min(0, 'Other deductions cannot be negative').optional(),
  effective_from: z.string().min(1, 'Effective from date is required'),
  effective_to: z.string().optional(),
}).refine((data) => {
  if (data.effective_to) {
    return new Date(data.effective_to) > new Date(data.effective_from);
  }
  return true;
}, {
  message: 'Effective to date must be after effective from date',
  path: ['effective_to'],
});

type SalaryStructureFormData = z.infer<typeof salaryStructureSchema>;

export default function EditSalaryStructurePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [salaryStructure, setSalaryStructure] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SalaryStructureFormData>({
    resolver: zodResolver(salaryStructureSchema),
  });

  useEffect(() => {
    fetchUser();
    fetchSalaryStructure();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      setUser(response.data.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchSalaryStructure = async () => {
    setFetching(true);
    try {
      const response = await api.get(`/admin/salary-structures/user/${userId}`);
      const structures = response.data.data;
      if (structures && structures.length > 0) {
        const activeStructure = structures.find((s: any) => s.is_active) || structures[0];
        setSalaryStructure(activeStructure);
        
        // Populate form
        setValue('basic_salary', activeStructure.basic_salary || 0);
        setValue('hra', activeStructure.hra || 0);
        setValue('transport_allowance', activeStructure.transport_allowance || 0);
        setValue('medical_allowance', activeStructure.medical_allowance || 0);
        setValue('other_allowances', activeStructure.other_allowances || 0);
        setValue('pf_percentage', activeStructure.pf_percentage || 12);
        setValue('professional_tax', activeStructure.professional_tax || 0);
        setValue('other_deductions', activeStructure.other_deductions || 0);
        setValue('effective_from', activeStructure.effective_from ? new Date(activeStructure.effective_from).toISOString().split('T')[0] : '');
        setValue('effective_to', activeStructure.effective_to ? new Date(activeStructure.effective_to).toISOString().split('T')[0] : '');
      } else {
        // Set defaults for new salary structure
        setValue('basic_salary', 0);
        setValue('hra', 0);
        setValue('transport_allowance', 0);
        setValue('medical_allowance', 0);
        setValue('other_allowances', 0);
        setValue('pf_percentage', 12);
        setValue('professional_tax', 0);
        setValue('other_deductions', 0);
        setValue('effective_from', new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      console.error('Failed to fetch salary structure:', error);
      // Set defaults if no structure exists
      setValue('basic_salary', 0);
      setValue('hra', 0);
      setValue('transport_allowance', 0);
      setValue('medical_allowance', 0);
      setValue('other_allowances', 0);
      setValue('pf_percentage', 12);
      setValue('professional_tax', 0);
      setValue('other_deductions', 0);
      setValue('effective_from', new Date().toISOString().split('T')[0]);
    } finally {
      setFetching(false);
    }
  };

  const onSubmit = async (data: SalaryStructureFormData) => {
    setLoading(true);
    try {
      if (salaryStructure) {
        // Update existing salary structure
        await api.put(`/admin/salary-structures/${salaryStructure.id}`, data);
        alert('Salary structure updated successfully');
      } else {
        // Create new salary structure
        await api.post('/admin/salary-structures', {
          ...data,
          user_id: parseInt(userId),
        });
        alert('Salary structure created successfully');
      }
      router.push(`/admin/users/${userId}`);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save salary structure');
    } finally {
      setLoading(false);
    }
  };

  const basicSalary = watch('basic_salary') || 0;
  const hra = watch('hra') || 0;
  const transportAllowance = watch('transport_allowance') || 0;
  const medicalAllowance = watch('medical_allowance') || 0;
  const otherAllowances = watch('other_allowances') || 0;
  const pfPercentage = watch('pf_percentage') || 12;
  const professionalTax = watch('professional_tax') || 0;
  const otherDeductions = watch('other_deductions') || 0;

  const grossSalary = basicSalary + hra + transportAllowance + medicalAllowance + otherAllowances;
  const pfDeduction = (basicSalary * pfPercentage) / 100;
  const totalDeductions = pfDeduction + professionalTax + otherDeductions;
  const netSalary = grossSalary - totalDeductions;

  if (fetching) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.push(`/admin/users/${userId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Salary Structure</h1>
          {user && (
            <p className="text-sm text-muted-foreground">
              {user.first_name} {user.last_name} ({user.employee_id})
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Salary Components</CardTitle>
                <CardDescription>Configure the employee's salary structure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="basic_salary">Basic Salary *</Label>
                  <Input
                    id="basic_salary"
                    type="number"
                    step="0.01"
                    {...register('basic_salary', { valueAsNumber: true })}
                  />
                  {errors.basic_salary && (
                    <p className="text-sm text-red-600">{errors.basic_salary.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="hra">HRA (House Rent Allowance)</Label>
                    <Input
                      id="hra"
                      type="number"
                      step="0.01"
                      {...register('hra', { valueAsNumber: true })}
                    />
                    {errors.hra && (
                      <p className="text-sm text-red-600">{errors.hra.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="transport_allowance">Transport Allowance</Label>
                    <Input
                      id="transport_allowance"
                      type="number"
                      step="0.01"
                      {...register('transport_allowance', { valueAsNumber: true })}
                    />
                    {errors.transport_allowance && (
                      <p className="text-sm text-red-600">{errors.transport_allowance.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="medical_allowance">Medical Allowance</Label>
                    <Input
                      id="medical_allowance"
                      type="number"
                      step="0.01"
                      {...register('medical_allowance', { valueAsNumber: true })}
                    />
                    {errors.medical_allowance && (
                      <p className="text-sm text-red-600">{errors.medical_allowance.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="other_allowances">Other Allowances</Label>
                    <Input
                      id="other_allowances"
                      type="number"
                      step="0.01"
                      {...register('other_allowances', { valueAsNumber: true })}
                    />
                    {errors.other_allowances && (
                      <p className="text-sm text-red-600">{errors.other_allowances.message}</p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Deductions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pf_percentage">PF Percentage (%) *</Label>
                      <Input
                        id="pf_percentage"
                        type="number"
                        step="0.01"
                        {...register('pf_percentage', { valueAsNumber: true })}
                      />
                      {errors.pf_percentage && (
                        <p className="text-sm text-red-600">{errors.pf_percentage.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="professional_tax">Professional Tax</Label>
                      <Input
                        id="professional_tax"
                        type="number"
                        step="0.01"
                        {...register('professional_tax', { valueAsNumber: true })}
                      />
                      {errors.professional_tax && (
                        <p className="text-sm text-red-600">{errors.professional_tax.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="other_deductions">Other Deductions</Label>
                    <Input
                      id="other_deductions"
                      type="number"
                      step="0.01"
                      {...register('other_deductions', { valueAsNumber: true })}
                    />
                    {errors.other_deductions && (
                      <p className="text-sm text-red-600">{errors.other_deductions.message}</p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Effective Dates</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="effective_from">Effective From *</Label>
                      <Input
                        id="effective_from"
                        type="date"
                        {...register('effective_from')}
                      />
                      {errors.effective_from && (
                        <p className="text-sm text-red-600">{errors.effective_from.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="effective_to">Effective To (Optional)</Label>
                      <Input
                        id="effective_to"
                        type="date"
                        {...register('effective_to')}
                      />
                      {errors.effective_to && (
                        <p className="text-sm text-red-600">{errors.effective_to.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Salary Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Gross Salary</Label>
                  <p className="text-2xl font-bold">{formatCurrency(grossSalary)}</p>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span>{formatCurrency(basicSalary)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">HRA</span>
                    <span>{formatCurrency(hra)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transport Allowance</span>
                    <span>{formatCurrency(transportAllowance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Medical Allowance</span>
                    <span>{formatCurrency(medicalAllowance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Other Allowances</span>
                    <span>{formatCurrency(otherAllowances)}</span>
                  </div>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PF ({pfPercentage}%)</span>
                    <span>{formatCurrency(pfDeduction)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Professional Tax</span>
                    <span>{formatCurrency(professionalTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Other Deductions</span>
                    <span>{formatCurrency(otherDeductions)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Total Deductions</span>
                    <span>{formatCurrency(totalDeductions)}</span>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">Net Salary</Label>
                    <p className="text-2xl font-bold">{formatCurrency(netSalary)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Saving...' : salaryStructure ? 'Update Salary Structure' : 'Create Salary Structure'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/admin/users/${userId}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}


