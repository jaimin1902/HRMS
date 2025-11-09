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

export type ApplyLeaveFormData = z.infer<typeof applyLeaveSchema>;


