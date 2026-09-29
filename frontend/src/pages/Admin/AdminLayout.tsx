// EXPORTS: AdminLayout
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permission';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/admin/users', label: '用户管理', icon: Users, permission: 'user:view' },
  { to: '/admin/permissions', label: '权限管理', icon: ShieldCheck, permission: 'permission:view' },
];

export default function AdminLayout() {
  const user = auth.getUser();
  const navigate = useNavigate();
  const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  function handleLogout() {
    auth.clear();
    toast.success('已退出登录');
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LayoutDashboard className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">测试后台</p>
            <p className="text-xs text-muted-foreground">管理系统</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            退出登录
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
          <h1 className="text-base font-semibold">后台管理</h1>
          <div className="flex items-center gap-2.5">
            <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
              {user?.role === 'admin' ? '超级管理员' : '普通用户'}
            </Badge>
            <UserAvatar name={user?.username ?? ''} />
            <span className="text-sm font-medium">{user?.username ?? '未知用户'}</span>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
