'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '@/lib/validations/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '@/lib/axios';
import { ArrowLeft, Save, User, Building, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [salaryStructure, setSalaryStructure] = useState<any>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  useEffect(() => {
    fetchUser();
    fetchRoles();
    fetchDepartments();
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchSalaryStructure();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      const userData = response.data.data;
      setUser(userData);
      
      // Populate form
      setValue('employee_id', userData.employee_id);
      setValue('email', userData.email);
      setValue('first_name', userData.first_name);
      setValue('last_name', userData.last_name);
      setValue('phone', userData.phone || '');
      setValue('date_of_birth', userData.date_of_birth || '');
      setValue('address', userData.address || '');
      setValue('role_id', userData.role_id);
      setValue('department_id', userData.department_id || undefined);
      setValue('designation', userData.designation || '');
      setValue('joining_date', userData.joining_date);
      setValue('is_active', userData.is_active);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setUser(null);
      }
      console.error('Failed to fetch user:', error);
    } finally {
      setFetching(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/admin/roles');
      setRoles(response.data.data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/admin/departments');
      setDepartments(response.data.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchSalaryStructure = async () => {
    setSalaryLoading(true);
    try {
      const response = await api.get(`/admin/salary-structures/user/${userId}`);
      const structures = response.data.data;
      if (structures && structures.length > 0) {
        // Get the active salary structure
        const activeStructure = structures.find((s: any) => s.is_active) || structures[0];
        setSalaryStructure(activeStructure);
      }
    } catch (error) {
      console.error('Failed to fetch salary structure:', error);
    } finally {
      setSalaryLoading(false);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      await api.put(`/users/${userId}`, data);
      alert('User updated successfully');
      router.push('/admin/users');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">User Not Found</h2>
          <p className="text-gray-500 mb-6">The user you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit User</h1>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList>
          <TabsTrigger value="personal">
            <User className="mr-2 h-4 w-4" />
            Personal Details
          </TabsTrigger>
          <TabsTrigger value="employment">
            <Building className="mr-2 h-4 w-4" />
            Employment
          </TabsTrigger>
          <TabsTrigger value="salary">
            <DollarSign className="mr-2 h-4 w-4" />
            Salary Configuration
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit(onSubmit)}>
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input id="employee_id" {...register('employee_id')} disabled />
                    {errors.employee_id && (
                      <p className="text-sm text-red-600">{errors.employee_id.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" {...register('first_name')} />
                    {errors.first_name && (
                      <p className="text-sm text-red-600">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" {...register('last_name')} />
                    {errors.last_name && (
                      <p className="text-sm text-red-600">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...register('phone')} />
                    {errors.phone && (
                      <p className="text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
                    {errors.date_of_birth && (
                      <p className="text-sm text-red-600">{errors.date_of_birth.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" {...register('address')} />
                  {errors.address && (
                    <p className="text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment">
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role_id">Role</Label>
                    <Select
                      id="role_id"
                      value={watch('role_id')?.toString() || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          const numValue = parseInt(value, 10);
                          if (!isNaN(numValue)) {
                            setValue('role_id', numValue);
                          }
                        }
                      }}
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Select>
                    {errors.role_id && (
                      <p className="text-sm text-red-600">{errors.role_id.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="department_id">Department</Label>
                    <Select
                      id="department_id"
                      value={watch('department_id')?.toString() || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          const numValue = parseInt(value, 10);
                          if (!isNaN(numValue)) {
                            setValue('department_id', numValue);
                          }
                        } else {
                          setValue('department_id', undefined);
                        }
                      }}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </Select>
                    {errors.department_id && (
                      <p className="text-sm text-red-600">{errors.department_id.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="designation">Designation</Label>
                    <Input id="designation" {...register('designation')} />
                    {errors.designation && (
                      <p className="text-sm text-red-600">{errors.designation.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="joining_date">Joining Date</Label>
                    <Input id="joining_date" type="date" {...register('joining_date')} />
                    {errors.joining_date && (
                      <p className="text-sm text-red-600">{errors.joining_date.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    id="is_active"
                    value={watch('is_active') ? 'true' : 'false'}
                    onChange={(e) => setValue('is_active', e.target.value === 'true')}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                  {errors.is_active && (
                    <p className="text-sm text-red-600">{errors.is_active.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salary">
            <Card>
              <CardHeader>
                <CardTitle>Salary Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                {salaryLoading ? (
                  <p className="text-sm text-gray-600">Loading salary information...</p>
                ) : salaryStructure ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Basic Salary</Label>
                        <p className="text-lg font-semibold">{formatCurrency(salaryStructure.basic_salary || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">HRA</Label>
                        <p className="text-lg font-semibold">{formatCurrency(salaryStructure.hra || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Transport Allowance</Label>
                        <p className="text-lg font-semibold">{formatCurrency(salaryStructure.transport_allowance || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Medical Allowance</Label>
                        <p className="text-lg font-semibold">{formatCurrency(salaryStructure.medical_allowance || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Other Allowances</Label>
                        <p className="text-lg font-semibold">{formatCurrency(salaryStructure.other_allowances || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">PF Percentage</Label>
                        <p className="text-lg font-semibold">{salaryStructure.pf_percentage || 0}%</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Professional Tax</Label>
                        <p className="text-lg font-semibold">{formatCurrency(salaryStructure.professional_tax || 0)}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Other Deductions</Label>
                        <p className="text-lg font-semibold">{formatCurrency(salaryStructure.other_deductions || 0)}</p>
                      </div>
                    </div>
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm text-muted-foreground">Gross Salary</Label>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            (salaryStructure.basic_salary || 0) +
                            (salaryStructure.hra || 0) +
                            (salaryStructure.transport_allowance || 0) +
                            (salaryStructure.medical_allowance || 0) +
                            (salaryStructure.other_allowances || 0)
                          )}
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                        <span>Total Deductions</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            ((salaryStructure.basic_salary || 0) * (salaryStructure.pf_percentage || 0) / 100) +
                            (salaryStructure.professional_tax || 0) +
                            (salaryStructure.other_deductions || 0)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <Label className="text-sm font-semibold">Net Salary</Label>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            (salaryStructure.basic_salary || 0) +
                            (salaryStructure.hra || 0) +
                            (salaryStructure.transport_allowance || 0) +
                            (salaryStructure.medical_allowance || 0) +
                            (salaryStructure.other_allowances || 0) -
                            ((salaryStructure.basic_salary || 0) * (salaryStructure.pf_percentage || 0) / 100) -
                            (salaryStructure.professional_tax || 0) -
                            (salaryStructure.other_deductions || 0)
                          )}
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground mt-4">
                        <span>Effective From</span>
                        <span>{new Date(salaryStructure.effective_from).toLocaleDateString()}</span>
                      </div>
                      {salaryStructure.effective_to && (
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Effective To</span>
                          <span>{new Date(salaryStructure.effective_to).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/admin/users/${userId}/salary`)}
                      >
                        Edit Salary Structure
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No salary structure configured for this employee yet.
                    </p>
                    <Button
                      type="button"
                      onClick={() => router.push(`/admin/users/${userId}/salary`)}
                    >
                      Create Salary Structure
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <div className="flex gap-4 mt-6">
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
}

