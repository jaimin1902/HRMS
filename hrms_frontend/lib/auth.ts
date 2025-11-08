import { cookieStorage } from './cookies';
import { ROLES, ROLE_ROUTES } from './constants';

export interface User {
  id: number;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: string;
  department_id?: number;
  department_name?: string;
  is_active: boolean;
}

export const auth = {
  getToken: () => cookieStorage.getToken(),
  getUser: (): User | null => cookieStorage.getUser(),
  setAuth: (token: string, user: User) => {
    cookieStorage.setToken(token);
    cookieStorage.setUser(user);
  },
  clearAuth: () => {
    cookieStorage.clear();
  },
  isAuthenticated: () => {
    return !!cookieStorage.getToken();
  },
  hasRole: (role: string) => {
    const user = cookieStorage.getUser();
    return user?.role_name?.toLowerCase() === role.toLowerCase();
  },
  getDashboardRoute: () => {
    const user = cookieStorage.getUser();
    if (!user) return '/login';
    const role = user.role_name?.toLowerCase();
    return ROLE_ROUTES[role as keyof typeof ROLE_ROUTES] || '/login';
  },
};

