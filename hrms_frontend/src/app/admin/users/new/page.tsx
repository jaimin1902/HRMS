'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '@/lib/validations/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/axios';

export default function NewUserPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      is_active: true,
    },
  });

  useEffect(() => {
    fetchRoles();
    fetchDepartments();
  }, []);

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

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    try {
      await api.post('/users', data);
      router.push('/admin/users');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Add New User</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* <div>
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input id="employee_id" {...register('employee_id')} />
                {errors.employee_id && (
                  <p className="text-sm text-red-600">{errors.employee_id.message}</p>
                )}
              </div> */}
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role_id">Role</Label>
                <Select
                  id="role_id"
                  {...register('role_id', { valueAsNumber: true })}
                  onChange={(e) => setValue('role_id', parseInt(e.target.value))}
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
                  {...register('department_id', { valueAsNumber: true })}
                  onChange={(e) => setValue('department_id', e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
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

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Password will be automatically generated and sent to the employee's email address.
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


