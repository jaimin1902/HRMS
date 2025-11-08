import Cookies from 'js-cookie';

const TOKEN_KEY = 'workzen_token';
const USER_KEY = 'workzen_user';

export const cookieStorage = {
  setToken: (token: string) => {
    Cookies.set(TOKEN_KEY, token, { 
      expires: 7,
      path: '/',
      sameSite: 'lax'
    });
  },

  getToken: (): string | undefined => {
    return Cookies.get(TOKEN_KEY);
  },

  removeToken: () => {
    Cookies.remove(TOKEN_KEY, { path: '/' });
  },

  setUser: (user: any) => {
    Cookies.set(USER_KEY, JSON.stringify(user), { 
      expires: 7,
      path: '/',
      sameSite: 'lax'
    });
  },

  getUser: (): any | null => {
    const user = Cookies.get(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  removeUser: () => {
    Cookies.remove(USER_KEY, { path: '/' });
  },

  clear: () => {
    Cookies.remove(TOKEN_KEY, { path: '/' });
    Cookies.remove(USER_KEY, { path: '/' });
  },
};


