'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyLeaveSchema, type ApplyLeaveFormData } from '@/lib/validations/leave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/axios';
import { calculateDays } from '@/lib/utils';

export default function ApplyLeavePage() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ApplyLeaveFormData>({
    resolver: zodResolver(applyLeaveSchema),
  });

  const startDate = watch('start_date');
  const endDate = watch('end_date');

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const days = calculateDays(startDate, endDate);
      setTotalDays(days);
    }
  }, [startDate, endDate]);

  const fetchLeaveTypes = async () => {
    try {
      const response = await api.get('/leaves/types');
      setLeaveTypes(response.data.data);
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  const onSubmit = async (data: ApplyLeaveFormData) => {
    setLoading(true);
    try {
      await api.post('/leaves/apply', {
        ...data,
        total_days: totalDays,
      });
      alert('Leave application submitted successfully');
      router.push('/employee/leaves/my-requests');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to apply for leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Apply for Leave</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Leave Application</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="leave_type_id">Leave Type</Label>
              <Select
                id="leave_type_id"
                {...register('leave_type_id', { valueAsNumber: true })}
                onChange={(e) => setValue('leave_type_id', parseInt(e.target.value))}
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.code})
                  </option>
                ))}
              </Select>
              {errors.leave_type_id && (
                <p className="text-sm text-red-600">{errors.leave_type_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                />
                {errors.start_date && (
                  <p className="text-sm text-red-600">{errors.start_date.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                />
                {errors.end_date && (
                  <p className="text-sm text-red-600">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Total Days</Label>
              <Input value={totalDays} disabled />
            </div>

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                {...register('reason')}
                placeholder="Enter reason for leave..."
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Apply for Leave'}
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


