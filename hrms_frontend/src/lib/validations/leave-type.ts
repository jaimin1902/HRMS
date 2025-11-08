import { z } from 'zod';

export const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Leave type name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  max_days: z.number().optional(),
  is_paid: z.boolean().optional(),
  requires_approval: z.boolean().optional(),
  carry_forward: z.boolean().optional(),
});

export type LeaveTypeFormData = z.infer<typeof leaveTypeSchema>;


