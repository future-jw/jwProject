// EXPORTS: hasPermission
import { auth } from '@/lib/auth';

/** 按钮/页面级权限判断：超级管理员拥有全部权限，普通用户按授予的权限码判断。 */
export function hasPermission(code: string): boolean {
  const user = auth.getUser();
  if (!user) return false;
  if (user.role === 'admin') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(code);
}
