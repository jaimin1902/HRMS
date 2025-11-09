import { z } from 'zod';

export const userSchema = z.object({
  employee_id: z.string().min(1, 'Employee ID is required'),
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  role_id: z.number().min(1, 'Role is required'),
  department_id: z.number().optional(),
  designation: z.string().optional(),
  joining_date: z.string().min(1, 'Joining date is required'),
  is_active: z.boolean().optional().default(true),
});

export const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  profile_picture: z.string().optional(),
});

