// EXPORTS: ProtectedRoute
import { Navigate, Outlet } from 'react-router-dom';
import { auth } from '@/lib/auth';

/** 受保护路由：未登录一律重定向到登录页。 */
export default function ProtectedRoute() {
  if (!auth.getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
