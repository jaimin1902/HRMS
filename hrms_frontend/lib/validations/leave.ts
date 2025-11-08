import { z } from 'zod';

export const applyLeaveSchema = z.object({
  leave_type_id: z.number().min(1, 'Leave type is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return end >= start;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

export const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  max_days: z.number().optional(),
  is_paid: z.boolean().default(true),
  requires_approval: z.boolean().default(true),
  carry_forward: z.boolean().default(false),
});

