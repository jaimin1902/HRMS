export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const ROLES = {
  ADMIN: 'admin',
  HR_OFFICER: 'hr officer',
  PAYROLL_OFFICER: 'payroll officer',
  EMPLOYEE: 'employee',
} as const;

export const ROLE_ROUTES = {
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.HR_OFFICER]: '/hr/dashboard',
  [ROLES.PAYROLL_OFFICER]: '/payroll/dashboard',
  [ROLES.EMPLOYEE]: '/employee/dashboard',
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
  HALF_DAY: 'half-day',
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

