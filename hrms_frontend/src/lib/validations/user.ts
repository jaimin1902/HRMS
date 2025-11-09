import { z } from 'zod';

// Helper function to validate date is not in the future
const notFutureDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
};

// Helper function to validate minimum age (18 years)
const validateMinimumAge = (dateString: string) => {
  const dob = new Date(dateString);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  const dayDiff = today.getDate() - dob.getDate();
  
  if (age > 18) return true;
  if (age < 18) return false;
  if (monthDiff > 0) return true;
  if (monthDiff < 0) return false;
  return dayDiff >= 0;
};

export const userSchema = z.object({
  employee_id: z.string().optional(), // Auto-generated, optional for create
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(), // Not required for create (auto-generated)
  first_name: z.string()
    .min(1, 'First name is required')
    .trim()
    .min(1, 'First name cannot be empty'),
  last_name: z.string()
    .min(1, 'Last name is required')
    .trim()
    .min(1, 'Last name cannot be empty'),
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[\d\s\-\+\(\)]+$/.test(val), {
      message: 'Invalid phone number format',
    })
    .refine((val) => !val || val.replace(/\D/g, '').length >= 10, {
      message: 'Phone number must have at least 10 digits',
    }),
  date_of_birth: z.string()
    .optional()
    .refine((val) => !val || !isNaN(new Date(val).getTime()), {
      message: 'Invalid date of birth format',
    })
    .refine((val) => !val || notFutureDate(val), {
      message: 'Date of birth cannot be in the future',
    })
    .refine((val) => !val || validateMinimumAge(val), {
      message: 'Employee must be at least 18 years old',
    }),
  address: z.string().optional(),
  role_id: z.number().min(1, 'Role is required'),
  department_id: z.number().optional(),
  designation: z.string().optional(),
  joining_date: z.string()
    .min(1, 'Joining date is required')
    .refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid joining date format',
    })
    .refine((val) => notFutureDate(val), {
      message: 'Joining date cannot be in the future',
    }),
  is_active: z.boolean().optional(),
});

export const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  profile_picture: z.string().optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export type UserFormData = z.infer<typeof userSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;


