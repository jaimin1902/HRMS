# WorkZen HRMS Frontend

Next.js 16 frontend application for the WorkZen HRMS system.

## Features

- ✅ Next.js 16 with App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ shadcn/ui components
- ✅ React Hook Form + Zod validation
- ✅ Axios for API calls
- ✅ JWT authentication with cookies
- ✅ Role-based route protection
- ✅ Responsive design

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Update `.env.local` with your backend API URL:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (admin)/         # Admin pages
│   ├── (hr)/            # HR Officer pages
│   ├── (payroll)/       # Payroll Officer pages
│   ├── (employee)/      # Employee pages
│   ├── profile/         # User profile
│   └── notifications/   # Notifications
├── components/
│   ├── ui/              # shadcn/ui components
│   └── layouts/         # Layout components
├── lib/
│   ├── axios.ts         # API client
│   ├── auth.ts          # Authentication utilities
│   ├── cookies.ts       # Cookie management
│   ├── constants.ts     # Constants
│   ├── validations/     # Zod schemas
│   └── utils.ts         # Utility functions
└── middleware.ts        # Route protection
```

## Pages

### Authentication
- `/login` - User login
- `/register` - Admin initial setup
- `/forgot-password` - Password recovery
- `/reset-password` - Password reset

### Admin
- `/admin/dashboard` - Admin dashboard
- `/admin/users` - User management
- `/admin/departments` - Department management
- `/admin/leave-types` - Leave type management
- `/admin/settings` - System settings
- `/admin/audit-logs` - Audit logs

### HR Officer
- `/hr/dashboard` - HR dashboard
- `/hr/employees` - Employee directory
- `/hr/attendance` - Attendance management
- `/hr/leaves/approvals` - Leave approvals

### Payroll Officer
- `/payroll/dashboard` - Payroll dashboard
- `/payroll/salary-structure` - Salary structure management
- `/payroll/payrun` - Payroll processing
- `/payroll/payslips` - Payslip management

### Employee
- `/employee/dashboard` - Employee dashboard
- `/employee/attendance` - Mark attendance
- `/employee/leaves/apply` - Apply for leave
- `/employee/leaves/my-requests` - My leave requests
- `/employee/payslips` - My payslips

### Shared
- `/profile` - User profile
- `/notifications` - System notifications

## Authentication

The app uses JWT tokens stored in cookies. The middleware automatically:
- Checks for authentication on protected routes
- Redirects based on user role
- Handles token expiration

## API Integration

All API calls are made through the axios instance in `lib/axios.ts`, which:
- Automatically adds the JWT token to requests
- Handles 401 errors by redirecting to login
- Uses the base URL from environment variables

## Role-Based Access

Routes are protected based on user roles:
- **Admin**: Full access to all routes
- **HR Officer**: Access to HR and user management routes
- **Payroll Officer**: Access to payroll and leave approval routes
- **Employee**: Access to employee-specific routes

## Development

The app is configured with:
- TypeScript for type safety
- ESLint for code quality
- Tailwind CSS for styling
- React Hook Form for form management
- Zod for schema validation

## License

ISC
