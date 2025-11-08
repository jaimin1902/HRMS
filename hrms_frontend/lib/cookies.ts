import Cookies from 'js-cookie';

const TOKEN_KEY = 'hrms_token';
const USER_KEY = 'hrms_user';

export const cookieStorage = {
  getToken: () => Cookies.get(TOKEN_KEY),
  setToken: (token: string) => {
    Cookies.set(TOKEN_KEY, token, { expires: 7 }); // 7 days
  },
  removeToken: () => Cookies.remove(TOKEN_KEY),
  
  getUser: () => {
    const user = Cookies.get(USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: any) => {
    Cookies.set(USER_KEY, JSON.stringify(user), { expires: 7 });
  },
  removeUser: () => Cookies.remove(USER_KEY),
  
  clear: () => {
    Cookies.remove(TOKEN_KEY);
    Cookies.remove(USER_KEY);
  },
};

