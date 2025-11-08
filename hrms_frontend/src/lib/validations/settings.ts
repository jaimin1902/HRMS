import { z } from 'zod';

export const settingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  working_days_per_week: z.number().min(1).max(7),
  working_hours_per_day: z.number().min(1).max(24),
  pf_percentage: z.number().min(0).max(100),
  professional_tax_amount: z.number().min(0),
  fiscal_year_start: z.string().min(1),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;


