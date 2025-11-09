'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { profileSchema, changePasswordSchema } from '@/lib/validations/user';
import api from '@/lib/axios';
import { auth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { DollarSign } from 'lucide-react';

type ProfileFormData = {
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
};

type PasswordFormData = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState(auth.getUser());
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [salaryStructure, setSalaryStructure] = useState<any>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
      date_of_birth: user?.date_of_birth || '',
      address: user?.address || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      const userData = response.data.data;
      setUser(userData);
      profileForm.reset({
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone || '',
        date_of_birth: userData.date_of_birth || '',
        address: userData.address || '',
      });
      // Fetch salary structure after user data is loaded
      if (userData.id) {
        fetchSalaryStructure(userData.id);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchSalaryStructure = async (userId?: number) => {
    const userIdToUse = userId || user?.id;
    if (!userIdToUse) return;
    setSalaryLoading(true);
    try {
      // Try to get own salary structure first (for employees)
      let response;
      try {
        response = await api.get('/payroll/salary-structure/my');
      } catch (error: any) {
        // If that fails (403), try admin endpoint (for admins)
        if (error.response?.status === 403) {
          response = await api.get(`/admin/salary-structures/user/${userIdToUse}`);
        } else {
          throw error;
        }
      }
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

  const onProfileSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.put('/auth/profile', data);
      const updatedUser = response.data.data;
      setUser(updatedUser);
      auth.setAuth(auth.getToken()!, updatedUser);
      setMessage('Profile updated successfully!');
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordLoading(true);
    setMessage('');
    try {
      await api.put('/auth/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setMessage('Password changed successfully!');
      passwordForm.reset();
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600 text-sm">Manage your profile information and account settings</p>
        </div>

        {message && (
          <div className={`rounded-lg p-4 text-sm border ${
            message.includes('success') 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {message}
          </div>
        )}

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Personal Information</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Update your personal details and contact information</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    {...profileForm.register('first_name')}
                  />
                  {profileForm.formState.errors.first_name && (
                    <p className="text-sm text-red-600">
                      {profileForm.formState.errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    {...profileForm.register('last_name')}
                  />
                  {profileForm.formState.errors.last_name && (
                    <p className="text-sm text-red-600">
                      {profileForm.formState.errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...profileForm.register('phone')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...profileForm.register('date_of_birth')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  {...profileForm.register('address')}
                />
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={loading} size="lg" className="min-w-[120px]">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Change Password</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Update your password to keep your account secure</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  {...passwordForm.register('current_password')}
                />
                {passwordForm.formState.errors.current_password && (
                  <p className="text-sm text-red-600">
                    {passwordForm.formState.errors.current_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  {...passwordForm.register('new_password')}
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-sm text-red-600">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  {...passwordForm.register('confirm_password')}
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-sm text-red-600">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={passwordLoading} size="lg" className="min-w-[140px]">
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <DollarSign className="h-5 w-5" />
              Salary Configuration
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">View your current salary structure and benefits</p>
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
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Effective From</span>
                    <span>{new Date(salaryStructure.effective_from).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No salary structure configured yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

