'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema, type SettingsFormData } from '@/lib/validations/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/axios';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      const settingsData: any[] = response.data.data;
      const settingsMap: Record<string, string> = {};
      settingsData.forEach((s) => {
        settingsMap[s.key] = s.value;
        setValue(s.key as any, s.data_type === 'number' ? parseFloat(s.value) : s.value);
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true);
    try {
      for (const [key, value] of Object.entries(data)) {
        await api.put(`/admin/settings/${key}`, { value: String(value) });
      }
      alert('Settings updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">System Settings</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input id="company_name" {...register('company_name')} />
              {errors.company_name && (
                <p className="text-sm text-red-600">{errors.company_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="working_days_per_week">Working Days Per Week</Label>
                <Input
                  id="working_days_per_week"
                  type="number"
                  {...register('working_days_per_week', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="working_hours_per_day">Working Hours Per Day</Label>
                <Input
                  id="working_hours_per_day"
                  type="number"
                  {...register('working_hours_per_day', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pf_percentage">PF Percentage</Label>
                <Input
                  id="pf_percentage"
                  type="number"
                  step="0.01"
                  {...register('pf_percentage', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="professional_tax_amount">Professional Tax Amount</Label>
                <Input
                  id="professional_tax_amount"
                  type="number"
                  {...register('professional_tax_amount', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fiscal_year_start">Fiscal Year Start</Label>
              <Input id="fiscal_year_start" type="date" {...register('fiscal_year_start')} />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


