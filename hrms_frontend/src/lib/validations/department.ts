import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  description: z.string().optional(),
  head_id: z.number().optional(),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;


