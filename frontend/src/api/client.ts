// EXPORTS: IAuthResponse{token,user}, IUser{id,username,password,phone,role}, IPermissionItem{code,name,group_name}, api{register,login,listUsers,createUser,updateUser,deleteUser,listPermissions,getUserPermissions,setUserPermissions}
import { auth } from '@/lib/auth';

/**
 * 接口基址：开发期走 vite 代理（/api → http://127.0.0.1:8000），
 * 部署后挂在应用根路径下，用 MIAODA_CLIENT_BASE_PATH 拼接。
 */
const API_BASE = `${(import.meta.env.MIAODA_CLIENT_BASE_PATH || '').replace(/\/$/, '')}/api`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `请求失败（${res.status}）`;
    try {
      const data = (await res.json()) as { detail?: unknown };
      if (data.detail) {
        message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
    } catch {
      /* 非 JSON 响应，保留默认消息 */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export interface IAuthUserPayload {
  id: number;
  username: string;
  phone: string;
  role: 'admin' | 'user';
  permissions: string[];
}

export interface IAuthResponse {
  token: string;
  user: IAuthUserPayload;
}

export interface IUser {
  id: number;
  username: string;
  password: string;
  phone: string;
  role: 'admin' | 'user';
}

export interface IPermissionItem {
  code: string;
  name: string;
  group_name: string;
}

export interface IUserPermissionInfo {
  user_id: number;
  username: string;
  role: 'admin' | 'user';
  permissions: string[];
}

export const api = {
  register: (body: { username: string; password: string; phone: string }) =>
    request<IAuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { username: string; password: string }) =>
    request<IAuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  listUsers: () => request<{ users: IUser[] }>('/users'),
  createUser: (body: { username: string; password: string; phone: string }) =>
    request<IUser>('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: number, body: { username: string; password: string; phone: string }) =>
    request<IUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id: number) =>
    request<{ message: string; id: number }>(`/users/${id}`, { method: 'DELETE' }),
  listPermissions: () =>
    request<{ permissions: IPermissionItem[]; mine: string[]; role: string }>('/permissions'),
  getUserPermissions: (id: number) =>
    request<IUserPermissionInfo>(`/users/${id}/permissions`),
  setUserPermissions: (id: number, permissions: string[]) =>
    request<{ user_id: number; permissions: string[]; message: string }>(
      `/users/${id}/permissions`,
      { method: 'PUT', body: JSON.stringify({ permissions }) },
    ),
};
