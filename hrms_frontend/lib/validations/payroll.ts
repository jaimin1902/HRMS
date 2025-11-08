import { z } from 'zod';

export const salaryStructureSchema = z.object({
  user_id: z.number().min(1, 'Employee is required'),
  basic_salary: z.number().min(0, 'Basic salary must be positive'),
  hra: z.number().min(0).default(0),
  transport_allowance: z.number().min(0).default(0),
  medical_allowance: z.number().min(0).default(0),
  other_allowances: z.number().min(0).default(0),
  pf_percentage: z.number().min(0).max(100).default(12),
  professional_tax: z.number().min(0).default(0),
  other_deductions: z.number().min(0).default(0),
  effective_from: z.string().min(1, 'Effective from date is required'),
  effective_to: z.string().optional(),
});

export const payrunSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
  notes: z.string().optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  description: z.string().optional(),
  head_id: z.number().optional(),
});

export const systemSettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  working_days_per_week: z.number().min(1).max(7),
  working_hours_per_day: z.number().min(1).max(24),
  pf_percentage: z.number().min(0).max(100),
  professional_tax_amount: z.number().min(0),
  fiscal_year_start: z.string().min(1, 'Fiscal year start is required'),
});

