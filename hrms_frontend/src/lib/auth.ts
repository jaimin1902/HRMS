import { cookieStorage } from './cookies';
import { ROLE_ROUTES } from './constants';

export const auth = {
  isAuthenticated: (): boolean => {
    return !!cookieStorage.getToken();
  },

  getToken: (): string | undefined => {
    return cookieStorage.getToken();
  },

  getUser: () => {
    return cookieStorage.getUser();
  },

  setAuth: (token: string, user: any) => {
    cookieStorage.setToken(token);
    cookieStorage.setUser(user);
  },

  logout: () => {
    cookieStorage.clear();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  getDashboardRoute: (): string => {
    const user = cookieStorage.getUser();
    if (!user) return '/login';
    
    const role = user.role_name?.toLowerCase() || user.role?.toLowerCase();
    return ROLE_ROUTES[role] || '/login';
  },

  hasRole: (allowedRoles: string[]): boolean => {
    const user = cookieStorage.getUser();
    if (!user) return false;
    
    const userRole = user.role_name?.toLowerCase() || user.role?.toLowerCase();
    return allowedRoles.some(role => role.toLowerCase() === userRole);
  },
};


