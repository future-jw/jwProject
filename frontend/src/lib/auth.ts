// EXPORTS: IAuthUser{id,username,phone,role,permissions}, auth{getToken,setToken,getUser,setUser,clear}
const NS = 'backend-admin';

export interface IAuthUser {
  id: number;
  username: string;
  phone: string;
  role: 'admin' | 'user';
  permissions: string[];
}

/** 登录态存取，统一带项目命名空间，避免跨应用互相覆盖。 */
export const auth = {
  getToken(): string | null {
    try {
      return localStorage.getItem(`${NS}:token`);
    } catch {
      return null;
    }
  },
  setToken(token: string) {
    try {
      localStorage.setItem(`${NS}:token`, token);
    } catch {
      /* 隐私模式静默降级 */
    }
  },
  getUser(): IAuthUser | null {
    try {
      const raw = localStorage.getItem(`${NS}:user`);
      return raw ? (JSON.parse(raw) as IAuthUser) : null;
    } catch {
      return null;
    }
  },
  setUser(user: IAuthUser) {
    try {
      localStorage.setItem(`${NS}:user`, JSON.stringify(user));
    } catch {
      /* 隐私模式静默降级 */
    }
  },
  clear() {
    try {
      localStorage.removeItem(`${NS}:token`);
      localStorage.removeItem(`${NS}:user`);
    } catch {
      /* 隐私模式静默降级 */
    }
  },
};
