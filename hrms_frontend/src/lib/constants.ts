export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const ROLE_ROUTES: Record<string, string> = {
  admin: '/admin/dashboard',
  'hr officer': '/hr/dashboard',
  'payroll officer': '/payroll/dashboard',
  employee: '/employee/dashboard',
};

export const ROLES = {
  ADMIN: 'admin',
  HR_OFFICER: 'hr officer',
  PAYROLL_OFFICER: 'payroll officer',
  EMPLOYEE: 'employee',
} as const;

export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  'HALF_DAY': 'half-day',
  LEAVE: 'leave',
  HOLIDAY: 'holiday',
  WEEKEND: 'weekend',
} as const;

export const PAYROLL_STATUS = {
  DRAFT: 'draft',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  PAID: 'paid',
} as const;


