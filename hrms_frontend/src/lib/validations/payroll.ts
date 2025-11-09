import { z } from 'zod';

export const salaryStructureSchema = z.object({
  user_id: z.number().min(1, 'Employee is required'),
  basic_salary: z.number().min(0, 'Basic salary must be positive'),
  hra: z.number().min(0).optional(),
  transport_allowance: z.number().min(0).optional(),
  medical_allowance: z.number().min(0).optional(),
  other_allowances: z.number().min(0).optional(),
  pf_percentage: z.number().min(0).max(100).optional(),
  professional_tax: z.number().min(0).optional(),
  other_deductions: z.number().min(0).optional(),
  effective_from: z.string().min(1, 'Effective from date is required'),
  effective_to: z.string().optional(),
});

export const payrunSchema = z.object({
  month: z.number().min(1).max(12, 'Month must be between 1 and 12'),
  year: z.number().min(2020).max(2100, 'Invalid year'),
});

export type SalaryStructureFormData = z.infer<typeof salaryStructureSchema>;
export type PayrunFormData = z.infer<typeof payrunSchema>;


